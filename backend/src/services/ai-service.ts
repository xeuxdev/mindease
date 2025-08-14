import axios from "axios";
import { logger } from "../utils/logger";
import { prisma } from "../config/database";
import { aiConfig } from "../config/env";

interface AIResponse {
  content: string;
  tokens: number;
  cost: number;
  responseTime: number;
  model: string;
}

interface AiAPIResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: [
    {
      index: number;
      logprobs: null;
      finish_reason: "stop" | "length";
      message: {
        role: "assistant";
        content: `"<think>\n\n</think>\n\n${string}`;
      };
    }
  ];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  stats: {};
  system_fingerprint: "qwen/qwen3-4b";
}

interface Message {
  id: string;
  content: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  timestamp: Date;
}

class AIService {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor() {
    this.apiKey = aiConfig.llmApiKey;
    this.model = aiConfig.model;
    this.baseURL = aiConfig.llmApiUrl;
  }

  async generateResponse(
    userMessage: string,
    conversationHistory: Message[] = []
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Build conversation context
      const messages = this.buildMessageContext(
        userMessage,
        conversationHistory
      );

      // Make API call to LLM
      const response = await axios.post<AiAPIResponse>(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          max_tokens: 500,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      const responseTime = Date.now() - startTime;

      let content =
        response.data.choices[0]?.message?.content
          // Remove complete think blocks
          ?.replace(/<think>[\s\S]*?<\/think>/g, "")
          // Remove unclosed think tags and everything after them
          ?.replace(/<think>[\s\S]*$/g, "")
          // Remove any remaining think closing tags
          ?.replace(/<\/think>/g, "")
          // Remove leading newlines
          ?.replace(/^\s*\n+/, "")
          ?.trim() ||
        "I apologize, but I couldn't generate a response. Please try again.";

      const tokens = response.data.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokens);

      logger.info("AI response generated", {
        model: this.model,
        tokens,
        cost,
        responseTime,
        messageLength: userMessage.length,
      });

      return {
        content,
        tokens,
        cost,
        responseTime,
        model: this.model,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error("AI response generation failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime,
        model: this.model,
      });

      // Return fallback response
      return {
        content:
          "I apologize, but I'm experiencing some technical difficulties right now. Please try again in a moment, or feel free to continue sharing what's on your mind.",
        tokens: 0,
        cost: 0,
        responseTime,
        model: this.model,
      };
    }
  }

  async streamResponse(
    userMessage: string,
    conversationId: string | undefined,
    userId: string,
    onChunk: (chunk: any) => void
  ): Promise<void> {
    try {
      // Get conversation history if conversationId provided
      let conversationHistory: Message[] = [];

      if (conversationId) {
        const conversation = await prisma.conversation.findFirst({
          where: { id: conversationId, userId },
          include: {
            messages: {
              orderBy: { timestamp: "asc" },
              take: 10,
            },
          },
        });

        if (conversation) {
          conversationHistory = conversation.messages;
        }
      }

      // Build message context
      const messages = this.buildMessageContext(
        userMessage,
        conversationHistory
      );

      // Stream response from OpenAI
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          max_tokens: 500,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          responseType: "stream",
        }
      );

      let fullContent = "";
      let lastSentLength = 0;

      response.data.on("data", (chunk: Buffer) => {
        const chunkStr = chunk.toString();
        const lines = chunkStr.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            // if (data === "[DONE]") {
            //   let cleanContent = fullContent
            //     .replace(/<think>[\s\S]*?<\/think>/g, "")
            //     .replace(/<think>[\s\S]*$/g, "")
            //     .replace(/<\/think>/g, "")
            //     .replace(/^\s*\n+/, "")
            //     .trim();
            //   onChunk({ type: "done", content: cleanContent });
            //   return;
            // }

            try {
              const parsed = JSON.parse(data);
              const deltaContent = parsed.choices[0]?.delta?.content;

              if (deltaContent) {
                // Add new content to full content
                fullContent += deltaContent;

                // Clean the accumulated content with more robust filtering
                let cleanedContent = fullContent
                  .replace(/<think>[\s\S]*?<\/think>/g, "")
                  .replace(/<think>[\s\S]*$/g, "")
                  .replace(/<\/think>/g, "")
                  .replace(/^\s*\n+/, "")
                  .trim();

                // Only send the new part that hasn't been sent yet
                if (cleanedContent.length > lastSentLength) {
                  const newContent = cleanedContent.slice(lastSentLength);
                  if (newContent) {
                    onChunk({ type: "chunk", content: newContent });
                    lastSentLength = cleanedContent.length;
                  }
                }
              }
            } catch (parseError) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      });

      response.data.on("end", () => {
        // Final cleanup before sending complete
        let cleanContent = fullContent
          // Remove complete think blocks
          .replace(/<think>[\s\S]*?<\/think>/g, "")
          // Remove unclosed think tags and everything after them
          .replace(/<think>[\s\S]*$/g, "")
          // Remove any remaining think closing tags
          .replace(/<\/think>/g, "")
          // Remove leading whitespace and newlines
          .replace(/^\s*\n+/, "")
          .trim();
        onChunk({ type: "complete", content: cleanContent });
      });
    } catch (error) {
      logger.error("AI stream response failed:", error);
      onChunk({
        type: "error",
        message:
          "I apologize, but I'm experiencing some technical difficulties right now.",
      });
    }
  }

  private buildMessageContext(
    userMessage: string,
    conversationHistory: Message[]
  ): any[] {
    //     const systemPrompt = {
    //       role: "system",
    //       content: `You are a compassionate AI therapist chatbot designed to provide emotional support and guidance.

    // Key guidelines:
    // - Always respond with empathy and understanding
    // - Ask thoughtful follow-up questions to encourage reflection
    // - Provide coping strategies and techniques when appropriate
    // - Maintain professional boundaries - you are not a replacement for professional therapy
    // - If someone expresses suicidal thoughts or immediate danger, encourage them to seek professional help
    // - Keep responses concise but meaningful (under 200 words)
    // - Use active listening techniques in your responses
    // - Validate the user's feelings and experiences
    // - Respond politely to users thanks and other positive experiences responses
    // - Encourage users to share their thoughts and feelings openly, without fear of judgment.

    // Remember: You are here to listen, support, and guide, not to diagnose or provide medical advice.`,
    //     };

    // const messages = [systemPrompt];
    let messages = [];

    // Add conversation history (last 5 exchanges to manage token usage)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role.toLowerCase() === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    // to disable thinking
    messages.push({
      role: "user",
      content: "/no_think",
    });

    return messages;
  }

  private calculateCost(tokens: number): number {
    // GPT-3.5-turbo pricing (as of 2024)
    const costPerToken = 0.0000015; // $0.0015 per 1K tokens
    return tokens * costPerToken;
  }

  // Test OpenAI connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 5000,
      });

      return response.status === 200;
    } catch (error) {
      logger.error("OpenAI connection test failed:", error);
      return false;
    }
  }
}

export const aiService = new AIService();
