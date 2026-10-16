import { containsAnyKeyword, findKeywords } from "./keyword-matcher";
import { crisisKeywords, criticalCrisisKeywords } from "../config/constants";

describe("keyword matching", () => {
  it.each([
    "I'm on a strict diet this month",
    "I studied all night for the exam",
    "My salary was finally paid",
    "The pain in my back is better",
  ])("does not match substrings inside other words: %s", (message) => {
    expect(findKeywords(message, ["die", "pai"])).toEqual([]);
  });

  it("matches 'die' as a whole word in Pidgin", () => {
    expect(findKeywords("I wan die", crisisKeywords)).toContain("die");
  });

  it("matches across case and extra whitespace", () => {
    expect(containsAnyKeyword("I want to  KILL   myself", ["kill myself"])).toBe(
      true,
    );
  });

  it.each([
    "I'm going to hang myself tonight",
    "I keep thinking about killing myself",
    "I go drink otapiapia",
    "I wan take gammalin",
  ])("flags new critical phrases: %s", (message) => {
    expect(containsAnyKeyword(message, criticalCrisisKeywords)).toBe(true);
  });
});

describe("normalised fail-safe phrase", () => {
  it.each([
    "I don’t want to be alive anymore.",
    "i don't want to be alive anymore",
    "Honestly I DON’T WANT TO BE ALIVE ANYMORE",
  ])("matches regardless of case, apostrophe or punctuation: %s", (message) => {
    expect(containsAnyKeyword(message, criticalCrisisKeywords)).toBe(true);
  });

  it("stores critical phrases lower-case with straight apostrophes", () => {
    for (const phrase of criticalCrisisKeywords) {
      expect(phrase).toBe(phrase.toLowerCase());
      expect(phrase).not.toMatch(/[‘’]/);
    }
  });
});
