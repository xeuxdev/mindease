import axios from "axios";
import OpenAI from "openai";
import { logger } from "../utils/logger";
import { prisma } from "../config/database";
import { aiConfig } from "../config/env";

type AIProvider = "openai" | "local";

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
    },
  ];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  stats: {};
  system_fingerprint?: string;
}

interface Message {
  id: string;
  content: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  timestamp: Date;
}

export enum CrisisSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface CrisisDetectionResult {
  isCrisis: boolean;
  severity?: CrisisSeverity;
  keywords?: string[];
  confidence?: number;
  reason?: string;
}

export interface CrisisResource {
  id: string;
  title: string;
  description: string;
  type: string;
  contact?: string;
  available?: string;
  country: string;
  priority: number;
}

class AIService {
  private provider: AIProvider;
  private apiKey: string;
  private model: string;
  private baseURL: string;
  private openaiClient?: OpenAI;

  constructor() {
    // Auto-detect provider based on available API keys
    if (aiConfig.provider === "openai" && aiConfig.openaiApiKey) {
      this.provider = "openai";
      this.apiKey = aiConfig.openaiApiKey;
      this.model = aiConfig.openaiModel;
      this.baseURL = aiConfig.openaiBaseUrl || "https://api.openai.com/v1";
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey,
        baseURL: aiConfig.openaiBaseUrl,
      });
      logger.info("AI Service initialized with OpenAI provider", {
        model: this.model,
      });
    } else if (aiConfig.llmApiKey && aiConfig.llmApiUrl) {
      this.provider = "local";
      this.apiKey = aiConfig.llmApiKey;
      this.model = aiConfig.model;
      this.baseURL = aiConfig.llmApiUrl;
      logger.info("AI Service initialized with local LLM provider", {
        model: this.model,
      });
    } else {
      throw new Error(
        "No AI provider configured. Set either OPENAI_API_KEY or LLM_API_KEY/LLM_API_URL",
      );
    }
  }

  async generateResponse(
    userMessage: string,
    conversationHistory: Message[] = [],
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Build conversation context
      const messages = this.buildMessageContext(
        userMessage,
        conversationHistory,
      );

      if (this.provider === "openai" && this.openaiClient) {
        // Use OpenAI SDK
        const response = await this.openaiClient.chat.completions.create({
          model: this.model,
          messages: messages,
          max_completion_tokens: 1500,
          temperature: 1,
        });

        const responseTime = Date.now() - startTime;

        const content =
          response.choices[0]?.message?.content?.trim() ||
          "I apologize, but I couldn't generate a response. Please try again.";

        const inputTokens = response.usage?.prompt_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;
        const tokens = response.usage?.total_tokens || 0;
        const cost = this.calculateCost(inputTokens, outputTokens);

        logger.info("AI response generated (OpenAI)", {
          model: this.model,
          tokens,
          inputTokens,
          outputTokens,
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
      } else {
        // Use axios for local LLM
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
          },
        );

        const responseTime = Date.now() - startTime;

        let content =
          response.data.choices[0]?.message?.content
            // Remove complete think blocks (for local LLM)
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
        const cost = this.calculateCost(tokens, tokens); // Simplified cost calculation

        logger.info("AI response generated (Local LLM)", {
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
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      console.log(error);

      logger.error("AI response generation failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime,
        model: this.model,
        provider: this.provider,
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
    onChunk: (chunk: any) => void,
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
        conversationHistory,
      );

      if (this.provider === "openai" && this.openaiClient) {
        // Use OpenAI SDK for streaming
        await this.streamOpenAI(messages, onChunk);
      } else {
        // Use axios for local LLM streaming
        await this.streamLocalLLM(messages, onChunk);
      }
    } catch (error) {
      logger.error("AI stream response failed:", error);
      onChunk({
        type: "error",
        message:
          "I apologize, but I'm experiencing some technical difficulties right now.",
      });
    }
  }

  private async streamOpenAI(
    messages: any[],
    onChunk: (chunk: any) => void,
  ): Promise<void> {
    try {
      const stream = await this.openaiClient!.chat.completions.create({
        model: this.model,
        messages: messages,
        max_completion_tokens: 1500,
        temperature: 1,
        stream: true,
      });

      let fullContent = "";

      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content;

        if (deltaContent) {
          fullContent += deltaContent;
          onChunk({ type: "chunk", content: deltaContent });
        }
      }

      onChunk({ type: "complete", content: fullContent });
    } catch (error) {
      logger.error("OpenAI streaming error:", error);
      throw error;
    }
  }

  private async streamLocalLLM(
    messages: any[],
    onChunk: (chunk: any) => void,
  ): Promise<void> {
    try {
      // Stream response from local LLM
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
        },
      );

      let fullContent = "";
      let lastSentLength = 0;

      response.data.on("data", (chunk: Buffer) => {
        const chunkStr = chunk.toString();
        const lines = chunkStr.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

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
      logger.error("Local LLM streaming error:", error);
      onChunk({
        type: "error",
        message:
          "I apologize, but I'm experiencing some technical difficulties right now.",
      });
    }
  }

  private buildMessageContext(
    userMessage: string,
    conversationHistory: Message[],
  ): any[] {
    const systemPrompt = {
      role: "system",
      content: `You are a compassionate, Nigerian-based AI support partner. Your goal is to provide culturally resonant emotional support, helping users understand their feelings and actions better.

Core Therapeutic Guidelines (Nigerian Context)
Cultural Empathy & Validation: Use warm, culturally appropriate affirmations (e.g., "I hear you, and your feelings are valid," "Well done for speaking up; it’s not easy").

Natural Support (No Jargon): Apply therapeutic principles like the CBT Techniques naturally without using technical terms like "CBT", "Cognitive Distortion", or "Reframing". Speak like a wise, supportive friend.

Connecting the Dots: Gently help the user see how their thoughts affect how they feel and act, without making it feel like a lecture. (e.g., instead of "Let's map your CBT triangle", say "Sometimes the things we tell ourselves can make the heaviness worse. What was running through your mind when that happened?").

Identifying "Wahala" Thoughts: Help users spot unhelpful thinking patterns by asking simple questions like: "Is that the only way to look at it?" or "What acts like evidence for this feeling?"

Nigerian-Centric Behavioral Activation: Suggest practical, local activities (e.g., "Taking a walk in the evening breeze," "Connecting with a trusted 'person' in your circle," or "Listening to calming music").

Language Adaptability
- If the user writes in Standard English: Respond in clear Standard English with only very mild Nigerian flavor (e.g., "Well done", "I hear you"). Do not force Pidgin.
- If the user writes in Pidgin: Respond in a natural mix of Pidgin and English to match their energy.

Functionalities
Mood Tracking: Gently ask, "On a scale of 1-10, how you dey today?" or "Which emotion is taking the lead right now?" Use these scores to identify patterns over time.

Reflective Questions: Ask things like "What evidence do you have that this thought is 100% true?" or "Is there another way to look at this situation?"

Journaling: "Would you like a prompt to write down your thoughts tonight?"

Crisis Protocol (Nigeria Specific)
If you detect mentions of self-harm or deep despair, pivot immediately:

"I hear the weight you are carrying, and I want you to know you aren't alone. As an AI, I cannot provide the emergency safety support you need. Please reach out to professional help right now."

Referral Resources:

Nigeria Suicide Prevention Initiative: 0806 210 6492

Mentally Aware Nigeria Initiative (MANI): 0809 111 6264

Lagos State Help Line: 767 or 112

Constraints
Conciseness: Keep responses under 200 words.

Formatting: Use Markdown formatting (e.g., **bold** for emphasis, lists for steps) to make the text easy to read.

Scope: Strictly psychological well-being; no medical or legal advice.

Tone: Respectful, "older sibling" or "trusted peer" energy—warm but professional. Never use clinical labels.`,
    };

    // OpenAI benefits from system prompts, local LLM might not use them
    // For Nigerian context, we must ensure system prompt is always passed to define the persona
    const messages: any[] = [systemPrompt];

    // Add conversation history (last 10 exchanges to manage token usage)
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

    // Only add /no_think for local LLM
    if (this.provider === "local") {
      messages.push({
        role: "user",
        content: "/no_think",
      });
    }

    return messages;
  }

  private crisisKeywords = [
    "suicide",
    "suicidal",
    "kill myself",
    "end my life",
    "want to die",
    "better off dead",
    "no reason to live",
    "self-harm",
    "hurt myself",
    "cutting",
    "overdose",
    "jump off",
    "hanging",
    "gun",
    "pills",
    "razor",
    "abuse",
    "violent",
    "emergency",
    "crisis",
    "sniper",
    "gbege",
    "die",
    "pai",
    "kpeme",
    "slump",
    "poison",
    "nothing dey work",
    "tired of life",
    "no hope",
    "give up",
    "jump lagoon",
    "jump bridge",
    "take my life",
    "end am",
    "log out",
    "go meet god",
  ];

  /**
   * Analyzes a message for crisis indicators using AI
   */
  async detectCrisis(message: string): Promise<CrisisDetectionResult> {
    try {
      // Quick keyword scan first
      const containsCrisisKeyword = this.quickKeywordScan(message);

      if (!containsCrisisKeyword) {
        return { isCrisis: false };
      }

      // Perform deep AI analysis
      const aiAnalysis = await this.aiCrisisAnalysis(message);

      return aiAnalysis;
    } catch (error) {
      logger.error("Crisis detection failed:", error);
      // Fail-safe: if there are critical keywords, flag as potential crisis
      if (this.containsCriticalKeywords(message)) {
        return {
          isCrisis: true,
          severity: CrisisSeverity.HIGH,
          keywords: this.extractKeywords(message),
          confidence: 0.7,
          reason: "Detected critical keywords (AI analysis failed)",
        };
      }
      return { isCrisis: false };
    }
  }

  /**
   * Use AI to perform deep crisis analysis
   */
  async aiCrisisAnalysis(message: string): Promise<CrisisDetectionResult> {
    try {
      const systemPrompt = `You are a crisis detection AI with expertise in Nigerian nuances and slang. Analyze the following message and determine if it indicates a mental health crisis.

Respond ONLY with a valid JSON object in this exact format:
{
  "isCrisis": boolean,
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": number between 0 and 1,
  "reason": "brief explanation"
}

Severity levels:
- LOW: Mild distress, no immediate danger
- MEDIUM: Moderate distress, some concerning thoughts
- HIGH: Severe distress, thoughts of self-harm
- CRITICAL: Immediate danger, active suicidal ideation or plan

Key Nigerian Context:
- Terms like "drink sniper", "jump lagoon", "oct 20", "pai myself", "kpeme" are effectively suicide/death ideation.
- "I don tire", "nothing dey work" can imply deep depression/despair.

Message to analyze: "${message}"`;

      let aiResponse: string;

      if (this.provider === "openai" && this.openaiClient) {
        const response = await this.openaiClient.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: "user",
              content: systemPrompt,
            },
          ],
          max_completion_tokens: 200,
          temperature: 0.3,
        });
        aiResponse = response.choices[0]?.message?.content || "{}";
      } else {
        const response = await axios.post(
          `${this.baseURL}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: "user",
                content: systemPrompt,
              },
            ],
            max_tokens: 200,
            temperature: 0.3, // Lower temperature for more consistent analysis
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          },
        );
        aiResponse = response.data.choices[0]?.message?.content || "{}";
      }

      // Clean the response (remove think tags and extract JSON)
      let cleanedResponse = aiResponse
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .replace(/<think>[\s\S]*$/g, "")
        .replace(/<\/think>/g, "")
        .trim();

      // Extract JSON from response if it's wrapped in markdown code blocks
      const jsonMatch =
        cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
        cleanedResponse.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[1].trim();
      }

      const analysis = JSON.parse(cleanedResponse);

      return {
        isCrisis: analysis.isCrisis || false,
        severity: analysis.severity || CrisisSeverity.LOW,
        confidence: analysis.confidence || 0.5,
        reason: analysis.reason || "AI analysis completed",
        keywords: this.extractKeywords(message),
      };
    } catch (error) {
      logger.error("AI crisis analysis failed:", error);
      throw error;
    }
  }

  /**
   * Quick keyword scan to filter out obviously safe messages
   */
  private quickKeywordScan(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return this.crisisKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );
  }

  /**
   * Check for critical keywords that warrant immediate attention
   */
  private containsCriticalKeywords(message: string): boolean {
    const criticalKeywords = [
      "kill myself",
      "end my life",
      "suicide",
      "want to die",
      "drink sniper",
      "jump lagoon",
      "jump bridge",
      "take poison",
      "pai myself",
      "end am today",
    ];
    const lowerMessage = message.toLowerCase();
    return criticalKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  /**
   * Extract matched keywords from message
   */
  private extractKeywords(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    return this.crisisKeywords.filter((keyword) =>
      lowerMessage.includes(keyword),
    );
  }

  /**
   * Log a crisis alert to the database
   */
  async logCrisisAlert(
    userId: string,
    conversationId: string,
    messageId: string,
    detectionResult: CrisisDetectionResult,
  ): Promise<void> {
    try {
      await prisma.crisisAlert.create({
        data: {
          userId,
          conversationId,
          messageId,
          severity: detectionResult.severity || CrisisSeverity.MEDIUM,
          keywords: detectionResult.keywords || [],
          context: `Confidence: ${detectionResult.confidence || 0}, Reason: ${
            detectionResult.reason || "N/A"
          }`,
        },
      });

      logger.warn("Crisis alert logged", {
        userId,
        conversationId,
        messageId,
        severity: detectionResult.severity,
        confidence: detectionResult.confidence,
      });
    } catch (error) {
      logger.error("Failed to log crisis alert:", error);
    }
  }

  /**
   * Get crisis resources based on severity
   */
  async getCrisisResources(
    severity: CrisisSeverity,
    country: string = "NG",
  ): Promise<CrisisResource[]> {
    try {
      const resources = await prisma.crisisResource.findMany({
        where: {
          isActive: true,
          OR: [{ country: country }],
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: severity === CrisisSeverity.CRITICAL ? 10 : 5,
      });

      return resources.map((resource) => ({
        id: resource.id,
        title: resource.title,
        description: resource.description,
        type: resource.type,
        contact: resource.contact || undefined,
        available: resource.available || undefined,
        country: resource.country,
        priority: resource.priority,
      }));
    } catch (error) {
      logger.error("Failed to get crisis resources:", error);
      return this.getDefaultCrisisResources();
    }
  }

  /**
   * Fallback crisis resources if database query fails (Nigeria-focused)
   */
  private getDefaultCrisisResources(): CrisisResource[] {
    return [
      {
        id: "default-1",
        title: "SURPIN Helpline Nigeria",
        description:
          "24-hour suicide prevention hotline offering counselling and support",
        type: "hotline",
        contact: "080 0078 7746",
        available: "24/7",
        country: "NG",
        priority: 100,
      },
      {
        id: "default-2",
        title: "Asido Foundation Psychological Helpline",
        description: "Provides psychological First Aid to people in distress",
        type: "hotline",
        contact: "+234 902 808 0416",
        available: "24/7",
        country: "NG",
        priority: 95,
      },
      {
        id: "default-3",
        title: "Mentally Aware Nigeria Initiative (MANI)",
        description:
          "Free and confidential mental health support over the phone",
        type: "hotline",
        contact: "0809 111 6264",
        available: "Mon-Sat 9AM-5PM",
        country: "NG",
        priority: 85,
      },
      {
        id: "default-4",
        title: "Emergency Services Nigeria",
        description: "For immediate life-threatening emergencies",
        type: "emergency",
        contact: "112 or 199",
        available: "24/7",
        country: "NG",
        priority: 100,
      },
    ];
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const OPENAI_INPUT_COST = 0.25 / 1_000_000; // $0.25 per 1M input tokens
    const OPENAI_OUTPUT_COST = 2.0 / 1_000_000; // $2.00 per 1M output tokens
    const LOCAL_TOKEN_COST = 0.0000001; // nominal local cost

    if (this.provider === "openai") {
      return (
        inputTokens * OPENAI_INPUT_COST + outputTokens * OPENAI_OUTPUT_COST
      );
    } else {
      // local LLM
      return (inputTokens + outputTokens) * LOCAL_TOKEN_COST;
    }
  }

  // Test AI provider connection
  async testConnection(): Promise<boolean> {
    try {
      if (this.provider === "openai" && this.openaiClient) {
        // Test OpenAI connection
        const models = await this.openaiClient.models.list();
        return models.data.length > 0;
      } else {
        // Test local LLM connection
        const response = await axios.get(`${this.baseURL}/models`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 5000,
        });
        return response.status === 200;
      }
    } catch (error) {
      logger.error(`${this.provider} connection test failed:`, error);
      return false;
    }
  }
}

export const aiService = new AIService();
