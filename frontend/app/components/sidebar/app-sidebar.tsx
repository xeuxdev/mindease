import * as React from "react";
import {
  MessageSquare,
  Plus,
  Search,
  Settings,
  Trash2,
  Edit3,
} from "lucide-react";

import { NavUser } from "~/components/sidebar/nav-user";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "~/components/ui/sidebar";

const conversations = [
  {
    id: "1",
    title: "React Best Practices",
    timestamp: "2 hours ago",
    preview: "What are the best practices for React development?",
  },
  {
    id: "2",
    title: "TypeScript Integration",
    timestamp: "1 day ago",
    preview: "How to integrate TypeScript with Next.js?",
  },
  {
    id: "3",
    title: "Database Design",
    timestamp: "2 days ago",
    preview: "Help me design a database schema for an e-commerce app",
  },
  {
    id: "4",
    title: "API Development",
    timestamp: "3 days ago",
    preview: "Best practices for REST API development",
  },
  {
    id: "5",
    title: "Authentication Setup",
    timestamp: "1 week ago",
    preview: "How to implement authentication in Next.js?",
  },
  {
    id: "6",
    title: "Performance Optimization",
    timestamp: "1 week ago",
    preview: "Tips for optimizing React app performance",
  },
];

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/placeholder.svg?height=32&width=32",
  },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeConversation, setActiveConversation] = React.useState("1");

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <Button className="flex-1 justify-start gap-2" size="sm">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredConversations.map((conversation) => (
                <SidebarMenuItem key={conversation.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeConversation === conversation.id}
                    className="flex flex-col items-start gap-1 p-3 h-auto group"
                    onClick={() => setActiveConversation(conversation.id)}
                  >
                    <div className="w-full cursor-pointer">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <span className="font-medium truncate text-sm">
                            {conversation.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 pl-6">
                        {conversation.timestamp}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 pl-6 truncate">
                        {conversation.preview}
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
