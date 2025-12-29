# Organizational Knowledge Base

## Overview

The Organizational Knowledge Base provides contextual awareness to AI prompts, making them specific to your organization and informed about current goals, actions, and knowledge.

## How It Works

When AI functions (clarify, decompose, level-up) are called, they now automatically:

1. **Build Organizational Context** - Gathers information about:
   - Active goals (with scope levels, problems, outcomes)
   - Recently completed goals
   - Active quests and their objectives
   - Completed quests
   - Recent outputs/artifacts
   - Knowledge cards (patterns, playbooks, lessons)
   - Organizational patterns (what works, what doesn't)

2. **Format for Prompts** - Context is formatted into a compact, readable string that's included in AI prompts

3. **Enhance AI Responses** - The AI uses this context to:
   - Reference similar goals and patterns
   - Avoid duplicating work
   - Learn from past successes and challenges
   - Suggest relevant artifacts and knowledge
   - Make recommendations specific to your organization

## Usage

### Automatic (Recommended)

The knowledge base is automatically used when you call AI functions with an `orgId`:

```typescript
// Clarify goal with org context
const clarifyOutput = await runClarifyGoal(goalTitle, { 
  orgId: "org-123" 
});

// Decompose goal with org context
const decomposeOutput = await runDecomposeGoal(
  goalId, 
  clarifiedGoal, 
  teamSnapshot,
  { orgId: "org-123" }
);

// Level up goal with org context
const levelUpResponse = await runLevelUpGoal(goal, {
  orgId: "org-123"
});
```

### Manual Context Building

You can also build and format context manually:

```typescript
import { buildOrgContext, formatOrgContext } from "@sb/ai";

// Build context
const context = await buildOrgContext("org-123", {
  maxActiveGoals: 10,
  maxCompletedGoals: 5,
  maxActiveQuests: 15,
  maxCompletedQuests: 10,
  maxOutputs: 10,
  maxKnowledgeCards: 10,
});

// Format for use in prompts
const contextText = formatOrgContext(context, 3000);
```

## Context Structure

The `OrgContext` includes:

```typescript
{
  activeGoals: Array<{
    title: string;
    scope_level?: string;
    problem?: string;
    outcome?: string;
    status: string;
  }>;
  
  completedGoals: Array<{
    title: string;
    outcome?: string;
    completedAt?: string;
  }>;
  
  activeQuests: Array<{
    title: string;
    objective: string;
    goalTitle?: string;
  }>;
  
  completedQuests: Array<{
    title: string;
    objective: string;
    completedAt?: string;
  }>;
  
  recentOutputs: Array<{
    type: string;
    title: string;
    tags?: string[];
  }>;
  
  knowledgeCards: Array<{
    card_type: string;
    title: string;
    summary: string;
    tags?: string[];
  }>;
  
  patterns: {
    successful: string[];
    challenges: string[];
  };
}
```

## What Gets Included in Prompts

The formatted context includes:

1. **ACTIVE GOALS** - Current goals with scope, problem, and outcome
2. **RECENTLY COMPLETED GOALS** - What was recently accomplished
3. **ACTIVE QUESTS** - Current work in progress
4. **RECENT ARTIFACTS** - Outputs and deliverables
5. **ORGANIZATIONAL PATTERNS** - What works and what challenges exist
6. **KNOWLEDGE BASE** - Playbooks, patterns, lessons learned

## Benefits

### 1. Contextual Awareness
AI understands your organization's current state:
- What goals are active
- What work is in progress
- What has been completed
- What patterns exist

### 2. Avoid Duplication
AI can reference existing goals and avoid creating duplicates:
- "Similar to Goal X, but with focus on Y"
- "This builds on the work from Goal Z"

### 3. Learn from Patterns
AI learns from your organizational patterns:
- "Based on successful pattern A, we should..."
- "Previous challenge B suggests we need to..."

### 4. Reference Artifacts
AI can suggest relevant outputs and knowledge:
- "Use the template from Output X"
- "Reference the playbook in Knowledge Card Y"

### 5. Organization-Specific
All recommendations are tailored to your organization's:
- Current goals and priorities
- Team structure and capabilities
- Past successes and challenges
- Available knowledge and artifacts

## Example Prompt Enhancement

**Before (without context):**
```
Clarify this goal: "Build a marketing website"
```

**After (with context):**
```
Clarify this goal: "Build a marketing website"

ORGANIZATIONAL CONTEXT:
ACTIVE GOALS:
- Close first 5 paying clients [program] | Problem: We need proof of paid demand
- Build outreach system [team] | Outcome: Automated daily outreach queue

RECENT ARTIFACTS:
- [template] Outreach email v1
- [code] Demo generator module

ORGANIZATIONAL PATTERNS:
What works:
  - Automated outreach sequences
  - Demo-first approach
Challenges:
  - Low reply rates
  - Deliverability issues
```

## Performance

- Context is built on-demand (not cached by default)
- Context size is limited (default ~3000 chars) to stay within token limits
- Only recent/relevant items are included
- Gracefully handles missing tables (outputs, knowledge_cards)

## Future Enhancements

1. **Caching** - Cache org context snapshots for faster access
2. **Incremental Updates** - Update context incrementally as org changes
3. **Semantic Search** - Use embeddings to find most relevant context
4. **Context Summarization** - AI-generated summaries of org state
5. **Custom Context Sources** - Add custom context sources (docs, wikis, etc.)

## Integration Points

The knowledge base integrates with:

- **Goals** - Active and completed goals
- **Quests** - Current and past quests
- **Outputs** - Artifacts produced (from Strategic Packets refactor)
- **Knowledge Cards** - Compiled knowledge (from Strategic Packets refactor)
- **Team Snapshots** - Team structure and capabilities

## API Reference

### `buildOrgContext(orgId, options?)`

Builds organizational context for an org.

**Parameters:**
- `orgId: string` - Organization ID
- `options?: { maxActiveGoals?, maxCompletedGoals?, maxActiveQuests?, maxCompletedQuests?, maxOutputs?, maxKnowledgeCards? }`

**Returns:** `Promise<OrgContext>`

### `formatOrgContext(context, maxChars?)`

Formats org context as a compact string for prompts.

**Parameters:**
- `context: OrgContext` - Context to format
- `maxChars?: number` - Maximum characters (default: 3000)

**Returns:** `string`

