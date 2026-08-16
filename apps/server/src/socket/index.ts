import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@stranger-bridge/shared";
import { matchFiltersSchema, sendMessageSchema } from "@stranger-bridge/shared";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { toPublicUser } from "../lib/serialize";
import { MatchmakingQueue, type QueueEntry } from "./matchmakingQueue";

interface SocketData {
  userId: string;
  activeRoomId?: string; // the match room this socket is currently in, if any
}

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

const queue = new MatchmakingQueue();
const onlineSockets = new Map<string, Set<string>>(); // userId -> socketIds

export function registerSocketHandlers(io: AppServer) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing auth token"));
    try {
      socket.data.userId = verifyAccessToken(token).sub;
      next();
    } catch {
      next(new Error("Invalid or expired auth token"));
    }
  });

  io.on("connection", (socket: AppSocket) => {
    const userId = socket.data.userId;
    markOnline(io, userId, socket.id);

    socket.on("matchmaking:find", (rawFilters) => handleFindMatch(io, socket, rawFilters));
    socket.on("matchmaking:cancel", () => queue.remove(userId));

    socket.on("room:join", ({ roomId }) => {
      socket.join(roomId);
      socket.data.activeRoomId = roomId;
    });

    socket.on("chat:send", async (payload) => {
      const parsed = sendMessageSchema.safeParse(payload);
      if (!parsed.success) return;
      const { roomId, body } = parsed.data;

      const matchSession = await prisma.matchSession.findUnique({ where: { id: roomId } });
      const message = await prisma.message.create({
        data: {
          roomId,
          matchSessionId: matchSession ? matchSession.id : undefined,
          senderId: userId,
          body,
        },
      });
      io.to(roomId).emit("chat:message", {
        id: message.id,
        roomId: message.roomId,
        senderId: message.senderId,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      });
    });

    socket.on("chat:typing", ({ roomId, isTyping }) => {
      socket.to(roomId).emit("chat:typing", { roomId, userId, isTyping });
    });

    socket.on("match:leave", async ({ roomId }) => {
      await endMatchSession(io, roomId, userId, "LEFT");
    });

    // WebRTC signaling is a dumb relay: server never inspects SDP/ICE, it
    // just forwards to the other participant(s) in the room.
    socket.on("call:offer", (signal) => socket.to(signal.roomId).emit("call:offer", signal));
    socket.on("call:answer", (signal) => socket.to(signal.roomId).emit("call:answer", signal));
    socket.on("call:ice-candidate", (signal) =>
      socket.to(signal.roomId).emit("call:ice-candidate", signal),
    );
    socket.on("call:end", ({ roomId }) => {
      socket.to(roomId).emit("call:end", { roomId, fromUserId: userId });
    });

    socket.on("disconnect", async () => {
      queue.remove(userId);
      markOffline(io, userId, socket.id);
      if (socket.data.activeRoomId) {
        await endMatchSession(io, socket.data.activeRoomId, userId, "DISCONNECTED");
      }
    });
  });
}

function markOnline(io: AppServer, userId: string, socketId: string) {
  const set = onlineSockets.get(userId) ?? new Set<string>();
  const wasOffline = set.size === 0;
  set.add(socketId);
  onlineSockets.set(userId, set);
  if (wasOffline) io.emit("presence:update", { userId, online: true });
}

function markOffline(io: AppServer, userId: string, socketId: string) {
  const set = onlineSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) {
    onlineSockets.delete(userId);
    io.emit("presence:update", { userId, online: false });
  }
}

async function handleFindMatch(io: AppServer, socket: AppSocket, rawFilters: unknown) {
  const userId = socket.data.userId;
  const parsedFilters = matchFiltersSchema.safeParse(rawFilters ?? {});
  const filters = parsedFilters.success ? parsedFilters.data : {};

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const candidate: QueueEntry = {
    userId,
    socketId: socket.id,
    gender: user.gender,
    region: user.region,
    interests: user.interests,
    filters,
    joinedAt: Date.now(),
  };

  const other = await findMatchAsync(candidate);

  if (!other) {
    queue.add(candidate);
    socket.emit("matchmaking:searching");
    return;
  }

  queue.remove(other.userId);
  queue.remove(userId);

  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.user.findUnique({ where: { id: other.userId } }),
  ]);
  if (!userA || !userB) return;

  const session = await prisma.matchSession.create({
    data: { userAId: userA.id, userBId: userB.id },
  });

  const roomId = session.id;
  socket.join(roomId);
  socket.data.activeRoomId = roomId;
  const otherSocket = io.sockets.sockets.get(other.socketId);
  if (otherSocket) {
    otherSocket.join(roomId);
    (otherSocket.data as SocketData).activeRoomId = roomId;
  }

  socket.emit("matchmaking:found", {
    matchSessionId: session.id,
    roomId,
    peer: toPublicUser(userB),
  });
  io.to(other.socketId).emit("matchmaking:found", {
    matchSessionId: session.id,
    roomId,
    peer: toPublicUser(userA),
  });
}

/** Re-checks the queue against the DB block list before pairing. */
async function findMatchAsync(candidate: QueueEntry): Promise<QueueEntry | null> {
  const blocked = await prisma.block.findMany({
    where: { OR: [{ blockerId: candidate.userId }, { blockedId: candidate.userId }] },
  });
  const blockedIds = new Set(
    blocked.flatMap((b) => [b.blockerId, b.blockedId]).filter((id) => id !== candidate.userId),
  );
  return queue.findMatch(candidate, (a, b) => blockedIds.has(a) || blockedIds.has(b));
}

async function endMatchSession(
  io: AppServer,
  roomId: string,
  byUserId: string,
  reason: "LEFT" | "DISCONNECTED",
) {
  const session = await prisma.matchSession.findUnique({ where: { id: roomId } });
  if (!session || session.endedAt) return;

  await prisma.matchSession.update({
    where: { id: roomId },
    data: { endedAt: new Date(), endedReason: reason, endedByUserId: byUserId },
  });
  io.to(roomId).emit("match:ended", { roomId, reason, byUserId });
}
