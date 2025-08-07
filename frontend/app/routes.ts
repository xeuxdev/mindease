import { type RouteConfig, layout, route } from "@react-router/dev/routes";

export default [
  // App routes (protected)
  layout("routes/app/layout.tsx", [
    route("/", "routes/app/home.tsx"),
    route("/chat", "routes/app/chat.tsx"),
    route("/c/:id", "routes/app/chat/conversation.tsx"),
  ]),

  // Auth routes
  layout("routes/auth/layout.tsx", [
    route("auth/login", "routes/auth/login.tsx"),
    route("auth/register", "routes/auth/register.tsx"),
    route("auth/logout", "routes/auth/logout.tsx"),
  ]),
] satisfies RouteConfig;
