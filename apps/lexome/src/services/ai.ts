/**
 * AI Service - Provides AI-powered features for reading assistance
 */
import { generateText } from "@sb/ai";
import { getJson, setJson, hashInput } from "@sb/cache";
import { trackTelemetry } from "@sb/telemetry";

export class AIService {
  /**
   * Explain a selected text passage
   */
  async explainText(params: {
    text: string;
    bookTitle: string;
    bookAuthor: string;
    context?: string;
  }): Promise<string> {
    const cacheKey = hashInput(`lexome:explain:${params.text}:${params.bookTitle}`);
    const cached = getJson<string>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = `You are a literary assistant helping readers understand classic literature.

Book: "${params.bookTitle}" by ${params.bookAuthor}
${params.context ? `Context: ${params.context}` : ""}

Selected text: "${params.text}"

Please provide a clear, concise explanation of this passage. Include:
1. The literal meaning in modern English
2. Any historical or cultural context that helps understanding
3. Literary devices or techniques used, if notable
4. How it relates to the broader themes of the work

Keep your response concise (2-3 paragraphs) and accessible.`;

      const response = await generateText({
        model: "gpt-4",
        prompt,
        maxTokens: 500,
      });

      // Cache the result
      setJson(cacheKey, response);

      // Track telemetry
      trackTelemetry({
        event: "ai.explain.text",
        properties: {
          bookTitle: params.bookTitle,
          textLength: params.text.length,
          responseLength: response.length,
        },
      });

      return response;
    } catch (error) {
      console.error("Error explaining text:", error);
      throw new Error("Failed to generate explanation");
    }
  }

  /**
   * Translate archaic or difficult language to modern English
   */
  async translateArchaic(params: {
    text: string;
    bookTitle: string;
    bookAuthor: string;
  }): Promise<string> {
    const cacheKey = hashInput(`lexome:translate:${params.text}:${params.bookTitle}`);
    const cached = getJson<string>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = `You are a literary translator specializing in making classic literature accessible.

Book: "${params.bookTitle}" by ${params.bookAuthor}

Original text: "${params.text}"

Please translate this passage into clear, modern English while preserving the original meaning and tone. Focus on:
1. Replacing archaic words and phrases
2. Simplifying complex sentence structures
3. Clarifying cultural or historical references
4. Maintaining the author's voice and style

Provide only the translation, without additional commentary.`;

      const response = await generateText({
        model: "gpt-4",
        prompt,
        maxTokens: 300,
      });

      // Cache the result
      setJson(cacheKey, response);

      // Track telemetry
      trackTelemetry({
        event: "ai.translate.archaic",
        properties: {
          bookTitle: params.bookTitle,
          textLength: params.text.length,
        },
      });

      return response;
    } catch (error) {
      console.error("Error translating text:", error);
      throw new Error("Failed to translate text");
    }
  }

  /**
   * Define a word or phrase in context
   */
  async defineWord(params: {
    word: string;
    context: string;
    bookTitle: string;
    bookAuthor: string;
  }): Promise<string> {
    const cacheKey = hashInput(`lexome:define:${params.word}:${params.context}`);
    const cached = getJson<string>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = `You are a literary dictionary helping readers understand words in context.

Book: "${params.bookTitle}" by ${params.bookAuthor}

Word/Phrase: "${params.word}"
Context: "${params.context}"

Please provide:
1. The definition as used in this context
2. The etymology if interesting or relevant
3. How the meaning might differ from modern usage
4. Any literary or historical significance

Keep your response brief (1-2 paragraphs).`;

      const response = await generateText({
        model: "gpt-4",
        prompt,
        maxTokens: 300,
      });

      // Cache the result
      setJson(cacheKey, response);

      // Track telemetry
      trackTelemetry({
        event: "ai.define.word",
        properties: {
          bookTitle: params.bookTitle,
          word: params.word,
        },
      });

      return response;
    } catch (error) {
      console.error("Error defining word:", error);
      throw new Error("Failed to define word");
    }
  }

  /**
   * Generate a summary of a chapter or section
   */
  async summarizeSection(params: {
    text: string;
    bookTitle: string;
    bookAuthor: string;
    sectionTitle?: string;
  }): Promise<string> {
    const cacheKey = hashInput(`lexome:summarize:${params.text.substring(0, 1000)}:${params.bookTitle}`);
    const cached = getJson<string>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = `You are a literary assistant helping readers understand classic literature.

Book: "${params.bookTitle}" by ${params.bookAuthor}
${params.sectionTitle ? `Section: ${params.sectionTitle}` : ""}

Please provide a concise summary of this section covering:
1. Main events and plot developments
2. Character developments or revelations
3. Key themes explored
4. Important quotes or moments

Text to summarize:
${params.text.substring(0, 3000)}${params.text.length > 3000 ? "..." : ""}

Keep your summary concise (2-3 paragraphs).`;

      const response = await generateText({
        model: "gpt-4",
        prompt,
        maxTokens: 500,
      });

      // Cache the result
      setJson(cacheKey, response);

      // Track telemetry
      trackTelemetry({
        event: "ai.summarize.section",
        properties: {
          bookTitle: params.bookTitle,
          textLength: params.text.length,
        },
      });

      return response;
    } catch (error) {
      console.error("Error summarizing section:", error);
      throw new Error("Failed to generate summary");
    }
  }

  /**
   * Analyze a character
   */
  async analyzeCharacter(params: {
    characterName: string;
    bookTitle: string;
    bookAuthor: string;
    context?: string;
  }): Promise<string> {
    const cacheKey = hashInput(`lexome:character:${params.characterName}:${params.bookTitle}`);
    const cached = getJson<string>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = `You are a literary analyst helping readers understand character development.

Book: "${params.bookTitle}" by ${params.bookAuthor}
Character: ${params.characterName}
${params.context ? `Context: ${params.context}` : ""}

Please provide a character analysis covering:
1. Key personality traits and motivations
2. Role in the story and relationships with other characters
3. Character arc and development
4. Symbolic or thematic significance
5. Notable quotes or actions

Keep your analysis concise (2-3 paragraphs) and avoid major spoilers if possible.`;

      const response = await generateText({
        model: "gpt-4",
        prompt,
        maxTokens: 600,
      });

      // Cache the result
      setJson(cacheKey, response);

      // Track telemetry
      trackTelemetry({
        event: "ai.analyze.character",
        properties: {
          bookTitle: params.bookTitle,
          character: params.characterName,
        },
      });

      return response;
    } catch (error) {
      console.error("Error analyzing character:", error);
      throw new Error("Failed to analyze character");
    }
  }

  /**
   * Generate comprehension questions for a section
   */
  async generateQuestions(params: {
    text: string;
    bookTitle: string;
    bookAuthor: string;
  }): Promise<string[]> {
    const cacheKey = hashInput(`lexome:questions:${params.text.substring(0, 1000)}:${params.bookTitle}`);
    const cached = getJson<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = `You are an educational assistant helping readers engage deeply with literature.

Book: "${params.bookTitle}" by ${params.bookAuthor}

Text:
${params.text.substring(0, 2000)}${params.text.length > 2000 ? "..." : ""}

Generate 5 thought-provoking comprehension questions about this passage that encourage critical thinking. Include:
- Questions about plot and character motivations
- Questions about themes and symbolism
- Questions about literary techniques
- Questions connecting to broader context

Format: Return ONLY the questions, one per line, numbered 1-5.`;

      const response = await generateText({
        model: "gpt-4",
        prompt,
        maxTokens: 400,
      });

      // Parse questions from response
      const questions = response
        .split("\n")
        .filter((line) => line.match(/^\d+\./))
        .map((line) => line.replace(/^\d+\.\s*/, "").trim());

      // Cache the result
      setJson(cacheKey, questions);

      // Track telemetry
      trackTelemetry({
        event: "ai.generate.questions",
        properties: {
          bookTitle: params.bookTitle,
          questionCount: questions.length,
        },
      });

      return questions;
    } catch (error) {
      console.error("Error generating questions:", error);
      throw new Error("Failed to generate questions");
    }
  }

  /**
   * Get book recommendations based on reading history
   */
  async getRecommendations(params: {
    readBooks: Array<{ title: string; author: string; subjects: string[] }>;
    limit?: number;
  }): Promise<string> {
    try {
      const booksDescription = params.readBooks
        .slice(0, 10) // Limit to last 10 books
        .map((book) => `"${book.title}" by ${book.author} (${book.subjects.slice(0, 3).join(", ")})`)
        .join("\n");

      const prompt = `You are a literary recommendation engine specializing in classic literature from Project Gutenberg.

The reader has enjoyed these books:
${booksDescription}

Based on their reading history, recommend ${params.limit || 5} classic books from Project Gutenberg that they might enjoy. For each recommendation, briefly explain why it matches their interests.

Focus on:
- Similar themes, genres, or time periods
- Writing style and tone
- Subject matter and topics
- Historical or cultural connections

Format your response as a numbered list with title, author, and brief explanation for each.`;

      const response = await generateText({
        model: "gpt-4",
        prompt,
        maxTokens: 800,
      });

      // Track telemetry
      trackTelemetry({
        event: "ai.get.recommendations",
        properties: {
          booksCount: params.readBooks.length,
          recommendationsRequested: params.limit || 5,
        },
      });

      return response;
    } catch (error) {
      console.error("Error getting recommendations:", error);
      throw new Error("Failed to generate recommendations");
    }
  }
}

export const aiService = new AIService();
