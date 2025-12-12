import { Plus, Search, XIcon } from "lucide-react";
import * as React from "react";

import { Link } from "react-router";
import { NavUser } from "~/components/sidebar/nav-user";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "~/components/ui/sidebar";
import { ConversationsList } from "../chat/conversations-list";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-5">
            <h2 className="text-lg font-semibold text-sidebar-foreground">
              MindEase
            </h2>

            <Button
              variant={"outline"}
              size={"sm"}
              className="md:hidden"
              onClick={toggleSidebar}
            >
              <XIcon />
            </Button>
          </div>

          <Button variant={"ghost"} className="w-full justify-start" asChild>
            <Link to={"/"}>
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Link>
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 pr-0">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground">
            Recent Conversations
          </SidebarGroupLabel>
          <SidebarMenu className="mt-2">
            <ConversationsList searchQuery={searchQuery} />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
