import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@stranger-bridge/shared";
import { ACCESS_TOKEN_KEY } from "./apiClient";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
let socketToken: string | null = null;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

/**
 * Returns a connected socket for the current access token, reusing the
 * existing connection when the token hasn't changed. Reconnects with a
 * fresh token if it has (e.g. after a refresh-token rotation).
 */
export function getSocket(): AppSocket {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) {
    throw new Error("Cannot open a socket connection: not authenticated");
  }
  if (socket && socketToken === token) return socket;

  socket?.disconnect();
  socket = io(SOCKET_URL, { auth: { token }, autoConnect: true });
  socketToken = token;
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
