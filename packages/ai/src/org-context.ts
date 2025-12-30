/**
 * Organizational Knowledge Base Context Builder
 * Builds contextual awareness for AI prompts from org goals, quests, outputs, and knowledge
 */

import { storage } from "@sb/storage";
import type { Goal, Quest, Questline, Task, OrgProfile, Pattern } from "@sb/schemas";

const GOAL_KIND = "goals";
const QUEST_KIND = "quests";
const QUESTLINE_KIND = "questlines";
const TASK_KIND = "tasks";
const OUTPUT_KIND = "outputs";
const KNOWLEDGE_CARD_KIND = "knowledge_cards";
const ORG_PROFILE_KIND = "org_profiles";
const PATTERN_KIND = "patterns";

export interface OrgContext {
  // Organizational profile (mission, values, tech stack, etc.)
  orgProfile?: {
    mission?: string;
    vision?: string;
    industry?: string;
    stage?: string;
    teamSize?: number;
    techStack?: string[];
    values?: string[];
    teamStructure?: string;
  };

  // Active goals summary
  activeGoals: Array<{
    title: string;
    scope_level?: string;
    problem?: string;
    outcome?: string;
    status: string;
    tags?: string[];
  }>;

  // Recent completed goals
  completedGoals: Array<{
    title: string;
    outcome?: string;
    completedAt?: string;
    tags?: string[];
  }>;

  // Active quests summary
  activeQuests: Array<{
    title: string;
    objective: string;
    goalTitle?: string;
    tags?: string[];
  }>;

  // Completed quests (recent)
  completedQuests: Array<{
    title: string;
    objective: string;
    completedAt?: string;
    tags?: string[];
  }>;

  // Key outputs/artifacts
  recentOutputs: Array<{
    type: string;
    title: string;
    tags?: string[];
  }>;

  // Knowledge cards (patterns, playbooks, lessons)
  knowledgeCards: Array<{
    card_type: string;
    title: string;
    summary: string;
    tags?: string[];
  }>;

  // Extracted patterns from the patterns table
  extractedPatterns: Array<{
    type: string;
    title: string;
    summary: string;
    confidence: string;
    tags?: string[];
  }>;

  // Organizational patterns (what works, what doesn't) - DEPRECATED, use extractedPatterns
  patterns: {
    successful: string[];
    challenges: string[];
  };
}

/**
 * Relevance scoring helper - scores items based on contextHint and tags
 */
function calculateRelevanceScore(
  item: { title: string; tags?: string[]; objective?: string; summary?: string },
  contextHint?: string,
  filterTags?: string[]
): number {
  let score = 0;

  // Exact tag match - highest priority
  if (filterTags && filterTags.length > 0 && item.tags) {
    const matchingTags = item.tags.filter(t => filterTags.includes(t));
    score += matchingTags.length * 10;
  }

  if (contextHint) {
    const hint = contextHint.toLowerCase();
    const text = `${item.title} ${item.objective || ""} ${item.summary || ""}`.toLowerCase();

    // Title contains hint
    if (item.title.toLowerCase().includes(hint)) {
      score += 10;
    }

    // Description/objective/summary contains hint
    if (text.includes(hint)) {
      score += 5;
    }

    // Tags contain hint
    if (item.tags?.some(t => t.toLowerCase().includes(hint))) {
      score += 7;
    }
  }

  return score;
}

/**
 * Build organizational context for AI prompts
 * Provides awareness of current goals, actions, and knowledge
 */
export async function buildOrgContext(
  orgId: string,
  options?: {
    // Filtering options for relevance-based selection
    contextHint?: string; // Semantic hint for filtering (e.g., "marketing", "infrastructure")
    tags?: string[]; // Filter by specific tags

    // Limits
    maxActiveGoals?: number;
    maxCompletedGoals?: number;
    maxActiveQuests?: number;
    maxCompletedQuests?: number;
    maxOutputs?: number;
    maxKnowledgeCards?: number;
    maxPatterns?: number;
  }
): Promise<OrgContext> {
  const {
    contextHint,
    tags: filterTags,
    maxActiveGoals = 10,
    maxCompletedGoals = 5,
    maxActiveQuests = 15,
    maxCompletedQuests = 10,
    maxOutputs = 10,
    maxKnowledgeCards = 10,
    maxPatterns = 10,
  } = options || {};

  try {
    // Fetch org profile
    let orgProfile: OrgContext["orgProfile"] = undefined;
    try {
      const profiles = await storage.list<OrgProfile>(
        ORG_PROFILE_KIND,
        (p) => p.orgId === orgId
      );
      if (profiles.length > 0) {
        const profile = profiles[0];
        orgProfile = {
          mission: profile.mission,
          vision: profile.vision,
          industry: profile.industry,
          stage: profile.stage,
          teamSize: profile.teamSize,
          techStack: profile.techStack,
          values: profile.values,
          teamStructure: profile.teamStructure,
        };
      }
    } catch (error) {
      console.warn("Could not fetch org profile:", error);
    }

    // Get all goals for the org
    const allGoals = await storage.list<Goal>(GOAL_KIND, (g) => g.orgId === orgId);

    // Separate active and completed goals
    let activeGoalsList = allGoals.filter(
      (g) => g.status === "active" || g.status === "ready" || g.status === "draft"
    );

    // Apply relevance scoring if contextHint or tags provided
    if (contextHint || filterTags) {
      activeGoalsList = activeGoalsList
        .map((g) => ({
          goal: g,
          score: calculateRelevanceScore(
            { title: g.title, tags: g.tags },
            contextHint,
            filterTags
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.goal);
    }

    const activeGoals = activeGoalsList.slice(0, maxActiveGoals).map((g) => ({
      title: g.title,
      scope_level: g.scope_level,
      problem: g.problem || g.spec_json?.problem,
      outcome: g.outcome || g.spec_json?.outcome,
      status: g.status,
      tags: g.tags,
    }));

    let completedGoalsList = allGoals
      .filter((g) => g.status === "done" || g.status === "archived")
      .sort((a, b) => {
        // Sort by updatedAt or createdAt descending
        const aTime = a.updatedAt || a.createdAt;
        const bTime = b.updatedAt || b.createdAt;
        return bTime.localeCompare(aTime);
      });

    // Apply relevance scoring if contextHint or tags provided
    if (contextHint || filterTags) {
      completedGoalsList = completedGoalsList
        .map((g) => ({
          goal: g,
          score: calculateRelevanceScore(
            { title: g.title, tags: g.tags },
            contextHint,
            filterTags
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.goal);
    }

    const completedGoals = completedGoalsList.slice(0, maxCompletedGoals).map((g) => ({
      title: g.title,
      outcome: g.outcome || g.spec_json?.outcome,
      completedAt: g.updatedAt || g.createdAt,
      tags: g.tags,
    }));

    // Get all quests for the org
    const allQuests = await storage.list<Quest>(QUEST_KIND, (q) => q.orgId === orgId);

    // Get questlines to map quests to goals
    const allQuestlines = await storage.list<Questline>(
      QUESTLINE_KIND,
      (ql) => ql.orgId === orgId
    );
    const questlineMap = new Map(allQuestlines.map((ql) => [ql.id, ql]));
    const goalMap = new Map(allGoals.map((g) => [g.id, g]));

    // Active quests
    let activeQuestsList = allQuests.filter(
      (q) => q.state === "unlocked" || q.state === "in-progress"
    );

    // Apply relevance scoring if contextHint or tags provided
    if (contextHint || filterTags) {
      activeQuestsList = activeQuestsList
        .map((q) => ({
          quest: q,
          score: calculateRelevanceScore(
            { title: q.title, objective: q.objective, tags: q.tags },
            contextHint,
            filterTags
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.quest);
    }

    const activeQuests = activeQuestsList.slice(0, maxActiveQuests).map((q) => {
      const questline = questlineMap.get(q.questlineId);
      const goal = questline ? goalMap.get(questline.goalId) : undefined;
      return {
        title: q.title,
        objective: q.objective,
        goalTitle: goal?.title,
        tags: q.tags,
      };
    });

    // Completed quests (recent)
    let completedQuestsList = allQuests
      .filter((q) => q.state === "completed" && q.completedAt)
      .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));

    // Apply relevance scoring if contextHint or tags provided
    if (contextHint || filterTags) {
      completedQuestsList = completedQuestsList
        .map((q) => ({
          quest: q,
          score: calculateRelevanceScore(
            { title: q.title, objective: q.objective, tags: q.tags },
            contextHint,
            filterTags
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.quest);
    }

    const completedQuests = completedQuestsList.slice(0, maxCompletedQuests).map((q) => {
      const questline = questlineMap.get(q.questlineId);
      const goal = questline ? goalMap.get(questline.goalId) : undefined;
      return {
        title: q.title,
        objective: q.objective,
        completedAt: q.completedAt,
        goalTitle: goal?.title,
        tags: q.tags,
      };
    });

    // Get outputs (artifacts produced)
    let recentOutputs: OrgContext["recentOutputs"] = [];
    try {
      const outputs = await storage.list<any>(OUTPUT_KIND, (o) => o.orgId === orgId);
      recentOutputs = outputs
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
        .slice(0, maxOutputs)
        .map((o) => ({
          type: o.type,
          title: o.title,
          tags: o.tags || [],
        }));
    } catch (error) {
      // Outputs table might not exist yet, that's okay
      console.warn("Could not fetch outputs:", error);
    }

    // Get knowledge cards
    let knowledgeCards: OrgContext["knowledgeCards"] = [];
    try {
      const cards = await storage.list<any>(
        KNOWLEDGE_CARD_KIND,
        (kc) => kc.orgId === orgId
      );
      knowledgeCards = cards
        .slice(0, maxKnowledgeCards)
        .map((kc) => ({
          card_type: kc.cardType || kc.card_type,
          title: kc.title,
          summary: kc.summary,
          tags: kc.tags || [],
        }));
    } catch (error) {
      // Knowledge cards table might not exist yet, that's okay
      console.warn("Could not fetch knowledge cards:", error);
    }

    // Get extracted patterns from the patterns table
    let extractedPatterns: OrgContext["extractedPatterns"] = [];
    try {
      const patterns = await storage.list<Pattern>(
        PATTERN_KIND,
        (p) => p.orgId === orgId && p.status === "active"
      );

      // Apply relevance scoring if contextHint or tags provided
      let relevantPatterns = patterns;
      if (contextHint || filterTags) {
        relevantPatterns = patterns
          .map((p) => ({
            pattern: p,
            score: calculateRelevanceScore(
              { title: p.title, summary: p.summary, tags: p.tags },
              contextHint,
              filterTags
            ),
          }))
          .sort((a, b) => b.score - a.score)
          .map((x) => x.pattern);
      } else {
        // Sort by impact and confidence if no filtering
        relevantPatterns = patterns.sort((a, b) => {
          const scoreA = (a.impactScore || 5) * (a.confidence === "high" ? 3 : a.confidence === "medium" ? 2 : 1);
          const scoreB = (b.impactScore || 5) * (b.confidence === "high" ? 3 : b.confidence === "medium" ? 2 : 1);
          return scoreB - scoreA;
        });
      }

      extractedPatterns = relevantPatterns.slice(0, maxPatterns).map((p) => ({
        type: p.type,
        title: p.title,
        summary: p.summary,
        confidence: p.confidence,
        tags: p.tags,
      }));
    } catch (error) {
      console.warn("Could not fetch patterns:", error);
    }

    // Extract patterns from knowledge cards (legacy support)
    const successful: string[] = [];
    const challenges: string[] = [];

    // Patterns from knowledge cards
    knowledgeCards.forEach((card) => {
      if (card.card_type === "pattern" || card.card_type === "lesson") {
        if (
          card.summary.toLowerCase().includes("success") ||
          card.summary.toLowerCase().includes("worked")
        ) {
          successful.push(card.title);
        }
        if (
          card.summary.toLowerCase().includes("challenge") ||
          card.summary.toLowerCase().includes("failed") ||
          card.summary.toLowerCase().includes("issue")
        ) {
          challenges.push(card.title);
        }
      }
    });

    return {
      orgProfile,
      activeGoals,
      completedGoals,
      activeQuests,
      completedQuests,
      recentOutputs,
      knowledgeCards,
      extractedPatterns,
      patterns: {
        successful: successful.slice(0, 5),
        challenges: challenges.slice(0, 5),
      },
    };
  } catch (error) {
    console.error("[buildOrgContext] Error building context for orgId:", orgId, error);
    // Return empty context instead of throwing, so the system can still function
    // This allows the UI to show that context exists but is empty
    return {
      orgProfile: undefined,
      activeGoals: [],
      completedGoals: [],
      activeQuests: [],
      completedQuests: [],
      recentOutputs: [],
      knowledgeCards: [],
      extractedPatterns: [],
      patterns: {
        successful: [],
        challenges: [],
      },
    };
  }
}

/**
 * Format org context as a compact string for inclusion in prompts
 */
export function formatOrgContext(context: OrgContext, maxChars: number = 3000): string {
  const parts: string[] = [];

  // Organizational profile
  if (context.orgProfile) {
    parts.push("ORGANIZATION:");
    if (context.orgProfile.mission) {
      parts.push(`Mission: ${context.orgProfile.mission}`);
    }
    if (context.orgProfile.industry || context.orgProfile.stage) {
      parts.push(
        `Industry: ${context.orgProfile.industry || "N/A"} | Stage: ${context.orgProfile.stage || "N/A"}`
      );
    }
    if (context.orgProfile.techStack && context.orgProfile.techStack.length > 0) {
      parts.push(`Tech Stack: ${context.orgProfile.techStack.join(", ")}`);
    }
    if (context.orgProfile.values && context.orgProfile.values.length > 0) {
      parts.push(`Values: ${context.orgProfile.values.join(", ")}`);
    }
    if (context.orgProfile.teamStructure) {
      parts.push(`Team Structure: ${context.orgProfile.teamStructure}`);
    }
    parts.push("");
  }

  // Extracted patterns (new table)
  if (context.extractedPatterns.length > 0) {
    parts.push("ORGANIZATIONAL PATTERNS (LEARNED):");
    context.extractedPatterns.forEach((p) => {
      parts.push(
        `- [${p.type}] ${p.title}: ${p.summary.substring(0, 100)} (${p.confidence} confidence)`
      );
    });
    parts.push("");
  }

  // Active goals
  if (context.activeGoals.length > 0) {
    parts.push("ACTIVE GOALS:");
    context.activeGoals.forEach((g) => {
      let line = `- ${g.title}`;
      if (g.scope_level) line += ` [${g.scope_level}]`;
      if (g.problem) line += ` | Problem: ${g.problem.substring(0, 100)}`;
      if (g.outcome) line += ` | Outcome: ${g.outcome.substring(0, 100)}`;
      parts.push(line);
    });
    parts.push("");
  }

  // Recent completed goals
  if (context.completedGoals.length > 0) {
    parts.push("RECENTLY COMPLETED GOALS:");
    context.completedGoals.forEach((g) => {
      let line = `- ${g.title}`;
      if (g.outcome) line += ` | ${g.outcome.substring(0, 100)}`;
      parts.push(line);
    });
    parts.push("");
  }

  // Active quests
  if (context.activeQuests.length > 0) {
    parts.push("ACTIVE QUESTS:");
    context.activeQuests.slice(0, 10).forEach((q) => {
      parts.push(`- ${q.title}: ${q.objective.substring(0, 80)}`);
    });
    parts.push("");
  }

  // Recent outputs
  if (context.recentOutputs.length > 0) {
    parts.push("RECENT ARTIFACTS:");
    context.recentOutputs.forEach((o) => {
      parts.push(`- [${o.type}] ${o.title}`);
    });
    parts.push("");
  }

  // Knowledge patterns
  if (context.patterns.successful.length > 0 || context.patterns.challenges.length > 0) {
    parts.push("ORGANIZATIONAL PATTERNS:");
    if (context.patterns.successful.length > 0) {
      parts.push("What works:");
      context.patterns.successful.forEach((p) => parts.push(`  - ${p}`));
    }
    if (context.patterns.challenges.length > 0) {
      parts.push("Challenges:");
      context.patterns.challenges.forEach((p) => parts.push(`  - ${p}`));
    }
    parts.push("");
  }

  // Knowledge cards summary
  if (context.knowledgeCards.length > 0) {
    parts.push("KNOWLEDGE BASE:");
    context.knowledgeCards.slice(0, 5).forEach((kc) => {
      parts.push(`- [${kc.card_type}] ${kc.title}: ${kc.summary.substring(0, 100)}`);
    });
  }

  const fullText = parts.join("\n");
  
  // Truncate if too long
  if (fullText.length > maxChars) {
    return fullText.substring(0, maxChars) + "\n...[truncated]";
  }
  
  return fullText;
}

