/**
 * Website generation engine
 * Orchestrates AI content generation and HTML generation
 */

import { SiteProject, GeneratedSite } from "@sb/schemas";
import { generateWebsiteContent } from "./ai-content-generator";
import { generateHTML } from "./html-generator";
import { publish } from "@sb/events";

export interface GenerationResult {
  success: boolean;
  generatedSite?: GeneratedSite;
  error?: string;
}

/**
 * Generate a complete website for a project
 */
export async function generateWebsite(
  project: SiteProject
): Promise<GenerationResult> {
  try {
    console.log(`[generation-engine] Starting generation for project: ${project.id}`);

    // Publish generation started event
    await publish(
      "siteforge.generation.started",
      {
        projectId: project.id,
        businessName: project.businessName,
        niche: project.niche,
      },
      {
        sourceApp: "siteforge",
      }
    );

    // Step 1: Generate content using AI
    console.log(`[generation-engine] Generating AI content...`);
    const contentResult = await generateWebsiteContent({
      businessName: project.businessName,
      domain: project.domain,
      niche: project.niche,
      notes: project.notes,
    });

    console.log(
      `[generation-engine] AI content generated (cached: ${contentResult.cached})`
    );

    // Apply content overrides if they exist
    let components = contentResult.components;
    if (project.contentOverrides) {
      console.log(`[generation-engine] Applying content overrides...`);
      components = contentResult.components.map((component) => {
        const override = project.contentOverrides?.[component.id];
        if (override) {
          return {
            ...component,
            content: {
              ...component.content,
              ...override,
            },
          };
        }
        return component;
      });
    }

    // Step 2: Generate HTML from components
    console.log(`[generation-engine] Generating HTML...`);
    const html = generateHTML(
      contentResult.metadata,
      components,
      project.businessName,
      project.templateStyle || "modern",
      project.industryType,
      project.colorScheme
    );

    console.log(
      `[generation-engine] HTML generated (${html.length} characters)`
    );

    // Step 3: Create the generated site object
    const generatedSite: GeneratedSite = {
      html,
      metadata: contentResult.metadata,
      components, // Use components with overrides applied
      generatedAt: new Date().toISOString(),
    };

    // Publish generation completed event
    await publish(
      "siteforge.generation.completed",
      {
        projectId: project.id,
        businessName: project.businessName,
        componentsCount: contentResult.components.length,
        htmlSize: html.length,
        cached: contentResult.cached,
      },
      {
        sourceApp: "siteforge",
      }
    );

    console.log(`[generation-engine] Generation completed for project: ${project.id}`);

    return {
      success: true,
      generatedSite,
    };
  } catch (error) {
    console.error(`[generation-engine] Generation failed:`, error);

    // Publish generation failed event
    await publish(
      "siteforge.generation.failed",
      {
        projectId: project.id,
        businessName: project.businessName,
        error: error instanceof Error ? error.message : String(error),
      },
      {
        sourceApp: "siteforge",
      }
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
