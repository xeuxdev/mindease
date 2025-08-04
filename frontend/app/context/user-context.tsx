import React, {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useWhoAmI } from "~/api/user";
import type { User } from "~/api/types";

interface UserContextTypes {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextTypes>({
  user: null,
  setUser: () => null,
  isLoading: false,
});

const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [User, setUser] = useState<User | null>(null);

  const { data, isLoading } = useWhoAmI();

  const userData = useMemo(() => {
    if (!data?.data.user) return null;

    return {
      ...data.data.user,
    };
  }, [data]);

  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);

  return (
    <UserContext.Provider value={{ user: User, setUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserProvider;
