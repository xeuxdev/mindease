import Cookies from "js-cookie";
import { cookieNames } from "~/config/site";

export function getToken() {
  if (typeof window !== "undefined") {
    return Cookies.get(cookieNames.session_token);
  }
  return null;
}
