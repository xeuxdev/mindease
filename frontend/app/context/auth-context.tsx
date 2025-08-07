import React, { useLayoutEffect } from "react";
import { useUser } from "./user-context";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const { user, isLoading: userLoading } = useUser();

  useLayoutEffect(() => {
    if (user && !userLoading) {
      setIsAuthenticated(true);
    } else if (!userLoading) {
      setIsAuthenticated(false);
    }
    setIsLoading(userLoading);
  }, [user, userLoading]);

  return { isAuthenticated, isLoading };
}
