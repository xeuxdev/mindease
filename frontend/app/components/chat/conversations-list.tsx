import {
  Edit3Icon,
  MessageSquareIcon,
  MoreVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import React from "react";
import { useNavigate, useParams } from "react-router";
import {
  useDeleteConversation,
  useEditConversationTitle,
  useGetConversations,
} from "~/api/conversations";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { formatDateTime } from "~/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";

export function ConversationsList({ searchQuery }: { searchQuery: string }) {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();

  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState("");
  const [conversationToEdit, setConversationToEdit] = React.useState<
    string | null
  >(null);
  const [conversationToDelete, setConversationToDelete] = React.useState<
    string | null
  >(null);

  const { data: conversations, isLoading, isError } = useGetConversations();
  const editConversationMutation = useEditConversationTitle();
  const deleteConversationMutation = useDeleteConversation();

  const handleEditStart = (conversation: any) => {
    setConversationToEdit(conversation.id);
    setEditTitle(conversation.title);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (editTitle.trim() && conversationToEdit) {
      await editConversationMutation.mutateAsync({
        id: conversationToEdit,
        title: editTitle.trim(),
      });
      setEditDialogOpen(false);
      setConversationToEdit(null);
      setEditTitle("");
    }
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setConversationToEdit(null);
    setEditTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  const handleDeleteClick = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (conversationToDelete) {
      await deleteConversationMutation.mutateAsync(conversationToDelete);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);

      // Navigate away if we deleted the currently active conversation
      if (conversationId === conversationToDelete) {
        navigate("/");
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const filteredConversations = conversations?.pages
    .flatMap((page) => page.data.conversations)
    .filter(
      (conv) =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.content
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    );

  // Show loading skeleton while data is loading
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <SidebarMenuItem key={index}>
            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
              <Skeleton className="h-3 w-20 ml-6" />
              <Skeleton className="h-3 w-32 ml-6" />
            </div>
          </SidebarMenuItem>
        ))}
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="p-3 text-center text-sm text-muted-foreground">
        Failed to load conversations
      </div>
    );
  }

  // Show empty state
  if (!filteredConversations || filteredConversations.length === 0) {
    return (
      <div className="p-3 text-center text-sm text-muted-foreground">
        {searchQuery ? "No conversations found" : "No conversations yet"}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filteredConversations.map((conversation) => (
        <SidebarMenuItem key={conversation.id}>
          <div className="relative group">
            <SidebarMenuButton
              className={`w-full h-auto p-0 hover:bg-sidebar-accent/50 transition-colors ${
                conversationId === conversation.id ? "bg-sidebar-accent" : ""
              }`}
              onClick={() => navigate(`/c/${conversation.id}`)}
              isActive={conversationId === conversation.id}
              asChild
            >
              <div className="w-full cursor-pointer p-3 flex flex-col items-start gap-1">
                <div className="flex items-center justify-between w-full min-h-[20px]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquareIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium truncate text-sm leading-5">
                      {conversation.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex items-center justify-center h-6 w-6 rounded hover:bg-sidebar-accent-foreground/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <MoreVerticalIcon className="h-3 w-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-32"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStart(conversation);
                          }}
                        >
                          <Edit3Icon className="h-3 w-3 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(conversation.id);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2Icon className="h-3 w-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pl-6 w-full">
                  <div className="truncate">
                    {formatDateTime(conversation.updatedAt)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pl-6 w-full">
                  <div className="truncate line-clamp-1">
                    {conversation.lastMessage.content}
                  </div>
                </div>
              </div>
            </SidebarMenuButton>
          </div>
        </SidebarMenuItem>
      ))}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Conversation Title</DialogTitle>
            <DialogDescription>
              Change the title of this conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter conversation title"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editConversationMutation.isPending || !editTitle.trim()}
            >
              {editConversationMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteConversationMutation.isPending}
            >
              {deleteConversationMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
