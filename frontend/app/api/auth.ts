import { useMutation } from "@tanstack/react-query";
import { API_ENDPOINTS } from "~/lib/api-endpoints";
import { postRequest } from "~/lib/http";
import { displayErrorMessage, showSuccessToast } from "~/lib/utils";
import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
} from "./types";
import { useNavigate } from "react-router";

export function useLogin() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await postRequest<LoginResponse, LoginPayload>({
        url: API_ENDPOINTS.AUTH.LOGIN,
        payload,
      });
      return response.data;
    },

    onSuccess(data) {
      navigate("/");
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

  return useMutation({
    mutationFn: async () => {
      const response = await postRequest<LoginResponse, {}>({
        url: API_ENDPOINTS.AUTH.ANON_LOGIN,
        payload: {},
      });
      return response.data;
    },

    onSuccess(data) {
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
  await postRequest({
    url: API_ENDPOINTS.AUTH.LOGOUT,
    payload: {},
  });
};

export function useLogout() {
  const { mutateAsync: logoutUser, isPending: isLoggingOut } = useMutation({
    mutationFn: async () => {
      return postRequest({
        url: API_ENDPOINTS.AUTH.LOGOUT,
        payload: {},
      });
    },
  });

  return {
    logoutUser,
    isLoggingOut,
  };
}
