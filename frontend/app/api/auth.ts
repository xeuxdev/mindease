import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import Cookies from "js-cookie";
import { API_ENDPOINTS } from "~/lib/api-endpoints";
import { postRequest } from "~/lib/http";
import { displayErrorMessage, showSuccessToast } from "~/lib/utils";
import { useUser } from "~/context/user-context";
import { cookieNames } from "~/config/site";
import type {
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  RegisterPayload,
  RegisterResponse,
} from "./types";

export function useLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser } = useUser();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await postRequest<LoginResponse, LoginPayload>({
        url: API_ENDPOINTS.AUTH.LOGIN,
        payload,
      });
      return response.data;
    },

    onSuccess(data) {
      // Set the authentication token and user data in cookies
      const expiresDate = new Date(data.data.expiresAt);
      Cookies.set(cookieNames.session_token, data.data.token, {
        expires: expiresDate,
        secure: true,
        sameSite: "strict",
      });
      Cookies.set(cookieNames.hashedId, data.data.user.hashedId, {
        expires: expiresDate,
        secure: true,
        sameSite: "strict",
      });

      setUser(data.data.user);
      queryClient.invalidateQueries({
        queryKey: ["whoami"],
      });
      navigate("/", {
        replace: true,
      });
      showSuccessToast(data.message);
    },

    onError(error) {
      displayErrorMessage(error);
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const response = await postRequest<RegisterResponse, RegisterPayload>({
        url: API_ENDPOINTS.AUTH.REGISTER,
        payload,
      });
      return response.data;
    },

    onSuccess(data) {
      navigate("/auth/login");
      showSuccessToast(data.message);
    },

    onError(error) {
      displayErrorMessage(error);
    },
  });
}

export function useAnonymousLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await postRequest<LoginResponse, {}>({
        url: API_ENDPOINTS.AUTH.ANON_LOGIN,
        payload: {},
      });
      return response.data;
    },

    onSuccess(data) {
      // Set the authentication token and user data in cookies
      const expiresDate = new Date(data.data.expiresAt);
      Cookies.set(cookieNames.session_token, data.data.token, {
        expires: expiresDate,
        secure: true,
        sameSite: "strict",
      });
      Cookies.set(cookieNames.hashedId, data.data.user.hashedId, {
        expires: expiresDate,
        secure: true,
        sameSite: "strict",
      });

      queryClient.invalidateQueries({
        queryKey: ["whoami"],
      });

      navigate("/");
      showSuccessToast(data.message);
    },

    onError(error) {
      displayErrorMessage(error);
    },
  });
}

// Logout function

export const logoutUser = async () => {
  return postRequest<LogoutResponse, any>({
    url: API_ENDPOINTS.AUTH.LOGOUT,
    payload: {},
  });
};

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser } = useUser();

  const { mutate: logoutUser, isPending: isLoggingOut } = useMutation({
    mutationFn: async () => {
      return postRequest<LogoutResponse, any>({
        url: API_ENDPOINTS.AUTH.LOGOUT,
        payload: {},
      });
    },
    onSuccess() {
      // Remove the authentication token and user data from cookies
      Cookies.remove(cookieNames.session_token);
      Cookies.remove(cookieNames.hashedId);

      setUser(null);
      queryClient.invalidateQueries({
        queryKey: ["whoami"],
      });
      showSuccessToast("Logged out successfully");
      navigate("/auth/login", { replace: true });
    },
    onError(error) {
      // Remove the authentication token and user data from cookies on error
      Cookies.remove(cookieNames.session_token);
      Cookies.remove(cookieNames.hashedId);

      setUser(null);
      displayErrorMessage(error);
      navigate("/auth/login", { replace: true });
    },
  });

  return {
    logoutUser,
    isLoggingOut,
  };
}
