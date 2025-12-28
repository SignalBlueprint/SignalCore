/**
 * Image generation abstraction
 * Supports multiple image generation services with a unified interface
 */

import "@sb/config";
import OpenAI from "openai";

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

export interface GenerateImageOptions {
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
  model?: "dall-e-3" | "dall-e-2";
}

export interface GeneratedImage {
  url: string;
  revisedPrompt?: string;
}

/**
 * Image generation service interface
 */
export interface ImageGenerationService {
  generate(options: GenerateImageOptions): Promise<GeneratedImage>;
}

/**
 * DALL-E implementation (OpenAI)
 */
export class DallEService implements ImageGenerationService {
  private openai: OpenAI;

  constructor() {
    this.openai = getOpenAIClient();
  }

  async generate(options: GenerateImageOptions): Promise<GeneratedImage> {
    const {
      prompt,
      size = "1024x1024",
      quality = "standard",
      style = "natural",
      model = "dall-e-3",
    } = options;

    try {
      const response = await this.openai.images.generate({
        model,
        prompt,
        size,
        quality,
        style,
        n: 1,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No image data in response");
      }

      const image = response.data[0];
      if (!image || !image.url) {
        throw new Error("No image URL in response");
      }

      return {
        url: image.url,
        revisedPrompt: image.revised_prompt,
      };
    } catch (error) {
      console.error("DALL-E generation error:", error);
      throw new Error(
        `Image generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Placeholder for custom image generation service
 * This can be replaced with your preferred service (e.g., "nano banana", Midjourney, Stable Diffusion, etc.)
 */
export class CustomImageService implements ImageGenerationService {
  async generate(options: GenerateImageOptions): Promise<GeneratedImage> {
    // TODO: Implement your custom image generation service here
    // For now, fall back to DALL-E
    console.warn(
      "CustomImageService not implemented, falling back to DALL-E"
    );
    const dalleService = new DallEService();
    return dalleService.generate(options);
  }
}

/**
 * Get the configured image generation service
 */
export function getImageGenerationService(): ImageGenerationService {
  const serviceType = process.env.IMAGE_GENERATION_SERVICE || "dalle";

  switch (serviceType.toLowerCase()) {
    case "dalle":
    case "openai":
      return new DallEService();
    case "custom":
      return new CustomImageService();
    default:
      console.warn(
        `Unknown image generation service: ${serviceType}, falling back to DALL-E`
      );
      return new DallEService();
  }
}

/**
 * Generate a clean product shot from a product description
 */
export async function generateProductShot(
  productName: string,
  productDescription: string,
  options?: Partial<GenerateImageOptions>
): Promise<GeneratedImage> {
  const service = getImageGenerationService();

  // Create a prompt for a clean product shot
  const prompt = `Professional product photography of ${productName}. ${productDescription}. Clean white background, studio lighting, high quality commercial photography, centered composition, sharp focus.`;

  return service.generate({
    prompt,
    size: "1024x1024",
    quality: "hd",
    style: "natural",
    ...options,
  });
}

/**
 * Generate a lifestyle product shot
 */
export async function generateLifestyleShot(
  productName: string,
  productDescription: string,
  scene: string,
  options?: Partial<GenerateImageOptions>
): Promise<GeneratedImage> {
  const service = getImageGenerationService();

  const prompt = `${productName} in a ${scene}. ${productDescription}. Lifestyle photography, natural lighting, realistic, professional quality.`;

  return service.generate({
    prompt,
    size: "1024x1024",
    quality: "hd",
    style: "natural",
    ...options,
  });
}

/**
 * Improve/regenerate product image based on original
 */
export async function improveProductImage(
  productName: string,
  originalAnalysis: string,
  improvements?: string
): Promise<GeneratedImage> {
  const service = getImageGenerationService();

  const improvementText = improvements
    ? `Improvements: ${improvements}.`
    : "";

  const prompt = `Professional product photography of ${productName}. Based on: ${originalAnalysis}. ${improvementText} Clean background, studio lighting, commercial quality, high resolution.`;

  return service.generate({
    prompt,
    size: "1024x1024",
    quality: "hd",
    style: "natural",
  });
}
