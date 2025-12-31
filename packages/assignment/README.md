# @sb/assignment

Task assignment and Working Genius logic for intelligent team member matching in the Signal Blueprint suite.

## Purpose

`@sb/assignment` provides algorithms for assigning tasks to team members based on their Working Genius profiles. It matches task types with team members' natural strengths (Wonder, Invention, Discernment, Galvanizing, Enablement, Tenacity).

## Features

- **Working Genius Matching** - Match tasks to team members based on genius types
- **Workload Balancing** - Consider current workload when assigning
- **Capacity Tracking** - Respect daily capacity limits
- **Smart Assignment** - AI-powered assignment with reasoning

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Assign Task to Team Member

```typescript
import { assignTask } from "@sb/assignment";

const assignment = assignTask(task, teamMembers);

console.log(`Assign to: ${assignment.memberId}`);
console.log(`Reason: ${assignment.reason}`);
console.log(`Match score: ${assignment.matchScore}`);
```

### Working Genius Types

- **Wonder (W)** - Ask questions, ponder possibilities
- **Invention (I)** - Create solutions, innovate
- **Discernment (D)** - Evaluate ideas, provide feedback
- **Galvanizing (G)** - Rally people, generate enthusiasm
- **Enablement (E)** - Provide support, help others
- **Tenacity (T)** - Complete tasks, push to finish

## Testing

```bash
pnpm --filter @sb/assignment test
```

## Dependencies

- `@sb/schemas` - Team member and task types

## Used By

- **Questboard** - Task assignment in sprint planning
- **@sb/ai** - AI-powered assignment reasoning

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
