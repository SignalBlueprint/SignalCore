# Contributing to Signal Blueprint

## Getting Started

### Installation

```bash
pnpm install
```

### Seeding Demo Data

To quickly get started with a demo org, members, and sample goal:

```bash
pnpm sb seed:demo
```

This creates:
- A demo org (`demo-org`)
- 3 members with different Working Genius profiles
- A sample goal that's clarified, approved, and decomposed into questlines
- Tasks assigned to members based on their profiles

The script works with both local JSON storage and Supabase. If you don't have an AI API key, it uses canned outputs.

### Running the Monorepo

Run all apps and packages in development mode:

```bash
pnpm dev
```

Run a specific app:

```bash
pnpm --filter questboard dev
```

Run a specific package:

```bash
pnpm --filter @sb/schemas dev
```

## Branch Naming Conventions

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

Examples:
- `feat/questboard-user-auth`
- `fix/schemas-validation-bug`
- `docs/api-documentation`

## Pull Request Checklist

Before submitting a PR, please ensure:

- [ ] Code follows the project's style guidelines
- [ ] All tests pass: `pnpm test`
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`
- [ ] Documentation is updated if needed
- [ ] Branch is up to date with main/master
- [ ] Commit messages are clear and descriptive

## Creating a New App

To create a new app skeleton with consistent structure:

```bash
pnpm sb create-app <name>
```

This command will:
- Create `apps/<name>` directory with the standard app structure
- Generate `package.json`, `tsconfig.json`, `src/index.ts`, and `README.md`
- Automatically add the app to the suite registry (`@sb/suite`)
- Add the app ID to the `AppId` union type

Example:
```bash
pnpm sb create-app demoapp
```

After creating the app:
1. Update `apps/<name>/README.md` with app details and purpose
2. Update the `purpose` field in `packages/suite/src/registry.ts`
3. Start developing: `pnpm --filter <name> dev`

## Development Workflow

1. Create a branch from `main` following naming conventions
2. Make your changes
3. Run linting and type checking locally
4. Commit your changes with clear messages
5. Push to your branch
6. Create a pull request with a clear description


