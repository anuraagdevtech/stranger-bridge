import type {
  AuthTokens,
  Friendship,
  Me,
  MatchHistoryEntry,
  PublicUser,
} from "./types";
import type {
  FriendRequestInput,
  LoginInput,
  OnboardingInput,
  RegisterInput,
  ReportInput,
} from "./schemas";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Storage is left to the caller so this client works unmodified on web
// (localStorage) and mobile (expo-secure-store / AsyncStorage).
export interface TokenStorage {
  getAccessToken(): Promise<string | null> | string | null;
  getRefreshToken(): Promise<string | null> | string | null;
  setTokens(tokens: AuthTokens): Promise<void> | void;
  clearTokens(): Promise<void> | void;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokenStorage: TokenStorage;
}

export class ApiClient {
  constructor(private opts: ApiClientOptions) {}

  private async request<T>(
    path: string,
    init: RequestInit = {},
    opts: { auth?: boolean; retry?: boolean } = {},
  ): Promise<T> {
    const { auth = true, retry = true } = opts;
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");

    if (auth) {
      const token = await this.opts.tokenStorage.getAccessToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (res.status === 401 && auth && retry) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        return this.request<T>(path, init, { auth, retry: false });
      }
      await this.opts.tokenStorage.clearTokens();
    }

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        // no JSON body
      }
      const message =
        (body as { message?: string } | undefined)?.message ??
        `Request failed with status ${res.status}`;
      throw new ApiError(message, res.status, body);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = await this.opts.tokenStorage.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${this.opts.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const tokens = (await res.json()) as AuthTokens;
      await this.opts.tokenStorage.setTokens(tokens);
      return true;
    } catch {
      return false;
    }
  }

  // --- Auth ---
  async register(input: RegisterInput) {
    const result = await this.request<{ user: Me; tokens: AuthTokens }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify(input) },
      { auth: false },
    );
    await this.opts.tokenStorage.setTokens(result.tokens);
    return result.user;
  }

  async login(input: LoginInput) {
    const result = await this.request<{ user: Me; tokens: AuthTokens }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(input) },
      { auth: false },
    );
    await this.opts.tokenStorage.setTokens(result.tokens);
    return result.user;
  }

  async logout() {
    const refreshToken = await this.opts.tokenStorage.getRefreshToken();
    await this.request(
      "/auth/logout",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
      { auth: false },
    ).catch(() => undefined);
    await this.opts.tokenStorage.clearTokens();
  }

  // --- Profile / onboarding ---
  getMe() {
    return this.request<Me>("/users/me");
  }

  completeOnboarding(input: OnboardingInput) {
    return this.request<Me>("/users/me/onboarding", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  updateProfile(input: Partial<Pick<Me, "displayName" | "gender" | "region" | "interests" | "avatarUrl">>) {
    return this.request<Me>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  // --- Friends ---
  listFriends() {
    return this.request<Friendship[]>("/friends");
  }

  sendFriendRequest(input: FriendRequestInput) {
    return this.request<Friendship>("/friends/requests", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  respondFriendRequest(friendshipId: string, action: "accept" | "decline") {
    return this.request<Friendship>(`/friends/requests/${friendshipId}/${action}`, {
      method: "POST",
    });
  }

  removeFriend(friendshipId: string) {
    return this.request<void>(`/friends/${friendshipId}`, { method: "DELETE" });
  }

  // --- History ---
  listHistory() {
    return this.request<MatchHistoryEntry[]>("/history");
  }

  // --- Safety ---
  createReport(input: ReportInput) {
    return this.request<void>("/reports", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  blockUser(blockedId: string) {
    return this.request<void>("/blocks", {
      method: "POST",
      body: JSON.stringify({ blockedId }),
    });
  }

  listBlocks() {
    return this.request<PublicUser[]>("/blocks");
  }

  unblockUser(blockedId: string) {
    return this.request<void>(`/blocks/${blockedId}`, { method: "DELETE" });
  }
}
