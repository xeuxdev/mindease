import { Outlet, redirect } from "react-router";
import { cookieNames } from "~/config/site";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const cookie = Object.fromEntries(
    cookieHeader?.split("; ").map((c) => c.split("=")) || []
  );

  if (!cookie[cookieNames.session_token] || !cookie[cookieNames.hashedId]) {
    return redirect("/auth/login");
  }
}

export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
}
