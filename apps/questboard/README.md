# Questboard

## TL;DR
Task management system with AI sprint planning and Working Genius team assignment. Most mature app in the suite with full authentication, PWA support, and 48 passing tests.

## Product Goal
- Organize work into questlines (connected sequences of tasks) aligned with strategic goals
- Assign tasks based on team members' Working Genius profiles (Wonder, Invention, Discernment, Galvanizing, Enablement, Tenacity)
- Use AI to generate optimal sprint plans and task assignments
- Provide rotating Questmaster role for daily prioritization and coordination

## Current Status (Reality Check)

### ✅ Working (End-to-End)
- **Full-stack auth**: JWT backend + frontend integration, login/signup working
- **Complete CRUD**: Goals, questlines, quests, tasks all persist to Supabase
- **AI sprint planning**: GPT-4o generates + compares sprint plans
- **Task assignment**: AI explains Working Genius fit for assignments
- **Analytics dashboard**: Task/goal/quest stats, completion metrics, team capacity
- **PWA**: Service worker, offline support, installable on mobile
- **Mobile-responsive**: Hamburger menu, touch-optimized, works on phone/tablet
- **48 passing tests**: Schemas (31), AI functions (17)
- **Daily deck generation**: Automated focus cards based on priorities

### 🟡 Partial (Works but Incomplete)
- **Real-time updates**: No WebSocket/SSE, must manually refresh to see changes
- **Enhanced mobile**: No swipe gestures, pull-to-refresh, haptic feedback yet
- **Test coverage**: Tests exist but not comprehensive (missing integration tests)

### ❌ Broken/Missing (Prevents "Full Fledged + Shiny")
- **No collaboration features**: Can't see when others are viewing/editing
- **No data export**: Can't export tasks/goals to CSV, PDF, or other tools
- **TypeScript build issues**: Build/typecheck fails with pre-existing config errors

## How to Run

### Install
```bash
# From monorepo root
pnpm install
```

### Dev
```bash
# Run API + Web concurrently
pnpm --filter questboard dev:all

# Or run separately:
pnpm --filter questboard dev      # API only (port 3000)
pnpm --filter questboard dev:web  # Web only (port 5173)
```

### Test
```bash
pnpm --filter questboard test           # Run all tests
pnpm --filter questboard test:watch     # Watch mode
pnpm --filter questboard test:coverage  # With coverage
```

### Build
```bash
pnpm --filter questboard build       # Build API + Web
pnpm --filter questboard build:web   # Build Web only
```

### Env Vars
Required in root `.env`:
- `OPENAI_API_KEY` - For AI sprint planning
- `JWT_SECRET` - For authentication
- `DATABASE_URL` - Supabase PostgreSQL connection

### URLs/Ports
- **Web UI**: http://localhost:5173
- **API**: http://localhost:3000
- **First-time setup**: Create account at /signup, then login

## Architecture (Short)

### Stack
- **Backend**: Express.js REST API (TypeScript)
- **Frontend**: React + Vite (TypeScript)
- **Database**: Supabase (PostgreSQL) via `@sb/storage`
- **AI**: OpenAI GPT-4o for sprint planning
- **Auth**: JWT tokens from `@sb/auth` with bcrypt password hashing
- **PWA**: Service Worker with Workbox for offline support

### Key Modules
- `src/server.ts` - Express API server with 78 protected endpoints
- `web/src/` - React frontend (10+ pages: Today, Sprint, Goals, Team, Analytics)
- `src/routes/` - API route handlers (auth, goals, questlines, quests, tasks, sprint, team, daily)
- `web/src/lib/api.ts` - Centralized API client with auto token injection

### Data Model
14+ entity kinds stored via `@sb/storage`:
- Goals (strategic objectives)
- Questlines (connected quest sequences)
- Quests (task bundles)
- Tasks (individual work items)
- Team members + Working Genius profiles
- Sprint plans + assignments
- Daily decks
- Job run summaries

### State Management
- Frontend: React hooks + Context API
- Auth state: AuthContext with JWT token refresh
- API calls: Centralized client handles token injection + 401 refresh

## Known Issues

### No Real-Time Collaboration
- **Repro**: User A edits task → User B doesn't see change until refresh
- **Root cause**: No WebSocket/SSE for live updates
- **Workaround**: Manually refresh page
- **Fix needed**: Add WebSocket server for real-time events

### ~~Empty State for New Users~~ ✅ FIXED (QB-2)
- **Was**: Signup → empty dashboard, no guidance
- **Fixed**: Onboarding wizard now shown on first login
- **Solution**: 3-step wizard with sample data option or skip

### No Data Export
- **Repro**: Want to export tasks to Excel/Jira → no option exists
- **Root cause**: Export functionality not implemented
- **Fix needed**: Add CSV/JSON/PDF export endpoints + UI

### TypeScript Build Failures (Pre-existing)
- **Repro**: Run `pnpm typecheck` or `pnpm build` → hundreds of TS errors
- **Root cause**: Missing @sb/* module declarations, implicit any types throughout codebase
- **Workaround**: App runs despite errors (TS config may have skipLibCheck)
- **Fix needed**: Add proper type declarations, fix implicit any, configure tsconfig properly

## Task Queue (Autopilot)

| ID | Title | Priority | Status | Files | Acceptance Criteria | Notes/PR |
|----|-------|----------|--------|-------|---------------------|----------|
| QB-1 | Real-time collaboration with WebSocket | P1 | TODO | `src/websocket-server.ts`, `web/src/hooks/useRealtimeUpdates.ts` | **What**: Add WebSocket server for live task/quest updates<br>**Why**: Users must manually refresh to see changes<br>**Where**: New WebSocket module + React hook<br>**AC**: User A updates task → User B sees change instantly without refresh, presence indicators show who's online | |
| QB-2 | User onboarding wizard | P1 | DONE | `web/src/pages/OnboardingPage.tsx`, `src/routes/onboarding.ts`, `web/src/components/ProtectedRoute.tsx` | **What**: Build multi-step setup wizard for new users<br>**Why**: New signups see empty state, get lost<br>**Where**: New onboarding page shown on first login<br>**AC**: Wizard creates sample goal+questline+tasks, collects Working Genius profile, tours UI features | PR: [#TBD](https://github.com/SignalBlueprint/SignalCore/pull/TBD)<br>**Completed**: 3-step wizard (welcome → sample data → complete), auto-redirect for new users, sample data seeding (1 goal, 1 questline, 1 quest, 5 tasks), skip option, onboarding status tracking<br>**Note**: Build currently fails due to pre-existing TS config issues (not related to onboarding code) |
| QB-3 | Data export (CSV/JSON/PDF) | P2 | TODO | `src/routes/export.ts`, `web/src/components/ExportModal.tsx` | **What**: Add export endpoints + UI for goals/tasks/analytics<br>**Why**: Users can't get data out of system<br>**Where**: New export routes + modal in dashboard<br>**AC**: Export tasks as CSV, goals as JSON, analytics as PDF, download works | |
| QB-4 | Enhanced mobile gestures | P2 | TODO | `web/src/hooks/useSwipeGesture.ts`, `web/src/pages/Today.tsx` | **What**: Add swipe-to-complete, pull-to-refresh, haptic feedback<br>**Why**: Mobile UX feels basic compared to native apps<br>**Where**: Touch event handlers in task list components<br>**AC**: Swipe right completes task, pull down refreshes, vibrate on actions | |
| QB-5 | Integration tests for auth + CRUD | P1 | TODO | `__tests__/integration/auth.test.ts`, `__tests__/integration/crud.test.ts` | **What**: Add integration tests for signup→login→create task flow<br>**Why**: Only unit tests exist, no end-to-end coverage<br>**Where**: New integration test directory<br>**AC**: Tests cover full auth flow, CRUD operations, multi-tenant isolation | |
| QB-6 | Role-based UI features | P2 | TODO | `web/src/hooks/usePermissions.ts`, `web/src/components/RoleGate.tsx` | **What**: Hide admin actions from non-admins in UI<br>**Why**: UI shows actions users can't perform (confusing)<br>**Where**: Permission hooks + gating components<br>**AC**: Members can't see delete buttons, team leads see moderate actions, owners see all | |
| QB-7 | Keyboard shortcuts for power users | P3 | TODO | `web/src/hooks/useKeyboardShortcuts.ts` | **What**: Add keyboard shortcuts (n=new task, /=search, g g=go goals)<br>**Why**: Power users want faster navigation<br>**Where**: Global keyboard handler hook<br>**AC**: Shortcuts work, help modal (?) shows all shortcuts, conflicts avoided | |
| QB-8 | Task dependencies + blocking | P2 | TODO | `src/routes/tasks.ts`, `web/src/components/TaskDependencies.tsx` | **What**: Allow tasks to depend on/block other tasks<br>**Why**: Some tasks can't start until others finish<br>**Where**: Task schema + UI for linking<br>**AC**: Tasks can have dependencies, blocked tasks shown in UI, dependency graph validates no cycles | |
| QB-9 | Bulk operations for tasks | P3 | TODO | `web/src/components/BulkActions.tsx`, `src/routes/tasks.ts` | **What**: Select multiple tasks → bulk assign/delete/move/complete<br>**Why**: Tedious to update tasks one-by-one<br>**Where**: Task list with checkboxes + actions bar<br>**AC**: Select tasks, choose action, all update atomically, undo available | |
| QB-10 | Dark mode support | P3 | TODO | `web/src/styles/theme.ts`, `web/src/hooks/useTheme.ts` | **What**: Add dark theme with toggle in settings<br>**Why**: Users prefer dark mode for late-night work<br>**Where**: CSS variables + theme context<br>**AC**: Toggle switches theme, preference persisted, all pages styled correctly | |
| QB-11 | Quest template library | P3 | TODO | `src/routes/templates.ts`, `web/src/pages/Templates.tsx` | **What**: Pre-built quest templates (product launch, sprint, onboarding)<br>**Why**: Users reinvent common workflows<br>**Where**: New templates page + API<br>**AC**: Browse templates, clone to active quests, customize, community sharing (v2) | |
| QB-12 | Advanced analytics (velocity, burndown) | P3 | TODO | `src/services/analytics.ts`, `web/src/pages/Analytics.tsx` | **What**: Add velocity tracking, burndown charts, cycle time metrics<br>**Why**: Current analytics are basic counts/averages<br>**Where**: Enhanced analytics service + dashboard<br>**AC**: Chart shows velocity trend, burndown for sprints, cycle time per task type | |

**Priority Legend**: P0=blocker, P1=production readiness, P2=important quality/UX, P3=nice-to-have

## Release Gates

Must pass before production release:

```bash
# All tests pass
pnpm --filter questboard test

# No TypeScript errors
pnpm --filter questboard typecheck

# No linting errors
pnpm --filter questboard lint

# Builds successfully
pnpm --filter questboard build

# Manual smoke test:
# - Signup → Login → Create goal → Create quest → Create task → Complete task
# - Generate sprint plan → Compare plans → Select plan
# - View analytics → See correct counts
# - Install PWA → Works offline
```
