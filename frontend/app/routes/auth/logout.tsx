import React, { useEffect } from "react";
import { Navigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_ENDPOINTS } from "~/lib/api-endpoints";
import { postRequest } from "~/lib/http";

export default function LogoutPage() {
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await postRequest({
          url: API_ENDPOINTS.AUTH.LOGOUT,
          payload: {},
        });
      } catch (error) {
        // Continue with logout even if server call fails
        console.warn("Server logout failed, continuing with client logout");
      }
    },
    onSettled: () => {
      // Clear local storage regardless of server response
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      toast.success("Logged out successfully", {
        description: "You have been securely logged out.",
      });
    },
  });

  useEffect(() => {
    logoutMutation.mutate();
  }, []);

  // Show loading state briefly, then redirect
  if (logoutMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Logging out...</p>
        </div>
      </div>
    );
  }

  // Redirect to login after logout
  return <Navigate to="/auth/login" replace />;
}
