/**
 * Lead Enrichment Job
 * Background job to analyze and enrich leads with AI intelligence
 */

import { storage } from "@sb/storage";
import { Lead } from "@sb/schemas";
import { analyzeLeadIntelligence, calculateIntelligenceScore } from "../scoring/intelligenceService";
import { calculateLeadScore } from "../scoring/scoringEngine";
import { publish } from "@sb/events";

/**
 * Options for lead enrichment job
 */
export interface EnrichLeadsJobOptions {
  // Maximum number of leads to enrich in one run
  batchSize?: number;

  // Only enrich leads that haven't been analyzed yet
  onlyNew?: boolean;

  // Maximum age of leads to enrich (in days)
  maxAgeDays?: number;

  // Specific org to enrich (for multi-tenant environments)
  orgId?: string;

  // Force re-enrichment even if already analyzed
  force?: boolean;
}

/**
 * Results from enrichment job
 */
export interface EnrichmentJobResult {
  totalProcessed: number;
  enriched: number;
  skipped: number;
  errors: number;
  duration: number;
  leadIds: string[];
  errorDetails: Array<{ leadId: string; error: string }>;
}

/**
 * Run lead enrichment job
 * Analyzes leads with AI and updates their scores
 */
export async function runLeadEnrichmentJob(
  options: EnrichLeadsJobOptions = {}
): Promise<EnrichmentJobResult> {
  const {
    batchSize = 10,
    onlyNew = true,
    maxAgeDays = 90,
    orgId,
    force = false,
  } = options;

  const startTime = Date.now();
  const result: EnrichmentJobResult = {
    totalProcessed: 0,
    enriched: 0,
    skipped: 0,
    errors: 0,
    duration: 0,
    leadIds: [],
    errorDetails: [],
  };

  console.log("[enrichLeads] Starting lead enrichment job", {
    batchSize,
    onlyNew,
    maxAgeDays,
    orgId,
    force,
  });

  try {
    // Fetch all leads from storage
    const allLeads = await storage.list<Lead>("leads", (lead) => {
      // Filter by org if specified
      if (orgId && lead.orgId !== orgId) {
        return false;
      }

      // Filter by age
      if (maxAgeDays) {
        const createdAt = new Date(lead.createdAt);
        const now = new Date();
        const ageDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays > maxAgeDays) {
          return false;
        }
      }

      // Only include leads that need enrichment
      if (onlyNew && !force) {
        // Skip if already has intelligence data
        if (lead.intelligence) {
          return false;
        }
      }

      return true;
    });

    console.log(`[enrichLeads] Found ${allLeads.length} leads to process`);

    // Limit to batch size
    const leadsToProcess = allLeads.slice(0, batchSize);

    // Process each lead
    for (const lead of leadsToProcess) {
      result.totalProcessed++;

      try {
        console.log(`[enrichLeads] Processing lead ${lead.id} (${lead.companyName || lead.url})`);

        // Calculate base score
        const baseScore = calculateLeadScore(lead);

        // Run AI intelligence analysis
        const intelligence = await analyzeLeadIntelligence(lead, {
          useCache: true, // Use cache to avoid redundant API calls
        });

        // Calculate intelligence-boosted score
        const finalScore = calculateIntelligenceScore(baseScore, intelligence);

        // Update the lead
        const updated: Lead = {
          ...lead,
          score: finalScore,
          intelligence,
          updatedAt: new Date().toISOString(),
        };

        await storage.upsert("leads", updated);

        // Publish event
        await publish(
          "lead.scored",
          {
            leadId: lead.id,
            score: finalScore,
            previousScore: lead.score,
            source: lead.source,
            autoScored: true,
            enriched: true,
            qualificationLevel: intelligence.qualificationLevel,
          },
          {
            sourceApp: "leadscout",
            orgId: lead.orgId,
          }
        );

        result.enriched++;
        result.leadIds.push(lead.id);

        console.log(`[enrichLeads] Successfully enriched lead ${lead.id} (score: ${finalScore})`);

        // Add a small delay between AI calls to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        result.errors++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errorDetails.push({
          leadId: lead.id,
          error: errorMessage,
        });
        console.error(`[enrichLeads] Error enriching lead ${lead.id}:`, errorMessage);
      }
    }

    result.skipped = allLeads.length - leadsToProcess.length;
  } catch (error) {
    console.error("[enrichLeads] Fatal error in enrichment job:", error);
    throw error;
  }

  result.duration = Date.now() - startTime;

  console.log("[enrichLeads] Job completed", {
    totalProcessed: result.totalProcessed,
    enriched: result.enriched,
    skipped: result.skipped,
    errors: result.errors,
    duration: result.duration,
  });

  // Publish job completion event
  await publish(
    "job.completed",
    {
      jobType: "lead-enrichment",
      result,
    },
    {
      sourceApp: "leadscout",
    }
  );

  return result;
}

/**
 * CLI entry point for running enrichment job
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const batchSize = args.includes("--batch-size")
    ? parseInt(args[args.indexOf("--batch-size") + 1], 10)
    : 10;
  const force = args.includes("--force");
  const orgId = args.includes("--org")
    ? args[args.indexOf("--org") + 1]
    : undefined;

  runLeadEnrichmentJob({ batchSize, force, orgId })
    .then((result) => {
      console.log("✓ Enrichment job completed successfully");
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error("✗ Enrichment job failed:", error);
      process.exit(1);
    });
}
