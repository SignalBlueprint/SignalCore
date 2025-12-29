# Goal Creation Update - Strategic Packets

## Summary

The goal creation system has been updated to use the new **Strategic Packets** structure. All goals now use a complete Goal Spec instead of the old level-based system.

## What Changed

### 1. Goal Interface Updated

The `Goal` interface in `packages/schemas/src/questboard.ts` now includes:
- `spec_json`: Complete Goal Spec structure
- `scope_level`: "company" | "program" | "team" | "individual"
- `owner_role_id`: Role that owns the goal
- `stakeholder_role_ids`: Array of stakeholder roles
- Individual spec fields for querying (problem, outcome, metrics_json, etc.)
- Cascade fields (cascade_plan_json, cascade_children_count, etc.)

### 2. `createGoal` Function Updated

The `createGoal` function now:
- Creates goals with a minimal `spec_json` structure
- Sets default `scope_level` to "program" if not specified
- Initializes all new Strategic Packets fields
- Maintains backward compatibility with legacy fields

**New Signature:**
```typescript
createGoal(
  title: string,
  orgId?: string,
  options?: {
    scope_level?: "company" | "program" | "team" | "individual";
    owner_role_id?: string;
    parent_goal_id?: string | null;
  }
)
```

### 3. `createHierarchicalGoal` Function Updated

The `createHierarchicalGoal` function now:
- Maps legacy `level` parameter to `scope_level`
- Creates goals with proper `spec_json` structure
- Defaults to "draft" status (was "active")
- Maintains backward compatibility

**New Signature:**
```typescript
createHierarchicalGoal(
  orgId: string,
  title: string,
  parentGoalId?: string | null,
  level?: number,
  options?: {
    scope_level?: "company" | "program" | "team" | "individual";
    owner_role_id?: string;
  }
)
```

### 4. API Endpoint Updated

The `/api/goals` POST endpoint now accepts:
- `scope_level` (optional)
- `owner_role_id` (optional)
- `parent_goal_id` (optional)

## How Goals Are Created Now

### Basic Goal Creation

```typescript
// Simple goal (defaults to "program" scope)
const goal = await createGoal("Close first 5 paying clients", "org-123");

// Goal with scope and owner
const goal = await createGoal(
  "Close first 5 paying clients",
  "org-123",
  {
    scope_level: "program",
    owner_role_id: "role-uuid-123"
  }
);
```

### Goal with Parent (Cascade)

```typescript
const childGoal = await createGoal(
  "Build outreach system",
  "org-123",
  {
    scope_level: "team",
    owner_role_id: "role-uuid-456",
    parent_goal_id: "parent-goal-uuid"
  }
);
```

## Goal Spec Structure

Every goal now has a `spec_json` field with this structure:

```typescript
{
  title: string;
  scope_level: "company" | "program" | "team" | "individual";
  owner_role_id: string;
  stakeholder_role_ids?: string[];
  problem: string;              // To be filled
  outcome: string;               // To be filled
  metrics: Array<{               // Need 2-5 metrics
    name: string;
    target: number | string;
    window: string;
  }>;
  milestones: Array<{
    title: string;
    due_date?: string;
  }>;
  plan_markdown: string;         // To be filled
  dependencies?: string[];
  risks?: string[];
  required_outputs?: Array<{
    type: "doc" | "code" | "template" | "asset" | "decision" | "metric_snapshot";
    name: string;
  }>;
}
```

## Goal Status Flow

Goals now follow this flow:
- `draft` → `ready` (spec-complete) → `active` → `done` / `archived`

Goals start as `draft` and automatically transition to `ready` when:
1. Spec is complete (all required fields filled)
2. Cascade requirements are met (if applicable)

## Next Steps

1. **Update UI Forms**: Goal creation forms should collect:
   - Scope level
   - Owner role
   - Problem statement
   - Outcome
   - Metrics (2-5)
   - Plan
   - Dependencies & risks
   - Required outputs

2. **Spec Completeness UI**: Show a checklist of required fields:
   - ✅ Problem
   - ✅ Outcome
   - ✅ Metrics (2-5)
   - ✅ Owner role
   - ✅ Milestones
   - ✅ Plan

3. **Cascade UI**: For parent goals, show:
   - "Generate Cascade" button
   - Cascade requirements (min/max children)
   - Child goals list

4. **Role Management**: Create roles before creating goals:
   - Use the `roles` table
   - Assign users to roles via `org_members`

## Backward Compatibility

- Legacy fields (`level`, `ownerUserId`, etc.) are preserved
- Old goals will continue to work
- Migration can happen gradually
- Storage layer automatically converts camelCase ↔ snake_case

## Database Fields

The storage layer automatically converts:
- `spec_json` → `spec_json` (JSONB)
- `scope_level` → `scope_level` (TEXT)
- `owner_role_id` → `owner_role_id` (TEXT)
- `stakeholder_role_ids` → `stakeholder_role_ids` (TEXT[])
- `metrics_json` → `metrics_json` (JSONB)
- etc.

All fields match the migration schema in `006_strategic_packets_refactor.sql`.

