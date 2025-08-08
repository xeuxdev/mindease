import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { API_ENDPOINTS } from "~/lib/api-endpoints";
import {
  deleteRequest,
  getRequest,
  patchRequest,
  postRequest,
} from "~/lib/http";
import type {
  ConversationsResponse,
  DeleteConversationResponse,
  EditConversationPayload,
  EditConversationResponse,
  GetConversationResponse,
  StartConversationPayload,
  StartConversationResponse,
} from "./types";
import { displayErrorMessage, showSuccessToast } from "~/lib/utils";
import { useNavigate } from "react-router";

export function useGetConversations(limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ["conversations", limit],
    queryFn: ({ pageParam = 1 }) =>
      getRequest<ConversationsResponse>({
        url: API_ENDPOINTS.CONVERSATIONS.GET_ALL(pageParam, limit),
      }),
    getNextPageParam: (lastPage) => {
      const {
        data: { pagination },
      } = lastPage;
      return pagination.page < pagination.pages
        ? pagination.page + 1
        : undefined;
    },
    initialPageParam: 1,
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

export function useStartConversation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["startConversation"],
    mutationFn: (payload: StartConversationPayload) =>
      postRequest<StartConversationResponse, StartConversationPayload>({
        url: API_ENDPOINTS.CONVERSATIONS.START,
        payload,
      }),

    onSuccess({ data }) {
      showSuccessToast(data.message);

      queryClient.invalidateQueries({
        queryKey: ["conversations", 20],
      });

      navigate(`/c/${data.data.conversationId}`);
    },

    onError(error) {
      displayErrorMessage(error);
    },
  });
}

export function useEditConversationTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      patchRequest<EditConversationResponse, EditConversationPayload>({
        url: API_ENDPOINTS.CONVERSATIONS.UPDATE_TITLE(id),
        payload: { title: title },
      }),

    onSuccess({ data }) {
      showSuccessToast(data.message);

      queryClient.invalidateQueries({
        queryKey: ["conversations", 20],
      });
    },
    mutationKey: ["edit-conversation"],
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  const navigate = useNavigate();

  return useMutation({
    mutationKey: ["deleteConversation"],
    mutationFn: (id: string) =>
      deleteRequest<DeleteConversationResponse>({
        url: API_ENDPOINTS.CONVERSATIONS.DELETE(id),
      }),

    onSuccess(data) {
      showSuccessToast(data.message);

      queryClient.invalidateQueries({
        queryKey: ["conversations", 20],
      });

      navigate("/", { replace: true });
    },

    onError(error) {
      displayErrorMessage(error);
    },
  });
}
