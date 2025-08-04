export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload;

export type LoginResponse = {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      isAnonymous: boolean;
      hashedId: string;
    };
    expiresAt: string;
  };
};

export type RegisterResponse = {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      isAnonymous: boolean;
      hashedId: string;
    };
    expiresAt: string;
  };
};

export type WhoAmIResponse = {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      isAnonymous: boolean;
      hashedId: string;
      createdAt: string;
      updatedAt: string;
    };
  };
};

export type User = WhoAmIResponse["data"]["user"];
