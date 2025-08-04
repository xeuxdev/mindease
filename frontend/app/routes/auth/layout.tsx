import { GalleryVerticalEnd } from "lucide-react";
import { Navigate, Outlet } from "react-router";
import { AuthLoading } from "~/components/ui/loaders";
import { useUser } from "~/context/user-context";

export default function AuthLayout() {
  const { user, isLoading } = useUser();

  console.log(user, isLoading);

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!isLoading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          MindEase
        </a>
        <Outlet />
      </div>
    </div>
  );
}
