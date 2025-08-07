import { useMutation, useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "~/lib/api-endpoints";
import { deleteRequest, getRequest, patchRequest } from "~/lib/http";
import type {
  ConversationsResponse,
  DeleteConversationResponse,
  EditConversationPayload,
  EditConversationResponse,
  GetConversationResponse,
} from "./types";
import { displayErrorMessage, showSuccessToast } from "~/lib/utils";
import { useNavigate } from "react-router";

export function useGetConversations(page: number, limit?: number) {
  return useQuery({
    queryKey: ["conversations", page, limit],
    queryFn: () =>
      getRequest<ConversationsResponse>({
        url: API_ENDPOINTS.CONVERSATIONS.GET_ALL(page, limit),
      }),
  });
}

export function useGetConversationById(id: string) {
  return useQuery({
    queryKey: ["conversation", id],
    queryFn: () =>
      getRequest<GetConversationResponse>({
        url: API_ENDPOINTS.CONVERSATIONS.GET_BY_ID(id),
      }),
    enabled: !!id,
  });
}

export function useEditConversationTitle() {
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      patchRequest<EditConversationResponse, EditConversationPayload>({
        url: API_ENDPOINTS.CONVERSATIONS.UPDATE_TITLE(id),
        payload: { title: title },
      }),
    onSuccess({ data }) {
      showSuccessToast(data.message);
    },
  });
}

export function useDeleteConversation() {
  const navigate = useNavigate();

  return useMutation({
    mutationKey: ["deleteConversation"],
    mutationFn: (id: string) =>
      deleteRequest<DeleteConversationResponse>({
        url: API_ENDPOINTS.CONVERSATIONS.DELETE(id),
      }),

    onSuccess(data) {
      showSuccessToast(data.message);

      navigate("/", { replace: true });
    },

    onError(error) {
      displayErrorMessage(error);
    },
  });
}
