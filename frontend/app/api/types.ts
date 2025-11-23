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

export type LogoutResponse = {
  success: true;
  message: "Logout successful";
};

export type WhoAmIResponse = {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      isAnonymous: boolean;
      hashedId: string;
      // createdAt: string;
      // updatedAt: string;
    };
  };
};

export type User = WhoAmIResponse["data"]["user"];

export type ConversationsResponse = {
  success: true;
  data: {
    conversations: {
      id: string;
      title: string;
      createdAt: string;
      updatedAt: string;
      messageCount: number;
      lastMessage: {
        content: string;
        timestamp: string;
        role: "ASSISTANT" | "USER";
      };
    }[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
};

export type GetConversationResponse = {
  success: true;
  data: {
    conversation: {
      id: string;
      title: string;
      createdAt: string;
      updatedAt: string;
    };
    messages: {
      id: string;
      content: string;
      role: "ASSISTANT" | "USER";
      timestamp: string;
    }[];
  };
};

export type EditConversationPayload = {
  title: string;
};

export type EditConversationResponse = {
  success: true;
  message: string;
  data: {
    conversation: {
      id: string;
      title: string;
      updatedAt: string;
    };
  };
};

export type DeleteConversationResponse = {
  success: true;
  message: string;
};

export type StartConversationPayload = {
  message: string;
};

export type StartConversationResponse = {
  success: boolean;
  message: string;
  data: {
    conversationId: string;
  };
};

// Crisis Detection Types
export type CrisisSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type CrisisResource = {
  id: string;
  title: string;
  description: string;
  type: string;
  contact?: string;
  available?: string;
  country: string;
  priority: number;
};

export type CrisisDetectionResult = {
  isCrisis: boolean;
  severity?: CrisisSeverity;
  keywords?: string[];
  confidence?: number;
  reason?: string;
  resources?: CrisisResource[];
};

export type CrisisAlertEvent = {
  conversationId: string;
  messageId: string;
  userId: string;
  severity: CrisisSeverity;
  resources: CrisisResource[];
  timestamp: string;
};
