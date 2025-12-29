# Strategic Packets Refactor

This document describes the refactored goal system that treats goals as "Strategic Packets" with full specs, organizational hierarchy, cascading goals, and a knowledge pool.

## Overview

The refactor moves from goal-leveling (L0-L5) to a single "Goal Spec" model where every goal must be fully-fleshed before it can become active. Leveling is now handled at the organizational level (roles, programs, playbooks).

## Key Changes

### 1. Goal Spec Structure

Every goal is now a complete "Level 5" spec stored in `spec_json`. The spec must include:

- **Problem**: What problem are we solving?
- **Outcome**: What success looks like
- **Metrics** (2-5): Measurable targets with windows
- **Scope**: Organization level + owner + stakeholders
- **Plan**: Milestones + timeline + markdown
- **Dependencies**: What must exist first
- **Risks**: Known blockers or concerns
- **Required Outputs**: Artifacts that must exist to count as done

### 2. Goal Status Flow

```
draft → ready (spec-complete) → active → done / archived
```

- **draft**: Goal is being created/edited
- **ready**: Spec is complete and passes validation; cascade requirements met (if any)
- **active**: Goal is in progress
- **done**: Goal completed successfully
- **archived**: Goal cancelled or superseded

### 3. Organizational Hierarchy

Roles define position and scope:

- **company**: Owner/CEO, Strategy roles
- **program**: Operator, Architect roles
- **team**: Builder, Tester roles
- **individual**: Performer roles

Each role has:
- `scope_level`: company|program|team|individual
- `reports_to_role_id`: Hierarchical reporting
- `permissions_json`: Role-based permissions

### 4. Goal Cascading

Higher-scope goals spawn child goals at the next level down:

- **company goal** → 2-5 **program goals**
- **program goal** → 3-7 **team goals**
- **team goal** → 5-20 **individual goals/quest bundles**

A parent goal cannot be "active" unless its cascade plan exists and required children are created.

### 5. Outputs & Knowledge Pool

**Outputs** are first-class artifacts produced by quests/goals:
- Types: doc, code, template, asset, decision, metric_snapshot
- Linked to goals/quests
- Tagged and searchable

**Knowledge Cards** are auto-generated from outputs:
- Types: sop, playbook, pattern, lesson, pitch, snippet
- Compile into reusable company knowledge
- Used for onboarding, playbooks, case studies

## Example Goal Spec JSON

```json
{
  "title": "Close first 5 paying clients",
  "scope_level": "program",
  "owner_role_id": "role-uuid-123",
  "stakeholder_role_ids": ["role-uuid-456", "role-uuid-789"],
  "problem": "We need proof of paid demand.",
  "outcome": "5 active subscriptions generating MRR.",
  "metrics": [
    { "name": "paying_clients", "target": 5, "window": "rolling_30d" },
    { "name": "mrr", "target": 1000, "window": "monthly" }
  ],
  "milestones": [
    { "title": "Offer finalized", "due_date": "2026-01-10" },
    { "title": "Pitch assets ready", "due_date": "2026-01-12" }
  ],
  "plan_markdown": "Longer plan here…",
  "dependencies": ["Lead Scout v1 live", "Demo generator stable"],
  "risks": ["Low reply rate", "Deliverability issues"],
  "required_outputs": [
    { "type": "template", "name": "Outreach email v1" },
    { "type": "case_study", "name": "Before/after demo site" }
  ]
}
```

## Cascade Rules

```typescript
type ScopeLevel = "company" | "program" | "team" | "individual";

type GoalCascadeRule = {
  from: ScopeLevel;
  to: ScopeLevel;
  required_children_min: number;
  required_children_max: number;
};

const CASCADE: GoalCascadeRule[] = [
  { from: "company", to: "program", required_children_min: 2, required_children_max: 5 },
  { from: "program", to: "team", required_children_min: 3, required_children_max: 7 },
  { from: "team", to: "individual", required_children_min: 5, required_children_max: 20 }
];
```

## Database Schema

### New Tables

- **roles**: Organizational roles with scope levels
- **org_members**: Links users to roles
- **outputs**: Artifacts produced by quests/goals
- **knowledge_cards**: Reusable knowledge compiled from outputs

### Updated Tables

- **goals**: 
  - Removed `level` column
  - Added `spec_json`, `scope_level`, `owner_role_id`, `stakeholder_role_ids`
  - Added cascade fields: `cascade_plan_json`, `cascade_children_count`, `cascade_required_min/max`
  - Updated status constraint

- **quests**:
  - Added `required_outputs_json`
  - Added `output_ids` array

## Functions

- `is_goal_spec_complete(goal_id)`: Validates spec completeness
- `is_cascade_complete(goal_id)`: Checks if cascade requirements are met
- `update_goal_readiness(goal_id)`: Auto-transitions goals to 'ready' when complete

## Migration Notes

The migration preserves backward compatibility by:
- Keeping old status values in the constraint (for existing data)
- Not dropping existing goal data
- Allowing gradual migration of existing goals to new spec format

Existing goals with `level` values should be migrated to set appropriate `scope_level` and populate `spec_json` based on existing fields.

