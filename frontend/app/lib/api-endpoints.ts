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

  HEALTH: {
    BASE: "/health",
    DETAILED: "/health/detailed",
  },
};
