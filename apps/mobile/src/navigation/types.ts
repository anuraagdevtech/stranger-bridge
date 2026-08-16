export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  Main: undefined;
  Chat: {
    roomId: string;
    kind: "match" | "friend";
    peerId: string;
    peerName: string;
    matchSessionId?: string;
  };
};

export type MainTabParamList = {
  Lobby: undefined;
  History: undefined;
  Friends: undefined;
  Settings: undefined;
};
