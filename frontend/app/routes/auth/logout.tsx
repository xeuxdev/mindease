import { redirect } from "react-router";
import { logoutUser } from "~/api/auth";
import type { Route } from "./+types/logout";
import { postRequest } from "~/lib/http";
import type { LogoutResponse } from "~/api/types";
import { API_ENDPOINTS } from "~/lib/api-endpoints";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const cookie = Object.fromEntries(
    cookieHeader?.split("; ").map((c) => c.split("=")) || []
  );

  // if (cookie[cookieNames.session_token] && cookie[cookieNames.hashedId]) {
  //   return redirect("/");
  // }

  console.log(cookie);

  console.log("logout request received");

  // await logoutUser().then(() => {
  //   return redirect("/");
  // });

  await fetch(`${import.meta.env.API_URL}${API_ENDPOINTS.AUTH.LOGOUT}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  console.log("skipped");
}

export default function LogoutPage() {
  // const { logoutUser, isLoggingOut } = useLogout();

  // useEffect(() => {
  //   logoutUser();
  // }, [logoutUser]);

  // Show loading state briefly, then redirect
  // if (isLoggingOut) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Logging out...</p>
      </div>
    </div>
  );
  // }

  // The useLogout hook handles navigation automatically
  // return null;
}
