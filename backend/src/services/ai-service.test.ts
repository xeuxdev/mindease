const mockCreate = jest.fn();

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));
jest.mock("../config/env", () => ({
  aiConfig: { openaiApiKey: "test-key", openaiModel: "test-model" },
}));
jest.mock("../config/database", () => ({ prisma: {} }));
jest.mock("../utils/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { aiService, CrisisSeverity } from "./ai-service";
import { logger } from "../utils/logger";

function verdict(body: object) {
  return {
    choices: [
      { finish_reason: "stop", message: { content: JSON.stringify(body) } },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("detectCrisis", () => {
  it("calls the classifier even when no keyword matches", async () => {
    mockCreate.mockResolvedValue(
      verdict({ isCrisis: true, severity: "CRITICAL", confidence: 0.9 }),
    );

    const result = await aiService.detectCrisis(
      "Everything is pointless and I've written my goodbye letters",
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result.isCrisis).toBe(true);
    expect(result.severity).toBe(CrisisSeverity.CRITICAL);
  });

  it.each([CrisisSeverity.LOW, CrisisSeverity.MEDIUM])(
    "does not flag a %s-severity verdict",
    async (severity) => {
      mockCreate.mockResolvedValue(
        verdict({ isCrisis: true, severity, confidence: 0.8 }),
      );

      const result = await aiService.detectCrisis("Work has been so stressful");

      expect(result.isCrisis).toBe(false);
    },
  );

  it.each([CrisisSeverity.HIGH, CrisisSeverity.CRITICAL])(
    "flags a %s-severity verdict",
    async (severity) => {
      mockCreate.mockResolvedValue(
        verdict({ isCrisis: true, severity, confidence: 0.8 }),
      );

      const result = await aiService.detectCrisis("I can't go on like this");

      expect(result.isCrisis).toBe(true);
      expect(result.severity).toBe(severity);
    },
  );

  it("accepts lower-case severity from the model", async () => {
    mockCreate.mockResolvedValue(
      verdict({ isCrisis: true, severity: "high", confidence: 0.8 }),
    );

    const result = await aiService.detectCrisis("I can't go on like this");

    expect(result.isCrisis).toBe(true);
    expect(result.severity).toBe(CrisisSeverity.HIGH);
  });

  it("flags critical keywords even when the classifier says no crisis", async () => {
    mockCreate.mockResolvedValue(
      verdict({ isCrisis: false, severity: "LOW", confidence: 0.6 }),
    );

    const result = await aiService.detectCrisis("I want to kill myself");

    expect(result.isCrisis).toBe(true);
    expect(result.severity).toBe(CrisisSeverity.HIGH);
  });

  it("falls back to critical keywords when the classifier call fails", async () => {
    mockCreate.mockRejectedValue(new Error("400 max_tokens reached"));

    const result = await aiService.detectCrisis(
      "I don’t want to be alive anymore.",
    );

    expect(result.isCrisis).toBe(true);
    expect(result.reason).toMatch(/AI analysis failed/);
    expect(logger.error).toHaveBeenCalledWith(
      "crisis_classifier_failed",
      expect.objectContaining({ stage: "api_error" }),
    );
  });

  it("falls back to critical keywords when the classifier returns empty content", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ finish_reason: "length", message: { content: "" } }],
      usage: {
        completion_tokens: 2000,
        completion_tokens_details: { reasoning_tokens: 2000 },
      },
    });

    const result = await aiService.detectCrisis("I wan drink sniper");

    expect(result.isCrisis).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(
      "crisis_classifier_failed",
      expect.objectContaining({
        stage: "empty_content",
        finishReason: "length",
        reasoningTokens: 2000,
      }),
    );
  });

  it("returns no crisis when the classifier fails and no critical keyword matches", async () => {
    mockCreate.mockRejectedValue(new Error("network down"));

    const result = await aiService.detectCrisis("I'm on a strict diet");

    expect(result.isCrisis).toBe(false);
  });

  it("requests a 2000-token completion budget", async () => {
    mockCreate.mockResolvedValue(
      verdict({ isCrisis: false, severity: "LOW", confidence: 0.9 }),
    );

    await aiService.detectCrisis("hello");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_completion_tokens: 2000 }),
    );
  });
});
