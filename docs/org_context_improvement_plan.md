# Organizational Context Enhancement Plan

## Goal
Build a comprehensive "organizational brain" that makes AI responses maximally relevant by providing rich, contextual awareness of the organization's state, knowledge, and patterns.

## Current State
- Basic context from Goals, Quests, Outputs, Knowledge Cards
- Recency-based selection (not relevance-based)
- ~3000 char limit for token efficiency
- Integration in clarify/decompose/level-up prompts

## Enhancement Roadmap

### Phase 1: Foundation Enrichment (Week 1)

#### 1.1 Add Organizational Profile
**Why:** AI needs to understand the org's identity, not just its current work

**Implementation:**
```typescript
// packages/schemas/src/identity.ts
export interface OrgProfile {
  orgId: string;
  name: string;
  mission: string;
  vision: string;
  industry: string; // "SaaS", "E-commerce", "Consulting"
  stage: "startup" | "growth" | "scale" | "enterprise";
  size: number; // team size

  // Technical context
  techStack: string[]; // ["TypeScript", "React", "Supabase", "OpenAI"]
  architecture: string; // "monorepo", "microservices", etc.
  repositories: string[]; // ["SignalCore", "SignalDocs"]

  // Cultural context
  values: string[]; // ["Move fast", "Customer-first", "Quality over speed"]
  decisionFramework?: string; // "Data-driven", "Consensus-based"
  qualityStandards?: string; // "Tests required", "Code review mandatory"

  // Process context
  teamStructure: "functional" | "pods" | "matrix" | "flat";
  sprintLength?: number; // days
  currentCycle?: string; // "Q4 2025", "Sprint 12"

  createdAt: string;
  updatedAt: string;
}
```

**Changes:**
- Add `org_profiles` table in Supabase
- Create `/settings/org-profile` UI to edit this
- Include in `buildOrgContext()`

**Impact:** AI understands company DNA, makes culturally-aligned suggestions

---

#### 1.2 Enhanced Pattern Learning
**Why:** Current pattern extraction is keyword-matching only. Need AI-powered analysis.

**Implementation:**
```typescript
// packages/ai/src/pattern-extraction.ts

export interface ExtractedPattern {
  id: string;
  orgId: string;
  type: "success_pattern" | "antipattern" | "process_insight" | "risk_pattern";
  title: string;
  summary: string;
  context: string; // When/where this applies
  evidence: Array<{
    type: "goal" | "quest" | "output";
    id: string;
    title: string;
  }>;
  confidence: "low" | "medium" | "high";
  tags: string[];
  impactScore?: number; // 1-10

  createdAt: string;
  createdFrom: string; // "goal-123", "manual"
  extractedBy: "ai" | "manual";
}

// Extract patterns when goals complete
export async function extractPatternsFromGoal(
  goal: Goal,
  relatedQuests: Quest[]
): Promise<ExtractedPattern[]> {
  const prompt = `Analyze this completed goal and extract learnings:

Goal: ${goal.title}
Outcome: ${goal.outcome}
Completion time: ${goal.completedDuration}
Original estimate: ${goal.estimatedDuration}
Blockers encountered: ${goal.blockers?.join(", ")}
Quests completed: ${relatedQuests.map(q => q.title).join(", ")}

Extract:
1. What worked well (success patterns)
2. What didn't work (antipatterns)
3. Process insights
4. Risks to watch for

Return as JSON array of patterns.`;

  // Call AI to extract patterns
  // Store in patterns table
}
```

**Changes:**
- Add `patterns` table
- Run pattern extraction on goal completion
- Surface patterns in org context
- Add UI to view/edit/approve patterns

**Impact:** AI learns from actual execution, not just keywords

---

#### 1.3 Relevance-Based Context Selection
**Why:** Recency ≠ Relevance. Marketing questions should get marketing context.

**Implementation:**
```typescript
// packages/ai/src/org-context.ts

export async function buildOrgContext(
  orgId: string,
  options?: {
    // NEW: Semantic filtering
    contextHint?: string; // "marketing", "infrastructure", "sales"
    tags?: string[]; // Filter by specific tags
    relatedGoalId?: string; // Get context related to a specific goal

    // Existing
    maxActiveGoals?: number;
    maxCompletedGoals?: number;
    // ...
  }
): Promise<OrgContext> {
  // If contextHint provided, score and rank items by relevance
  if (options?.contextHint) {
    activeGoals = await scoreAndRankByRelevance(
      activeGoals,
      options.contextHint
    );
  }

  // If tags provided, filter first
  if (options?.tags?.length) {
    activeGoals = activeGoals.filter(g =>
      g.tags?.some(t => options.tags!.includes(t))
    );
  }

  // ... rest of logic
}

// Score items by semantic relevance
async function scoreAndRankByRelevance<T extends { title: string; tags?: string[] }>(
  items: T[],
  contextHint: string
): Promise<T[]> {
  // Simple approach: keyword/tag matching
  // Advanced approach: Use embeddings for semantic similarity

  return items
    .map(item => ({
      item,
      score: calculateRelevanceScore(item, contextHint)
    }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);
}

function calculateRelevanceScore(
  item: { title: string; tags?: string[] },
  hint: string
): number {
  let score = 0;

  // Title contains hint
  if (item.title.toLowerCase().includes(hint.toLowerCase())) {
    score += 10;
  }

  // Tags match
  if (item.tags?.some(t => t.toLowerCase().includes(hint.toLowerCase()))) {
    score += 5;
  }

  // Could add more sophisticated scoring:
  // - Embedding similarity (if we have embeddings)
  // - TF-IDF scoring
  // - Related entities

  return score;
}
```

**Changes:**
- Modify `buildOrgContext()` signature
- Add scoring logic
- Update call sites to pass `contextHint`

**Impact:** AI gets relevant context, not just recent context

---

### Phase 2: Team & Temporal Context (Week 2)

#### 2.1 Team Context in Org Context
**Why:** Understanding who can do what is critical for planning

**Implementation:**
```typescript
interface TeamContext {
  totalMembers: number;
  activeMembers: number; // Not on vacation, etc.

  skillMatrix: Array<{
    skill: string;
    memberCount: number;
    members: string[]; // emails or names
  }>;

  capacity: {
    level: "low" | "medium" | "high";
    availableHours: number; // This sprint/cycle
    allocatedHours: number;
    utilizationPercent: number;
  };

  recentContributions: Array<{
    memberEmail: string;
    memberName: string;
    completedQuests: number; // Last 2 weeks
    pointsEarned: number;
  }>;

  bottlenecks: Array<{
    type: "person" | "skill";
    name: string;
    overloadPercent: number; // e.g., 150% allocated
  }>;
}

// Add to OrgContext
export interface OrgContext {
  // ... existing fields
  teamContext: TeamContext;
}

// Build team context
async function buildTeamContext(orgId: string): Promise<TeamContext> {
  // Get members from identity
  const members = await storage.list("users", u => u.orgId === orgId);

  // Get recent quest completions
  const recentQuests = await storage.list("quests", q =>
    q.orgId === orgId &&
    q.state === "completed" &&
    q.completedAt &&
    new Date(q.completedAt) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  );

  // Build skill matrix from member profiles
  // Calculate capacity from sprint data
  // Identify bottlenecks

  return teamContext;
}
```

**Impact:** AI suggests realistic task assignments based on actual capacity

---

#### 2.2 Time & Cadence Awareness
**Why:** Understanding cycles, momentum, and timing improves planning

**Implementation:**
```typescript
interface CadenceContext {
  currentCycle: {
    name: string; // "Sprint 12", "Q4 2025"
    type: "sprint" | "quarter" | "month";
    startDate: string;
    endDate: string;
    daysRemaining: number;
    theme?: string; // "Feature development", "Bug bash", "Planning"
  };

  velocity: {
    questsPerCycle: number; // Average from last 3 cycles
    pointsPerCycle: number;
    completionRate: number; // % of planned work completed
    trend: "increasing" | "stable" | "decreasing";
  };

  upcomingDeadlines: Array<{
    title: string;
    date: string;
    daysUntil: number;
    linkedGoalId?: string;
  }>;

  seasonality?: {
    current: string; // "High season", "Planning period"
    impact: string; // "Reduced capacity", "Full steam"
  };
}

// Add to OrgContext
export interface OrgContext {
  // ... existing fields
  cadence: CadenceContext;
}
```

**Impact:** AI understands timing constraints and can warn about capacity

---

### Phase 3: Knowledge Graph & Cross-Referencing (Week 3-4)

#### 3.1 Build Relationship Graph
**Why:** Context isn't flat - things relate to each other

**Implementation:**
```typescript
interface RelationshipGraph {
  // Goal clustering
  goalClusters: Array<{
    theme: string;
    goalIds: string[];
    sharedTags: string[];
    centerOfGravity: string; // Most central goal
  }>;

  // Quest chains (sequential or thematic)
  questChains: Array<{
    chainId: string;
    questIds: string[];
    narrative: string;
    type: "sequential" | "parallel" | "thematic";
  }>;

  // Output usage tracking
  artifactImpact: Array<{
    outputId: string;
    outputTitle: string;
    usedInGoals: string[];
    usedInQuests: string[];
    references: number;
    impactScore: number;
  }>;

  // Knowledge card connections
  knowledgeWeb: Array<{
    cardId: string;
    relatedCards: string[];
    appliedInGoals: string[];
    createdFromGoals: string[];
  }>;
}

// Build relationship graph
async function buildRelationshipGraph(orgId: string): Promise<RelationshipGraph> {
  // Cluster goals by tags, domain, scope
  const goalClusters = await clusterGoalsByTheme(orgId);

  // Identify quest chains
  const questChains = await identifyQuestChains(orgId);

  // Track output usage
  const artifactImpact = await analyzeOutputUsage(orgId);

  // Map knowledge connections
  const knowledgeWeb = await buildKnowledgeWeb(orgId);

  return {
    goalClusters,
    questChains,
    artifactImpact,
    knowledgeWeb
  };
}
```

**Impact:** AI can reference related work, avoid duplication, suggest reuse

---

#### 3.2 Semantic Search with Embeddings
**Why:** True semantic understanding, not just keyword matching

**Implementation:**
```typescript
// packages/ai/src/embeddings.ts

interface EmbeddingRecord {
  id: string;
  entityType: "goal" | "quest" | "output" | "knowledge_card" | "pattern";
  entityId: string;
  text: string; // The text that was embedded
  embedding: number[]; // OpenAI embedding vector
  createdAt: string;
}

// Generate embeddings for key entities
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Store embeddings when entities are created/updated
export async function embedEntity(
  entityType: string,
  entityId: string,
  text: string
): Promise<void> {
  const embedding = await generateEmbedding(text);
  await storage.create("embeddings", {
    id: `emb-${Date.now()}`,
    entityType,
    entityId,
    text,
    embedding,
    createdAt: new Date().toISOString(),
  });
}

// Find similar entities
export async function findSimilarEntities(
  queryText: string,
  entityType?: string,
  limit: number = 10
): Promise<Array<{ entityId: string; similarity: number }>> {
  const queryEmbedding = await generateEmbedding(queryText);

  // Get all embeddings (or filtered by type)
  const embeddings = await storage.list("embeddings", e =>
    entityType ? e.entityType === entityType : true
  );

  // Calculate cosine similarity
  const similarities = embeddings.map(e => ({
    entityId: e.entityId,
    similarity: cosineSimilarity(queryEmbedding, e.embedding),
  }));

  // Sort by similarity and return top N
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

// Cosine similarity calculation
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**Changes:**
- Add `embeddings` table
- Generate embeddings on entity create/update
- Use embeddings in `buildOrgContext` for relevance scoring
- Add Supabase pgvector extension for efficient similarity search

**Impact:** True semantic search - find related content even with different wording

---

### Phase 4: Dynamic Context Optimization (Week 4+)

#### 4.1 Token Budget Optimization
**Why:** Different prompts need different context depth

**Implementation:**
```typescript
export async function buildOrgContext(
  orgId: string,
  options?: {
    // NEW: Dynamic sizing
    tokenBudget?: number; // Max tokens to use (default: ~3000 chars / 750 tokens)
    prioritize?: "breadth" | "depth"; // Many items or detailed items

    // ... existing options
  }
): Promise<OrgContext> {
  const budget = options?.tokenBudget || 750;
  const mode = options?.prioritize || "breadth";

  if (mode === "breadth") {
    // Include more items with less detail
    return buildBreadthContext(orgId, budget);
  } else {
    // Include fewer items with more detail
    return buildDepthContext(orgId, budget);
  }
}

// Iteratively add context until budget is reached
async function buildBreadthContext(
  orgId: string,
  tokenBudget: number
): Promise<OrgContext> {
  const context: Partial<OrgContext> = {};
  let tokensUsed = 0;

  // Priority order of context sections
  const sections = [
    () => addOrgProfile(context),
    () => addActiveGoals(context, 5),
    () => addTopPatterns(context, 3),
    () => addActiveQuests(context, 10),
    () => addRecentOutputs(context, 5),
    // ... more sections
  ];

  for (const section of sections) {
    const newContext = section();
    const newTokens = estimateTokens(formatOrgContext(newContext));

    if (tokensUsed + newTokens <= tokenBudget) {
      Object.assign(context, newContext);
      tokensUsed += newTokens;
    } else {
      break; // Budget exceeded
    }
  }

  return context as OrgContext;
}
```

**Impact:** Maximize context relevance within token constraints

---

#### 4.2 Context Caching
**Why:** Building context is expensive, cache when possible

**Implementation:**
```typescript
// Cache org context snapshots
interface CachedContext {
  orgId: string;
  context: OrgContext;
  generatedAt: string;
  ttl: number; // seconds
}

export async function buildOrgContext(
  orgId: string,
  options?: { /* ... */ }
): Promise<OrgContext> {
  // Check cache first
  const cacheKey = `org-context:${orgId}`;
  const cached = await cache.get<CachedContext>(cacheKey);

  if (cached && Date.now() - new Date(cached.generatedAt).getTime() < cached.ttl * 1000) {
    return cached.context;
  }

  // Build fresh context
  const context = await buildFreshContext(orgId, options);

  // Cache for 5 minutes
  await cache.set(cacheKey, {
    orgId,
    context,
    generatedAt: new Date().toISOString(),
    ttl: 300,
  });

  return context;
}

// Invalidate cache when org changes
export async function invalidateOrgContext(orgId: string): Promise<void> {
  const cacheKey = `org-context:${orgId}`;
  await cache.delete(cacheKey);
}
```

**Impact:** Faster context generation, reduced cost

---

## Summary of Enhancements

| Enhancement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| Org Profile | High - Establishes company DNA | Medium | P0 |
| Enhanced Patterns | High - AI learns from execution | Medium | P0 |
| Relevance Selection | High - Right context, not just recent | Low | P0 |
| Team Context | Medium - Better task assignment | Medium | P1 |
| Cadence Awareness | Medium - Timing-aware planning | Low | P1 |
| Relationship Graph | High - Avoid duplication, enable reuse | High | P1 |
| Semantic Search | Very High - True semantic understanding | High | P2 |
| Token Optimization | Medium - Maximize relevance in budget | Medium | P2 |
| Context Caching | Low - Performance optimization | Low | P2 |

## Metrics to Track

1. **Context Relevance Score** - User feedback on AI response quality
2. **Context Utilization** - How much of context is actually used in AI responses
3. **Duplication Avoidance Rate** - How often AI prevents duplicate work
4. **Pattern Application Rate** - How often extracted patterns are referenced
5. **Response Time** - With and without caching
6. **Token Efficiency** - Relevant context per token used

## Next Steps

1. ✅ Review and approve this plan
2. Create tracking issues for each phase
3. Start with Phase 1 (Foundation Enrichment)
4. Measure impact before moving to next phase
5. Iterate based on feedback

---

*This plan transforms the org context from a simple "recent items" snapshot into a true organizational memory system that learns, adapts, and provides maximally relevant context for AI-powered planning and execution.*
