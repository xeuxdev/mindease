import type { Route } from "./+types/home";
import { AppSidebar } from "~/components/sidebar/app-sidebar";
import { ChatInterface } from "~/components/chat-interface";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "MindEase" },
    { name: "description", content: "Welcome to MindEase!" },
  ];
}

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-[calc(100vh-24px)]">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">AI Assistant</h1>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
