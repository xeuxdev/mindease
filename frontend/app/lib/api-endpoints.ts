export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    VALIDATE_TOKEN: "/auth/validate",
    ANON_LOGIN: "/auth/anonymous",
    LOGOUT_ALL: "/auth/logout/all-devices",
  },
  USER: {
    PROFILE: "/users/profile",
    STATS: "/users/stats",
    DELETE: "/users/account",
  },
  CONVERSATIONS: {
    GET_ALL: (page: number, limit?: number) =>
      `/conversations?page=${page}${limit ? `&limit=${limit}` : ""}`,
    GET_BY_ID: (id: string) => `/conversations/${id}`,
    DELETE: (id: string) => `/conversations/${id}`,
    UPDATE_TITLE: (id: string) => `/conversations/${id}`,
    START: "/conversations",
  },

  HEALTH: {
    BASE: "/health",
    DETAILED: "/health/detailed",
  },
};
