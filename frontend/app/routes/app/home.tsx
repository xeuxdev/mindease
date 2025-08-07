import { ChatInterface } from "~/components/chat-interface";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "MindEase" },
    { name: "description", content: "Welcome to MindEase!" },
  ];
}

export default function Home() {
  // should just start a new conversation and redirect to the  convo page
  return <ChatInterface />;
}
