import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@stranger-bridge/shared";
import { tokenStorage } from "./apiClient";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
let socketToken: string | null = null;
let connecting: Promise<AppSocket> | null = null;

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

/**
 * Async counterpart to the web client's getSocket(): token storage on
 * mobile (expo-secure-store) is async, so this resolves once a socket for
 * the current access token exists, reusing it when possible.
 */
export async function connectSocket(): Promise<AppSocket> {
  if (connecting) return connecting;
  connecting = (async () => {
    const token = await tokenStorage.getAccessToken();
    if (!token) throw new Error("Cannot open a socket connection: not authenticated");
    if (socket && socketToken === token) return socket;

    socket?.disconnect();
    socket = io(SOCKET_URL, { auth: { token }, autoConnect: true });
    socketToken = token;
    return socket;
  })();
  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

/** Returns the already-connected socket; throws if connectSocket() hasn't run yet. */
export function getSocket(): AppSocket {
  if (!socket) throw new Error("Socket not connected yet — call connectSocket() first");
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
