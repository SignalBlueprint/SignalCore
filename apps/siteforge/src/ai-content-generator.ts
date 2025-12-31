/**
 * AI-powered content generation for websites
 */

import "@sb/config";
import OpenAI from "openai";
import { hashInput, getJson, setJson } from "@sb/cache";
import { publish } from "@sb/events";
import { recordAiCall } from "@sb/telemetry";
import { PageComponent, ComponentType, SiteMetadata } from "@sb/schemas";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface GenerationInput {
  businessName: string;
  domain: string;
  niche: string;
  notes?: string;
}

interface ContentGenerationResult {
  metadata: SiteMetadata;
  components: PageComponent[];
  cached: boolean;
}

/**
 * Generate website content using AI
 */
export async function generateWebsiteContent(
  input: GenerationInput
): Promise<ContentGenerationResult> {
  const { businessName, domain, niche, notes } = input;

  // Create cache key
  const cacheKey = `siteforge:${businessName}:${niche}:${notes || ""}`;
  const inputHash = hashInput(cacheKey);
  const startTime = Date.now();

  // Check cache first
  const cached = getJson<ContentGenerationResult>(inputHash);
  if (cached !== null) {
    recordAiCall({
      model: "gpt-4o-mini",
      inputHash,
      cached: true,
      duration: Date.now() - startTime,
    });

    await publish(
      "ai.run",
      {
        model: "gpt-4o-mini",
        inputHash,
        cached: true,
        duration: Date.now() - startTime,
      },
      {
        sourceApp: "siteforge",
      }
    );

    return { ...cached, cached: true };
  }

  // Generate content with AI
  const openai = getOpenAIClient();

  const systemPrompt = `You are an expert web content creator and copywriter. Generate compelling, professional website content for businesses.
Your content should be:
- Professional and engaging
- Tailored to the business niche
- SEO-optimized with relevant keywords
- Action-oriented with clear CTAs
- Focused on benefits and value propositions`;

  const userPrompt = `Generate website content for:
Business Name: ${businessName}
Domain: ${domain}
Industry/Niche: ${niche}
${notes ? `Additional Notes: ${notes}` : ""}

Create content for these sections:
1. Hero (main heading, subheading, CTA)
2. About (company story and mission)
3. Features/Services (3-4 key offerings)
4. Pricing (3 pricing tiers if applicable, or skip if not suitable for this niche)
5. Testimonials (2-3 customer quotes)
6. Contact/CTA (final call to action)

Also generate:
- SEO metadata (title, description, keywords)
- Brand color scheme (primary color)

Return the content in a structured JSON format.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content generated from AI");
  }

  const parsed = JSON.parse(content);

  // Transform AI response into our schema
  const components: PageComponent[] = [];
  let order = 0;

  // Hero section
  if (parsed.hero) {
    components.push({
      id: `hero-${Date.now()}`,
      type: "hero" as ComponentType,
      content: {
        heading: parsed.hero.heading || `Welcome to ${businessName}`,
        subheading: parsed.hero.subheading || `${niche} excellence`,
        body: parsed.hero.body,
        buttonText: parsed.hero.buttonText || "Get Started",
        buttonLink: parsed.hero.buttonLink || "#contact",
        backgroundColor: parsed.colors?.primary || "#3B82F6",
        textColor: "#FFFFFF",
      },
      order: order++,
    });
  }

  // About section
  if (parsed.about) {
    components.push({
      id: `about-${Date.now()}`,
      type: "about" as ComponentType,
      content: {
        heading: parsed.about.heading || "About Us",
        subheading: parsed.about.subheading,
        body: parsed.about.body || `${businessName} is a leading provider in ${niche}.`,
      },
      order: order++,
    });
  }

  // Features/Services section
  if (parsed.features || parsed.services) {
    const featuresData = parsed.features || parsed.services;
    components.push({
      id: `features-${Date.now()}`,
      type: "features" as ComponentType,
      content: {
        heading: featuresData.heading || "Our Services",
        subheading: featuresData.subheading,
        items: (featuresData.items || []).map((item: any) => ({
          title: item.title || item.name,
          description: item.description,
          icon: item.icon || "⭐",
        })),
      },
      order: order++,
    });
  }

  // Pricing section (if applicable)
  if (parsed.pricing && parsed.pricing.tiers && parsed.pricing.tiers.length > 0) {
    components.push({
      id: `pricing-${Date.now()}`,
      type: "pricing" as ComponentType,
      content: {
        heading: parsed.pricing.heading || "Pricing",
        subheading: parsed.pricing.subheading || "Choose the plan that fits your needs",
        items: parsed.pricing.tiers.map((tier: any) => ({
          title: tier.name || tier.title,
          description: tier.description,
          price: tier.price,
        })),
      },
      order: order++,
    });
  }

  // Testimonials section
  if (parsed.testimonials) {
    components.push({
      id: `testimonials-${Date.now()}`,
      type: "testimonials" as ComponentType,
      content: {
        heading: parsed.testimonials.heading || "What Our Clients Say",
        items: (parsed.testimonials.items || []).map((item: any) => ({
          description: item.quote || item.description,
          title: item.author || item.name,
        })),
      },
      order: order++,
    });
  }

  // CTA section
  if (parsed.cta || parsed.contact) {
    const ctaData = parsed.cta || parsed.contact;
    components.push({
      id: `cta-${Date.now()}`,
      type: "cta" as ComponentType,
      content: {
        heading: ctaData.heading || "Ready to Get Started?",
        subheading: ctaData.subheading || "Contact us today",
        buttonText: ctaData.buttonText || "Contact Us",
        buttonLink: ctaData.buttonLink || "#contact",
        backgroundColor: parsed.colors?.primary || "#3B82F6",
        textColor: "#FFFFFF",
      },
      order: order++,
    });
  }

  // Footer
  components.push({
    id: `footer-${Date.now()}`,
    type: "footer" as ComponentType,
    content: {
      body: `© ${new Date().getFullYear()} ${businessName}. All rights reserved.`,
    },
    order: order++,
  });

  // Generate metadata
  const metadata: SiteMetadata = {
    title: parsed.seo?.title || `${businessName} - ${niche}`,
    description:
      parsed.seo?.description ||
      `Professional ${niche} services by ${businessName}`,
    keywords: parsed.seo?.keywords || [niche, businessName, "professional"],
    themeColor: parsed.colors?.primary || "#3B82F6",
  };

  const result: ContentGenerationResult = {
    metadata,
    components,
    cached: false,
  };

  // Store in cache
  setJson(inputHash, result);

  // Record AI call
  recordAiCall({
    model: "gpt-4o-mini",
    inputHash,
    cached: false,
    duration: Date.now() - startTime,
  });

  await publish(
    "ai.run",
    {
      model: "gpt-4o-mini",
      inputHash,
      cached: false,
      duration: Date.now() - startTime,
    },
    {
      sourceApp: "siteforge",
    }
  );

  return result;
}
