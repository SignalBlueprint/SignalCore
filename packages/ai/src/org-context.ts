/**
 * Organizational Knowledge Base Context Builder
 * Builds contextual awareness for AI prompts from org goals, quests, outputs, and knowledge
 */

import { storage } from "@sb/storage";
import type { Goal, Quest, Questline, Task } from "@sb/schemas";

const GOAL_KIND = "goals";
const QUEST_KIND = "quests";
const QUESTLINE_KIND = "questlines";
const TASK_KIND = "tasks";
const OUTPUT_KIND = "outputs";
const KNOWLEDGE_CARD_KIND = "knowledge_cards";

export interface OrgContext {
  // Active goals summary
  activeGoals: Array<{
    title: string;
    scope_level?: string;
    problem?: string;
    outcome?: string;
    status: string;
  }>;
  
  // Recent completed goals
  completedGoals: Array<{
    title: string;
    outcome?: string;
    completedAt?: string;
  }>;
  
  // Active quests summary
  activeQuests: Array<{
    title: string;
    objective: string;
    goalTitle?: string;
  }>;
  
  // Completed quests (recent)
  completedQuests: Array<{
    title: string;
    objective: string;
    completedAt?: string;
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
  
  // Organizational patterns (what works, what doesn't)
  patterns: {
    successful: string[];
    challenges: string[];
  };
}

/**
 * Build organizational context for AI prompts
 * Provides awareness of current goals, actions, and knowledge
 */
export async function buildOrgContext(
  orgId: string,
  options?: {
    maxActiveGoals?: number;
    maxCompletedGoals?: number;
    maxActiveQuests?: number;
    maxCompletedQuests?: number;
    maxOutputs?: number;
    maxKnowledgeCards?: number;
  }
): Promise<OrgContext> {
  const {
    maxActiveGoals = 10,
    maxCompletedGoals = 5,
    maxActiveQuests = 15,
    maxCompletedQuests = 10,
    maxOutputs = 10,
    maxKnowledgeCards = 10,
  } = options || {};

  try {
    // Get all goals for the org
    const allGoals = await storage.list<Goal>(GOAL_KIND, (g) => g.orgId === orgId);
  
    // Separate active and completed goals
    const activeGoals = allGoals
      .filter((g) => g.status === "active" || g.status === "ready" || g.status === "draft")
      .slice(0, maxActiveGoals)
      .map((g) => ({
        title: g.title,
        scope_level: g.scope_level,
        problem: g.problem || g.spec_json?.problem,
        outcome: g.outcome || g.spec_json?.outcome,
        status: g.status,
      }));

    const completedGoals = allGoals
      .filter((g) => g.status === "done" || g.status === "archived")
      .sort((a, b) => {
        // Sort by updatedAt or createdAt descending
        const aTime = a.updatedAt || a.createdAt;
        const bTime = b.updatedAt || b.createdAt;
        return bTime.localeCompare(aTime);
      })
      .slice(0, maxCompletedGoals)
      .map((g) => ({
        title: g.title,
        outcome: g.outcome || g.spec_json?.outcome,
        completedAt: g.updatedAt || g.createdAt,
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
    const activeQuests = allQuests
      .filter((q) => q.state === "unlocked" || q.state === "in-progress")
      .slice(0, maxActiveQuests)
      .map((q) => {
        const questline = questlineMap.get(q.questlineId);
        const goal = questline ? goalMap.get(questline.goalId) : undefined;
        return {
          title: q.title,
          objective: q.objective,
          goalTitle: goal?.title,
        };
      });

    // Completed quests (recent)
    const completedQuests = allQuests
      .filter((q) => q.state === "completed" && q.completedAt)
      .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
      .slice(0, maxCompletedQuests)
      .map((q) => {
        const questline = questlineMap.get(q.questlineId);
        const goal = questline ? goalMap.get(questline.goalId) : undefined;
        return {
          title: q.title,
          objective: q.objective,
          completedAt: q.completedAt,
          goalTitle: goal?.title,
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

    // Extract patterns from knowledge cards and completed goals
    const successful: string[] = [];
    const challenges: string[] = [];

    // Patterns from knowledge cards
    knowledgeCards.forEach((card) => {
      if (card.card_type === "pattern" || card.card_type === "lesson") {
        if (card.summary.toLowerCase().includes("success") || 
            card.summary.toLowerCase().includes("worked")) {
          successful.push(card.title);
        }
        if (card.summary.toLowerCase().includes("challenge") ||
            card.summary.toLowerCase().includes("failed") ||
            card.summary.toLowerCase().includes("issue")) {
          challenges.push(card.title);
        }
      }
    });

    return {
      activeGoals,
      completedGoals,
      activeQuests,
      completedQuests,
      recentOutputs,
      knowledgeCards,
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
      activeGoals: [],
      completedGoals: [],
      activeQuests: [],
      completedQuests: [],
      recentOutputs: [],
      knowledgeCards: [],
      patterns: {
        successful: [],
        challenges: [],
      },
    };
  }
} catch (error) {
    console.error("[buildOrgContext] Error building context for orgId:", orgId, error);
    // Return empty context instead of throwing, so the system can still function
    // This allows the UI to show that context exists but is empty
    return {
      activeGoals: [],
      completedGoals: [],
      activeQuests: [],
      completedQuests: [],
      recentOutputs: [],
      knowledgeCards: [],
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

