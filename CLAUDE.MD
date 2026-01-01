# Claude Development Guide for SignalCore

This document provides essential guidance for Claude when working on the SignalCore monorepo.

## 🎯 First Steps: Understanding Your Tasks

**CRITICAL: Before starting ANY work, you MUST:**

1. **Read the Main README** (`/README.md`)
   - Contains the complete project overview and current status
   - Lists all apps with their current functionality and status
   - Includes comprehensive roadmap with prioritized tasks
   - Shows immediate actions for the next 1-2 weeks
   - Provides context on recent achievements and strategic gaps

2. **Read the App-Specific README** (if working on a specific app)
   - Located at `apps/{app-name}/README.md`
   - Contains detailed feature lists and implementation status
   - May include app-specific roadmaps and next steps
   - Provides API documentation and architecture details

3. **Check for Related Documentation**
   - `docs/SUITE_MAP.md` - Complete suite overview and app registry
   - `docs/ARCHITECTURE.md` - Architecture principles and guidelines
   - `docs/AUTHENTICATION_STRATEGY.md` - Auth implementation details
   - `docs/JOBS.md` - Job system documentation
   - App-specific guides (e.g., `CATALOG_GUIDE.md`)

## 📋 Task Prioritization Framework

When determining what to work on, follow this priority order:

### 🔥 CRITICAL PATH (Highest Priority)
Tasks marked as "HIGHEST PRIORITY" in the README roadmap. These are production blockers that prevent real-world usage:
- Payment integration for Catalog
- Email service integration for Outreach
- Authentication frontend rollout

### 🛡️ SECURITY & STABILITY (High Priority)
- Authentication and authorization issues
- Data persistence and backup
- Security vulnerabilities
- Critical bug fixes

### 🔧 CORE FUNCTIONALITY (Medium Priority)
- Incomplete features in existing apps
- Missing critical workflows
- Integration between apps
- Testing and quality improvements

### 📱 USER EXPERIENCE (Lower Priority)
- UI/UX enhancements
- Mobile responsiveness
- Dark mode and themes
- Onboarding flows

### 🎯 STRATEGIC INITIATIVES (Future)
- New features and capabilities
- Marketplace preparation
- API platform development

## 🏗️ Architecture & Development Guidelines

### Monorepo Structure
```
apps/              # Independent applications - cannot import from each other
packages/          # Shared libraries (@sb/* packages)
docs/              # Documentation
```

### Key Principles
- **App Independence**: Apps CANNOT import from other apps
- **Package Sharing**: Apps import shared code from `@sb/*` packages
- **Schema-First**: Data contracts defined in `@sb/schemas`
- **Event-Driven**: Inter-app communication via events

### Before Making Changes
1. **Read existing code first** - Never propose changes to code you haven't read
2. **Use TodoWrite** - Plan complex tasks with the TodoWrite tool
3. **Avoid over-engineering** - Only make changes that are directly requested
4. **Don't add unnecessary features** - No extra error handling, comments, or abstractions
5. **Security first** - Watch for vulnerabilities (XSS, SQL injection, command injection)

### Development Commands
```bash
# Install dependencies
pnpm install

# Run all apps in dev mode
pnpm dev

# Run specific app
pnpm --filter {app-name} dev

# Build everything
pnpm build

# Run tests
pnpm test
```

## 🔍 Where to Find Information

### Current Status & Priorities
- **Source**: Main README (lines 376-671)
- **Contains**: Roadmap, immediate actions, success metrics
- **Check for**: Current sprint priorities, production blockers

### App Functionality & Features
- **Source**: Main README (lines 43-215)
- **Contains**: Status of each app, feature lists, ports
- **Check for**: What's implemented vs. what's missing

### Recent Changes
- **Source**: Main README (lines 253-333)
- **Contains**: Recent achievements and updates
- **Check for**: What was just completed, new features

### Gaps & Opportunities
- **Source**: Main README (lines 335-374)
- **Contains**: Strengths, weaknesses, opportunities, threats
- **Check for**: Known issues, missing features

### API Documentation
- **Source**: App-specific READMEs
- **Example**: `apps/catalog/README.md` has complete API reference
- **Check for**: Endpoint details, request/response formats

## 🎨 App-Specific Contexts

### Questboard (Port 3000/5173)
- **Status**: 🟢 Fully Functional - Most mature app
- **Focus**: Task management, sprint planning, team assignment
- **README**: `apps/questboard/README.md`

### Catalog (Port 4023)
- **Status**: 🟢 Production Ready
- **Focus**: E-commerce platform with AI
- **Critical Gap**: Missing payment processing
- **README**: `apps/catalog/README.md`

### Console (Port 4000)
- **Status**: 🟢 Fully Functional
- **Focus**: Admin hub and suite management
- **README**: `apps/console/README.md`

### Worker (CLI)
- **Status**: 🟢 Production Ready
- **Focus**: Job scheduling and cron automation
- **README**: `apps/worker/README.md`

### LeadScout (Port 4021)
- **Status**: 🟢 Fully Functional
- **Focus**: Lead discovery and AI-powered qualification
- **README**: `apps/leadscout/README.md`

### Outreach (Port 4025)
- **Status**: 🟢 Functional
- **Critical Gap**: Missing email sending capability
- **README**: `apps/outreach/README.md`

### SiteForge (Port 4024)
- **Status**: 🟢 Fully Functional
- **Focus**: AI-powered website generation
- **README**: `apps/siteforge/README.md`

### Lexome (Port 4026)
- **Status**: 🟢 Fully Functional
- **Focus**: AI-enhanced e-reader for classic books
- **README**: `apps/lexome/README.md`

### Demoapp
- **Status**: 🔴 Placeholder
- **Decision Needed**: Determine purpose or remove
- **README**: `apps/demoapp/README.md`

## 🚀 Quick Reference: Next Actions

When a user asks "What should we work on?" or "What's next?", consult:

1. **Immediate Actions** section in main README (lines 628-671)
2. **Roadmap** section for current priorities (lines 377-627)
3. **App-specific README** for detailed tasks

The main README is the source of truth for:
- Current sprint priorities
- Production blockers
- Strategic initiatives
- Success metrics and milestones

## 💡 Best Practices

1. **Always read before editing** - Use Read tool before making changes
2. **Check recent commits** - Run `git log` to understand recent work
3. **Follow existing patterns** - Match the coding style and architecture
4. **Test your changes** - Ensure tests pass before committing
5. **Document as you go** - Update READMEs when adding features
6. **Use the task tracking** - TodoWrite tool for complex work

## 🔐 Security Considerations

- Authentication system is implemented but needs frontend rollout
- All apps should use `@sb/auth` package
- Watch for OWASP top 10 vulnerabilities
- Never commit secrets or API keys
- Use environment variables for configuration

## 📊 Success Metrics

Track progress against these KPIs (from README):
- **Reliability**: 99.5% uptime for all apps
- **Performance**: < 2s page load times
- **Quality**: < 5 critical bugs per month
- **Testing**: 70%+ code coverage
- **Security**: Zero auth bypass vulnerabilities
- **User Experience**: < 3 clicks to complete key tasks

---

**Remember**: The main README and app-specific READMEs are your primary source of truth for understanding what needs to be done. Always consult them before starting work!
