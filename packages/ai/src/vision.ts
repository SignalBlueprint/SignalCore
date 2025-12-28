/**
 * OpenAI Vision integration for product image analysis
 */

import "@sb/config";
import OpenAI from "openai";
import type { VisionAnalysis } from "@sb/schemas";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY environment variable is not set. Make sure .env file exists in the repository root with OPENAI_API_KEY set."
    );
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export interface AnalyzeProductImageOptions {
  imageUrl?: string;
  imageBase64?: string;
  detailLevel?: "low" | "high" | "auto";
  customPrompt?: string;
}

/**
 * Analyze a product image using OpenAI Vision
 */
export async function analyzeProductImage(
  options: AnalyzeProductImageOptions
): Promise<VisionAnalysis> {
  const { imageUrl, imageBase64, detailLevel = "high", customPrompt } = options;

  if (!imageUrl && !imageBase64) {
    throw new Error("Either imageUrl or imageBase64 must be provided");
  }

  const openai = getOpenAIClient();

  // Build image content
  let imageContent: string;
  if (imageBase64) {
    // Ensure proper data URI format
    const base64Data = imageBase64.includes("base64,")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;
    imageContent = base64Data;
  } else {
    imageContent = imageUrl!;
  }

  // Default prompt for product analysis
  const defaultPrompt = `Analyze this product image and extract the following information in JSON format:

{
  "detectedName": "The product name or what it appears to be",
  "description": "A detailed description of the product",
  "category": "Product category (e.g., 'Electronics', 'Clothing', 'Home & Garden')",
  "colors": ["Primary color", "Secondary color"],
  "materials": ["Material 1", "Material 2"],
  "condition": "Product condition (new, like new, good, fair, poor)",
  "suggestedPrice": estimated price in USD (number),
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": confidence level 0-1
}

Be as detailed and accurate as possible. If you cannot determine a field, omit it or set it to null.`;

  const prompt = customPrompt || defaultPrompt;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: imageContent,
                detail: detailLevel,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in vision response");
    }

    const parsed = JSON.parse(content);

    // Map to VisionAnalysis interface
    const analysis: VisionAnalysis = {
      detectedName: parsed.detectedName,
      description: parsed.description,
      category: parsed.category,
      colors: parsed.colors,
      materials: parsed.materials,
      condition: parsed.condition,
      suggestedPrice: parsed.suggestedPrice,
      tags: parsed.tags,
      confidence: parsed.confidence,
      rawAnalysis: content,
    };

    return analysis;
  } catch (error) {
    console.error("OpenAI Vision API error:", error);
    throw new Error(
      `Vision analysis failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate product description from image
 */
export async function generateProductDescription(
  imageUrl: string
): Promise<string> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Write a compelling, professional product description for this item. Focus on key features, benefits, and what makes it appealing. Keep it concise but persuasive (2-3 paragraphs).",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * Generate vector embedding for product search
 */
export async function generateProductEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Create searchable text from product data
 */
export function createProductSearchText(product: {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  visionAnalysis?: VisionAnalysis;
}): string {
  const parts: string[] = [product.name];

  if (product.description) {
    parts.push(product.description);
  }

  if (product.category) {
    parts.push(product.category);
  }

  if (product.tags && product.tags.length > 0) {
    parts.push(product.tags.join(" "));
  }

  if (product.visionAnalysis) {
    const va = product.visionAnalysis;
    if (va.detectedName) parts.push(va.detectedName);
    if (va.category) parts.push(va.category);
    if (va.colors) parts.push(va.colors.join(" "));
    if (va.materials) parts.push(va.materials.join(" "));
    if (va.tags) parts.push(va.tags.join(" "));
  }

  return parts.join(" ");
}
