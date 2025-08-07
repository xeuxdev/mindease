import React, {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "~/api/types";
import { useWhoAmI } from "~/api/user";

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
  const { data, isLoading, error } = useWhoAmI();

  useEffect(() => {
    if (data?.data.user) {
      setUser(data?.data.user);
    }
  }, [data, error]);

  return (
    <UserContext.Provider value={{ user: User, setUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserProvider;
