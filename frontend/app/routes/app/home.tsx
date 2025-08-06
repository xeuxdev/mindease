import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "MindEase" },
    { name: "description", content: "Welcome to MindEase!" },
  ];
}

export default function Home() {
  return <div>Home</div>;
}
