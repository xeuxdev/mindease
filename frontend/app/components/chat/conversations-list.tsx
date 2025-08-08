import {
  Edit3Icon,
  MessageSquareIcon,
  MoreVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import React from "react";
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
import { formatDateTime } from "~/lib/utils";
import { SidebarMenuItem } from "../ui/sidebar";
import { Link, useParams } from "react-router";

export function ConversationsList({ searchQuery }: { searchQuery: string }) {
  const { id } = useParams();

  const [activeConversation, setActiveConversation] = React.useState(
    id || null
  );
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState("");
  const [conversationToEdit, setConversationToEdit] = React.useState<
    string | null
  >(null);
  const [conversationToDelete, setConversationToDelete] = React.useState<
    string | null
  >(null);

  const { data: conversations } = useGetConversations();
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

  return (
    <div className="space-y-2">
      {filteredConversations?.map((conversation) => (
        <SidebarMenuItem key={conversation.id}>
          <Link
            to={`/c/${conversation.id}`}
            className={`flex flex-col items-start gap-1 p-3 h-auto group overflow-hidden ${
              activeConversation === conversation.id ? "bg-white" : ""
            }`}
            onClick={() => setActiveConversation(conversation.id)}
          >
            <div className="w-full cursor-pointer">
              <div className="flex items-center justify-between w-full ">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquareIcon className="h-4 w-4 shrink-0" />
                  <span className="font-medium truncate text-sm">
                    {conversation.title}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <MoreVerticalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => handleEditStart(conversation)}
                      >
                        <Edit3Icon className="h-3 w-3" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(conversation.id)}
                        className="text-destructive"
                      >
                        <Trash2Icon className="h-3 w-3 text-destructive" />{" "}
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1 pl-6">
                {formatDateTime(conversation.updatedAt)}
              </div>
              <div className="text-xs text-muted-foreground mt-1 pl-6 truncate text-ellipsis">
                {conversation.lastMessage.content}
              </div>
            </div>
          </Link>
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
