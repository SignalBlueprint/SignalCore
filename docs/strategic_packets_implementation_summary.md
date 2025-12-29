# Strategic Packets Implementation Summary

## Migration Files Created

1. **006_strategic_packets_refactor.sql** - Main migration with all schema changes
2. **007_strategic_packets_rls.sql** - Row Level Security policies for new tables

## What Was Implemented

### ✅ 1. Organizational Hierarchy

**Tables Created:**
- `roles` - Defines organizational roles with scope levels (company/program/team/individual)
- `org_members` - Links users to roles within organizations

**Features:**
- Hierarchical reporting via `reports_to_role_id`
- Role-based permissions via `permissions_json`
- Scope levels: company → program → team → individual

### ✅ 2. Goal Spec System

**Changes to `goals` table:**
- ❌ Removed `level` column (L0-L5 system)
- ✅ Added `spec_json` - Complete Goal Spec stored as JSONB
- ✅ Added `scope_level` - company/program/team/individual
- ✅ Added `owner_role_id` - Role that owns the goal
- ✅ Added `stakeholder_role_ids` - Array of stakeholder roles
- ✅ Added individual spec fields for querying: `problem`, `outcome`, `metrics_json`, `plan_markdown`, `dependencies_json`, `risks_json`, `required_outputs_json`

**Status Flow:**
- `draft` → `ready` (spec-complete) → `active` → `done` / `archived`
- Old statuses preserved for backward compatibility

**Validation:**
- `is_goal_spec_complete()` - Validates spec has all required fields
- Auto-transitions to `ready` when spec is complete

### ✅ 3. Goal Cascading

**Cascade Fields:**
- `cascade_plan_json` - Stores cascade configuration
- `cascade_children_count` - Tracks number of child goals
- `cascade_required_min` / `cascade_required_max` - Required child count range

**Cascade Rules:**
- company → program: 2-5 children
- program → team: 3-7 children
- team → individual: 5-20 children

**Functions:**
- `get_next_scope_level()` - Returns next scope level for cascading
- `get_cascade_requirements()` - Returns min/max children for a scope
- `set_cascade_requirements()` - Auto-sets cascade requirements based on scope
- `is_cascade_complete()` - Validates cascade requirements are met

**Behavior:**
- Parent goals cannot be `active` unless cascade is complete
- Cascade validation runs automatically via triggers

### ✅ 4. Outputs System

**Table: `outputs`**
- Types: doc, code, template, asset, decision, metric_snapshot
- Linked to goals and quests
- Supports markdown body or URL
- Tagged for searchability

**Features:**
- Tracks who created the output
- Links to parent goal/quest
- Searchable by tags, type, org

### ✅ 5. Knowledge Pool

**Table: `knowledge_cards`**
- Auto-generated from outputs
- Types: sop, playbook, pattern, lesson, pitch, snippet
- Summarized and tagged
- Links back to source output

**Use Cases:**
- Auto-compile playbooks per program
- Reuse templates in outbound
- Onboard new members with required reading
- Build patterns library (what worked/failed)
- Generate case studies from linked outputs

### ✅ 6. Quest Updates

**Changes to `quests` table:**
- `required_outputs_json` - Array of required output types/names
- `output_ids` - Array of output IDs produced by this quest

**Behavior:**
- Quests can require specific outputs for completion
- Outputs are tracked and linked to quests

## Database Functions

### Spec Validation
- `is_goal_spec_complete(goal_id)` - Returns boolean if spec is complete

### Cascade Management
- `get_next_scope_level(scope)` - Returns next scope level
- `get_cascade_requirements(scope)` - Returns min/max children
- `set_cascade_requirements(goal_id)` - Auto-sets requirements
- `is_cascade_complete(goal_id)` - Validates cascade is complete

### Goal Lifecycle
- `update_goal_readiness(goal_id)` - Auto-updates goal status based on completeness
- `update_goal_rollup(goal_id)` - Updates quest/XP rollups (updated to include cascade children)

## Triggers

- `goal_spec_readiness_check` - Auto-validates and updates goal status when spec changes
- `quest_rollup_update` - Updates goal rollups when quests change (from migration 005)

## Next Steps for Application Layer

### 1. Goal Creation Flow
```typescript
// Create goal with spec
const goal = {
  title: "...",
  scope_level: "program",
  owner_role_id: "...",
  spec_json: { /* full spec */ },
  status: "draft"
};

// System auto-validates and sets cascade requirements
// When spec is complete, auto-transitions to "ready"
```

### 2. Generate Cascade UI
```typescript
// On parent goal, call "Generate Cascade"
// System proposes child goals (full specs) at next scope level
// User assigns owners (roles) and clicks Apply
// System creates child goals and auto-creates starter quests
```

### 3. Quest Completion
```typescript
// When completing quest, check required_outputs_json
// Show modal: "What artifact did you produce?"
// Create output record, link to quest
// Optionally generate knowledge_card from output
```

### 4. Knowledge Pool UI
- Searchable card library
- Filter by type/tag/goal
- Auto-compile playbooks
- Reuse templates

## Migration Notes

- **Backward Compatible**: Old status values preserved
- **Data Migration**: Existing goals with `level` should be migrated to set `scope_level` and populate `spec_json`
- **Gradual Migration**: Can migrate goals incrementally

## Example Queries

### Get all goals for a role
```sql
SELECT g.* FROM goals g
JOIN roles r ON g.owner_role_id = r.id
WHERE r.id = 'role-uuid'
AND g.status = 'active';
```

### Get cascade children
```sql
SELECT * FROM goals
WHERE parent_goal_id = 'parent-goal-uuid'
AND status IN ('ready', 'active');
```

### Find outputs by type
```sql
SELECT * FROM outputs
WHERE org_id = 'org-uuid'
AND type = 'template'
AND 'outreach' = ANY(tags);
```

### Get knowledge cards for a program
```sql
SELECT kc.* FROM knowledge_cards kc
JOIN outputs o ON kc.source_output_id = o.id
JOIN goals g ON o.goal_id = g.id
WHERE g.scope_level = 'program'
AND g.org_id = 'org-uuid';
```

