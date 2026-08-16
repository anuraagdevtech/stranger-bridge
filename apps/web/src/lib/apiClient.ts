import { ApiClient, type AuthTokens, type TokenStorage } from "@stranger-bridge/shared";

export const ACCESS_TOKEN_KEY = "sb_access_token";
export const REFRESH_TOKEN_KEY = "sb_refresh_token";

// Guarded because this module is imported by both server-rendered and
// client components; `localStorage` only exists in the browser.
const isBrowser = typeof window !== "undefined";

export const tokenStorage: TokenStorage = {
  getAccessToken: () => (isBrowser ? localStorage.getItem(ACCESS_TOKEN_KEY) : null),
  getRefreshToken: () => (isBrowser ? localStorage.getItem(REFRESH_TOKEN_KEY) : null),
  setTokens: (tokens: AuthTokens) => {
    if (!isBrowser) return;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clearTokens: () => {
    if (!isBrowser) return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  tokenStorage,
});
