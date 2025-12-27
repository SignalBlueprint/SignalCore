# Contributing to Signal Blueprint

## Getting Started

### Installation

```bash
pnpm install
```

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

## Development Workflow

1. Create a branch from `main` following naming conventions
2. Make your changes
3. Run linting and type checking locally
4. Commit your changes with clear messages
5. Push to your branch
6. Create a pull request with a clear description

