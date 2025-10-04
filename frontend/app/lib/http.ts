import axios from "axios";
import { logoutUser } from "~/api/auth";
import { getToken } from "./get-token";

export type ErrorData = {
  message: string;
  validationErrors?: string | [string] | [{ description: string }];
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message;

    if (
      (error.response.data.message === "Invalid Authorization" &&
        error.response.status === 400) ||
      error.response.status === 401
    ) {
      logoutUser();
    }
    return Promise.reject(error);
  }
);

export const getRequest = async <T>(params: { url: string }) => {
  const { data } = await api.get<T>(params.url);

  return data;
};

export const postRequest = async <T, P>(params: {
  url: string;
  payload: P;
}) => {
  return await api.post<T>(params.url, params.payload);
};

export const patchRequest = async <T, P>(params: {
  url: string;
  payload: P;
}) => {
  return await api.patch<T>(params.url, params.payload);
};

export const putRequest = async <T, P>(params: { url: string; payload: P }) => {
  const { data } = await api.put<T>(params.url, params.payload);

  return data;
};

export const deleteRequest = async <T>(params: { url: string }) => {
  const { data } = await api.delete<T>(params.url);

  return data;
};

export const uploadRequest = async <T, P>(params: {
  url: string;
  payload: P;
}) => {
  const { data } = await api.post<T>(params.url, params.payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};
