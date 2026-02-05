import OpenAI from "openai";
import { logger } from "../utils/logger";
import { prisma } from "../config/database";
import { aiConfig } from "../config/env";
import { crisisKeywords } from "../config/constants";

interface AIResponse {
  content: string;
  tokens: number;
  cost: number;
  responseTime: number;
  model: string;
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
  private openaiClient: OpenAI;
  private model: string;

  constructor() {
    if (!aiConfig.openaiApiKey) {
      throw new Error(
        "OpenAI API key not configured. Set OPENAI_API_KEY environment variable.",
      );
    }

    this.openaiClient = new OpenAI({
      apiKey: aiConfig.openaiApiKey,
      baseURL: aiConfig.openaiBaseUrl,
    });
    this.model = aiConfig.openaiModel;

    logger.info("AI Service initialized with OpenAI", {
      model: this.model,
    });
  }

  async generateResponse(
    userMessage: string,
    conversationHistory: Message[] = [],
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const messages = this.buildMessageContext(
        userMessage,
        conversationHistory,
      );

      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: messages,
        max_completion_tokens: 1000,
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

      logger.info("AI response generated", {
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
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error("AI response generation failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime,
        model: this.model,
      });

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
              take: 8,
            },
          },
        });

        if (conversation) {
          conversationHistory = conversation.messages;
        }
      }

      const messages = this.buildMessageContext(
        userMessage,
        conversationHistory,
      );

      logger.info("Starting AI stream", {
        model: this.model,
        messageCount: messages.length,
        conversationId,
      });

      const stream = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: messages,
        max_completion_tokens: 1500,
        // temperature: 1,
        stream: true,
      });

      let fullContent = "";
      let chunkCount = 0;

      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content;

        if (deltaContent) {
          fullContent += deltaContent;
          chunkCount++;
          onChunk({ type: "chunk", content: deltaContent, fullContent });
        }

        // Check for finish reason
        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason) {
          logger.info("Stream finished", {
            finishReason,
            chunkCount,
            contentLength: fullContent.length,
            conversationId,
          });
        }
      }

      logger.info("AI stream completed", {
        chunkCount,
        contentLength: fullContent.length,
        conversationId,
      });

      onChunk({ type: "complete", content: fullContent });
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
    conversationHistory: Message[],
  ): any[] {
    const systemPrompt: { role: "system"; content: string } = {
      role: "system",
      content: `
You are a compassionate, Nigerian-based AI emotional support companion. Your role is to help users feel heard, grounded, and supported while gently guiding insight using evidence-based therapeutic principles (CBT Principles) without sounding clinical.

--------------------------------
CORE PRINCIPLES (NON-NEGOTIABLE)
--------------------------------
• Be warm, respectful, and emotionally present.
• Sound like a trusted older sibling or steady friend.
• Never lecture, diagnose, label, or moralize.
• Never mention therapy models, psychology jargon, or internal techniques.
Validation Variety Rule:
• Do NOT use the same emotional validation phrasing repeatedly.
• Avoid default openers like “I hear you” or “You did well to say this” in every response.
• Vary how empathy is expressed:
  - Sometimes reflect the feeling.
  - Sometimes acknowledge the situation.
  - Sometimes start with a thoughtful question.
  - Sometimes begin with calm reassurance.
• Empathy should feel natural, not formulaic.
Do not reuse the same opening sentence across consecutive responses in a single conversation.

--------------------------------
CULTURAL ATTUNEMENT (NIGERIA)
--------------------------------
• Validate emotions with culturally familiar warmth:
  “I hear you.” “You did well to talk about this.” “That one is not easy at all.”
• Use Nigerian expressions sparingly and naturally.
• Do NOT force slang or Pidgin.

--------------------------------
LANGUAGE MATCHING
--------------------------------
• Standard English → respond in clear English with very light Nigerian tone.
• Pidgin → reply in a natural mix of Pidgin + English, matching the user’s style.
• Mirror emotional intensity, not exaggeration.

--------------------------------
THERAPEUTIC STYLE (NATURAL, NON-CLINICAL)
--------------------------------
• Gently explore the link between thoughts, feelings, and actions.
• Ask reflective questions, not leading ones.
• Examples:
  - “What was going through your mind at that moment?”
  - “Is that the only way this situation can be seen?”
  - “What makes this thought feel true right now?”

--------------------------------
UNHELPFUL THOUGHT AWARENESS
--------------------------------
Help users notice thinking patterns without naming them.
Use simple prompts like:
• “What evidence supports this?”
• “What evidence might challenge it?”
• “If a friend were in this situation, what would you tell them?”

--------------------------------
NIGERIAN-RELEVANT SUPPORT ACTIONS
--------------------------------
Suggest small, realistic steps only when appropriate:
• Evening walks, fresh air, talk to a friend
• Music, prayer, or quiet reflection (only if user mentions faith)
• Reaching out to one trusted person
Never overwhelm with lists.

--------------------------------
OPTIONAL TOOLS (ASK FIRST)
--------------------------------
• Mood check-in: “On a scale of 1–10, how are you feeling today?”
• Journaling: “Would it help to write this out for yourself later?”
• Pattern noticing: reflect trends only after multiple mentions.

--------------------------------
CRISIS PROTOCOL (STRICT)
--------------------------------
If the user expresses self-harm, suicidal thoughts, or extreme despair:
• Respond with empathy.
• Do NOT continue reflective questioning.
• State clearly you cannot provide emergency support.
• Encourage immediate human help.

Use this wording style:
“I’m really glad you spoke up. What you’re carrying feels very heavy, and you shouldn’t handle it alone.”

Immediately share resources:
• Nigeria Suicide Prevention Initiative: 0806 210 6492
• Mentally Aware Nigeria Initiative (MANI): 0809 111 6264
• Emergency Lines: 767 or 112

--------------------------------
CONSTRAINTS
--------------------------------
• Max response length: 180–200 words.
• Scope limited to emotional and psychological support only.
• No medical, psychiatric, legal, or financial advice.
• Never present yourself as a replacement for human support.

Formatting: Use Markdown formatting (e.g., **bold** for emphasis, lists for steps) to make the text easy to read.
`,
    };

    // OpenAI benefits from system prompts, local LLM might not use them
    // For Nigerian context, we must ensure system prompt is always passed to define the persona
    const messages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [systemPrompt];

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

    return messages;
  }

  /**
   * Analyzes a message for crisis indicators using AI
   */
  async detectCrisis(message: string): Promise<CrisisDetectionResult> {
    try {
      logger.info("Starting crisis detection", {
        messagePreview: message.substring(0, 100),
      });

      // Quick keyword scan first
      const containsCrisisKeyword = this.quickKeywordScan(message);

      if (!containsCrisisKeyword) {
        logger.info("No crisis keywords found in quick scan");
        return { isCrisis: false };
      }

      logger.info("Crisis keywords found, performing deep AI analysis");

      // Perform deep AI analysis
      const aiAnalysis = await this.aiCrisisAnalysis(message);

      logger.info("AI analysis complete", {
        isCrisis: aiAnalysis.isCrisis,
        severity: aiAnalysis.severity,
        confidence: aiAnalysis.confidence,
      });

      return aiAnalysis;
    } catch (error) {
      logger.error("Crisis detection failed:", error);
      // Fail-safe: if there are critical keywords, flag as potential crisis
      if (this.containsCriticalKeywords(message)) {
        logger.warn("Using failsafe crisis detection due to error");
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

Respond ONLY with a valid JSON object in this exact format (no markdown, no code blocks):
{
  "isCrisis": true,
  "severity": "LOW",
  "confidence": 0.8
}

Severity levels:
- LOW: Mild distress, no immediate danger
- MEDIUM: Moderate distress, some concerning thoughts
- HIGH: Severe distress, thoughts of self-harm
- CRITICAL: Immediate danger, active suicidal ideation or plan

Key Nigerian Context:
- Terms like "drink sniper", "jump lagoon", "oct 20", "pai myself", "kpeme" are effectively suicide/death ideation.
- "I don tire", "nothing dey work" can imply deep depression/despair.
`;

      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_completion_tokens: 300,
        response_format: { type: "json_object" },
        stream: false,
      });

      logger.info("AI crisis analysis raw response", {
        finishReason: response.choices[0]?.finish_reason,
        hasContent: !!response.choices[0]?.message?.content,
      });

      const aiResponse = response.choices[0]?.message?.content?.trim();

      if (!aiResponse) {
        logger.error("AI returned empty response", {
          finishReason: response.choices[0]?.finish_reason,
          choices: JSON.stringify(response.choices),
        });
        throw new Error("AI returned empty response");
      }

      let cleanedResponse = aiResponse;

      // Extract JSON from response if it's wrapped in markdown code blocks
      const jsonMatch =
        cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
        cleanedResponse.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[1].trim();
      }

      const analysis = JSON.parse(cleanedResponse);

      logger.info("AI crisis analysis result", {
        isCrisis: analysis.isCrisis,
        severity: analysis.severity,
        confidence: analysis.confidence,
      });

      return {
        isCrisis: analysis.isCrisis || false,
        severity: analysis.severity || CrisisSeverity.MEDIUM,
        confidence: analysis.confidence || 0.5,
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
    const matched = crisisKeywords.some((keyword) =>
      lowerMessage.includes(keyword.toLowerCase()),
    );

    if (matched) {
      logger.info("Crisis keyword detected in quick scan", {
        message: lowerMessage.substring(0, 100),
        matchedKeywords: this.extractKeywords(message),
      });
    }

    return matched;
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
      "I don’t want to be alive anymore.",
    ];
    const lowerMessage = message.toLowerCase();
    return criticalKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  /**
   * Extract matched keywords from message
   */
  private extractKeywords(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const matched = crisisKeywords.filter((keyword) =>
      lowerMessage.includes(keyword.toLowerCase()),
    );

    logger.info("Extracting keywords", {
      messageLength: message.length,
      matchedCount: matched.length,
      matched: matched,
    });

    return matched;
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

  public getCrisisResources(
    severity: CrisisSeverity,
    country: string = "NG",
  ): CrisisResource[] {
    const allResources: CrisisResource[] = [
      {
        id: "1",
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
        id: "2",
        title: "Asido Foundation Psychological Helpline",
        description: "Provides psychological First Aid to people in distress",
        type: "hotline",
        contact: "+234 902 808 0416",
        available: "24/7",
        country: "NG",
        priority: 95,
      },
      {
        id: "3",
        title: "Mentally Aware Nigeria Initiative (MANI)",
        description:
          "Free and confidential mental health support over the phone",
        type: "hotline",
        contact: "0809 111 6264",
        available: "24/7",
        country: "NG",
        priority: 85,
      },
      {
        id: "4",
        title: "Emergency Services Nigeria",
        description: "For immediate life-threatening emergencies",
        type: "emergency",
        contact: "112 or 199",
        available: "24/7",
        country: "NG",
        priority: 100,
      },
    ];

    // Filter by country and sort by priority
    return allResources
      .filter((resource) => resource.country === country)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, severity === CrisisSeverity.CRITICAL ? 4 : 2);
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const INPUT_COST = 0.25 / 1_000_000; // $0.25 per 1M input tokens
    const OUTPUT_COST = 2.0 / 1_000_000; // $2.00 per 1M output tokens
    return inputTokens * INPUT_COST + outputTokens * OUTPUT_COST;
  }

  async testConnection(): Promise<boolean> {
    try {
      const models = await this.openaiClient.models.list();
      return models.data.length > 0;
    } catch (error) {
      logger.error("OpenAI connection test failed:", error);
      return false;
    }
  }
}

export const aiService = new AIService();
