import type {
  ChatMessage,
  MatchFilters,
  MatchFoundPayload,
} from "./types";

// Single source of truth for socket.io event names + payload shapes, used to
// type both the server's `Server<ClientToServerEvents, ServerToClientEvents>`
// and the web/mobile `io<ServerToClientEvents, ClientToServerEvents>()` clients.

export interface WebRtcSignal {
  roomId: string;
  toUserId: string;
  fromUserId: string;
  data: unknown; // RTCSessionDescriptionInit | RTCIceCandidateInit
}

export interface ClientToServerEvents {
  "matchmaking:find": (filters: MatchFilters) => void;
  "matchmaking:cancel": () => void;
  "match:leave": (payload: { roomId: string }) => void;

  "room:join": (payload: { roomId: string }) => void; // used for friend-initiated chats/calls
  "chat:send": (payload: { roomId: string; body: string }) => void;
  "chat:typing": (payload: { roomId: string; isTyping: boolean }) => void;

  "call:offer": (signal: WebRtcSignal) => void;
  "call:answer": (signal: WebRtcSignal) => void;
  "call:ice-candidate": (signal: WebRtcSignal) => void;
  "call:end": (payload: { roomId: string; toUserId: string }) => void;
}

export interface ServerToClientEvents {
  "matchmaking:searching": () => void;
  "matchmaking:found": (payload: MatchFoundPayload) => void;
  "matchmaking:error": (payload: { message: string }) => void;

  "match:ended": (payload: {
    roomId: string;
    reason: string;
    byUserId: string;
  }) => void;

  "chat:message": (message: ChatMessage) => void;
  "chat:typing": (payload: { roomId: string; userId: string; isTyping: boolean }) => void;

  "call:offer": (signal: WebRtcSignal) => void;
  "call:answer": (signal: WebRtcSignal) => void;
  "call:ice-candidate": (signal: WebRtcSignal) => void;
  "call:end": (payload: { roomId: string; fromUserId: string }) => void;

  "presence:update": (payload: { userId: string; online: boolean }) => void;
}
