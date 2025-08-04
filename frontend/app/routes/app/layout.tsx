import { Navigate, Outlet } from "react-router";
import { AuthLoading } from "~/components/ui/loaders";
import { useUser } from "~/context/user-context";

export default function AppLayout() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!isLoading && !user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Outlet />
      </div>
    </>
  );
}
