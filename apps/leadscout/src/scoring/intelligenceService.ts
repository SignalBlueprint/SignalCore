/**
 * AI-Powered Lead Intelligence Service
 * Uses OpenAI to analyze leads and provide qualification insights
 */

import "@sb/config";
import OpenAI from "openai";
import { hashInput, getJson, setJson } from "@sb/cache";
import { publish } from "@sb/events";
import { recordAiCall } from "@sb/telemetry";
import { Lead } from "@sb/schemas";

/**
 * Lead intelligence data structure
 */
export interface LeadIntelligence {
  // Company profile
  companySize?: "startup" | "small" | "medium" | "enterprise" | "unknown";
  industry?: string;
  estimatedRevenue?: string;
  fundingStatus?: "bootstrapped" | "seed" | "series-a" | "series-b+" | "public" | "unknown";

  // Qualification insights
  qualificationLevel: "high" | "medium" | "low";
  qualificationReason: string;
  keyInsights: string[];

  // Technology profile
  techStack?: string[];

  // Risk factors
  riskFactors: string[];
  opportunities: string[];

  // Recommended actions
  recommendedActions: string[];

  // Confidence and metadata
  confidence: number; // 0-100
  analyzedAt: string;
  modelUsed: string;
}

/**
 * Schema for AI-generated intelligence (for structured outputs)
 */
const LeadIntelligenceSchema = {
  name: "lead_intelligence",
  strict: true,
  schema: {
    type: "object",
    properties: {
      companySize: {
        type: "string",
        enum: ["startup", "small", "medium", "enterprise", "unknown"],
      },
      industry: { type: "string" },
      estimatedRevenue: { type: "string" },
      fundingStatus: {
        type: "string",
        enum: ["bootstrapped", "seed", "series-a", "series-b+", "public", "unknown"],
      },
      qualificationLevel: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
      qualificationReason: { type: "string" },
      keyInsights: {
        type: "array",
        items: { type: "string" },
      },
      techStack: {
        type: "array",
        items: { type: "string" },
      },
      riskFactors: {
        type: "array",
        items: { type: "string" },
      },
      opportunities: {
        type: "array",
        items: { type: "string" },
      },
      recommendedActions: {
        type: "array",
        items: { type: "string" },
      },
      confidence: { type: "number" },
    },
    required: [
      "companySize",
      "qualificationLevel",
      "qualificationReason",
      "keyInsights",
      "riskFactors",
      "opportunities",
      "recommendedActions",
      "confidence",
    ],
    additionalProperties: false,
  },
};

/**
 * Get OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY environment variable is not set. Make sure .env file exists with OPENAI_API_KEY."
    );
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Analyze a lead using AI to generate intelligence insights
 */
export async function analyzeLeadIntelligence(
  lead: Lead,
  options: { useCache?: boolean; model?: string } = {}
): Promise<LeadIntelligence> {
  const { useCache = true, model = "gpt-4o-mini" } = options;

  // Create cache key from lead URL and company name
  const cacheKey = `lead-intelligence:${lead.url}:${lead.companyName || ""}`;
  const inputHash = hashInput(cacheKey);
  const startTime = Date.now();

  // Check cache first
  if (useCache) {
    const cached = getJson<Omit<LeadIntelligence, "analyzedAt" | "modelUsed">>(inputHash);
    if (cached !== null) {
      recordAiCall({
        model,
        inputHash,
        cached: true,
        duration: Date.now() - startTime,
      });

      await publish(
        "ai.run",
        {
          model,
          inputHash,
          cached: true,
          duration: Date.now() - startTime,
          context: "lead-intelligence",
        },
        { sourceApp: "leadscout" }
      );

      return {
        ...cached,
        analyzedAt: new Date().toISOString(),
        modelUsed: model,
      };
    }
  }

  // Prepare prompt for AI analysis
  const systemPrompt = `You are an expert B2B lead qualification analyst. Your job is to analyze company information and provide detailed intelligence insights to help sales teams prioritize and approach leads effectively.

Analyze the provided lead information and return a comprehensive intelligence report including:
- Company size and industry classification
- Estimated revenue range and funding status
- Qualification level (high/medium/low) with clear reasoning
- Key insights about the company
- Technology stack if detectable from domain/context
- Risk factors that might affect the sale
- Opportunities for engagement
- Recommended next actions for sales team

Be specific, actionable, and realistic in your analysis. If information is not available, use "unknown" or leave arrays empty rather than guessing.`;

  const userPrompt = `Analyze this lead:
Company Name: ${lead.companyName || "Not provided"}
Website URL: ${lead.url}
Lead Source: ${lead.source}
Current Status: ${lead.status}
Existing Score: ${lead.score || "Not scored"}
Notes: ${lead.notes || "None"}

Provide a detailed intelligence analysis for this lead.`;

  try {
    const openai = getOpenAIClient();

    // Call OpenAI with structured outputs
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: LeadIntelligenceSchema as any,
      },
      max_tokens: 1500,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    const aiResult = JSON.parse(content);

    // Build final intelligence object
    const intelligence: LeadIntelligence = {
      ...aiResult,
      analyzedAt: new Date().toISOString(),
      modelUsed: model,
    };

    // Store in cache
    if (useCache) {
      const { analyzedAt, modelUsed, ...cacheable } = intelligence;
      setJson(inputHash, cacheable);
    }

    // Record telemetry
    recordAiCall({
      model,
      inputHash,
      cached: false,
      duration: Date.now() - startTime,
    });

    await publish(
      "ai.run",
      {
        model,
        inputHash,
        cached: false,
        duration: Date.now() - startTime,
        context: "lead-intelligence",
        leadId: lead.id,
      },
      { sourceApp: "leadscout", orgId: lead.orgId }
    );

    return intelligence;
  } catch (error) {
    console.error("Error analyzing lead intelligence:", error);

    // Return a fallback intelligence object
    return {
      companySize: "unknown",
      qualificationLevel: "medium",
      qualificationReason: "Unable to analyze - AI service unavailable",
      keyInsights: ["Analysis pending - AI service error"],
      riskFactors: ["Unable to assess risks"],
      opportunities: [],
      recommendedActions: ["Manual review required"],
      confidence: 0,
      analyzedAt: new Date().toISOString(),
      modelUsed: model,
    };
  }
}

/**
 * Calculate an intelligence-boosted score
 * Combines base score with AI intelligence insights
 */
export function calculateIntelligenceScore(
  baseScore: number,
  intelligence: LeadIntelligence
): number {
  let adjustedScore = baseScore;

  // Boost based on qualification level
  if (intelligence.qualificationLevel === "high") {
    adjustedScore += 15;
  } else if (intelligence.qualificationLevel === "low") {
    adjustedScore -= 15;
  }

  // Boost based on company size (enterprise is more valuable)
  if (intelligence.companySize === "enterprise") {
    adjustedScore += 10;
  } else if (intelligence.companySize === "medium") {
    adjustedScore += 5;
  }

  // Adjust based on funding status
  if (intelligence.fundingStatus === "series-b+" || intelligence.fundingStatus === "public") {
    adjustedScore += 8;
  } else if (intelligence.fundingStatus === "series-a") {
    adjustedScore += 5;
  }

  // Penalty for high risk factors
  if (intelligence.riskFactors.length > 2) {
    adjustedScore -= 5;
  }

  // Boost for opportunities
  if (intelligence.opportunities.length > 2) {
    adjustedScore += 5;
  }

  // Apply confidence factor
  const confidenceFactor = intelligence.confidence / 100;
  adjustedScore = baseScore + (adjustedScore - baseScore) * confidenceFactor;

  // Normalize to 0-100
  return Math.min(100, Math.max(0, Math.round(adjustedScore)));
}
