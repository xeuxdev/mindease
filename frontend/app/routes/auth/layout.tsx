import { GalleryVerticalEnd } from "lucide-react";
import { Outlet, redirect } from "react-router";
import { cookieNames } from "~/config/site";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const cookie = Object.fromEntries(
    cookieHeader?.split("; ").map((c) => c.split("=")) || []
  );

  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/auth/logout") {
    return null;
  }

  if (cookie[cookieNames.session_token] && cookie[cookieNames.hashedId]) {
    return redirect("/");
  }
}

export default function AuthLayout() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          MindEase
        </a>
        <Outlet />
      </div>
    </div>
  );
}
