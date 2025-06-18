# Project Management System Guide

## Overview

This guide establishes a unified project management system that enables effective collaboration between developers and AI assistants across multiple sessions. The system maintains persistent memory through structured documentation in a `.pm` directory.

## Directory Structure

```
.pm/
├── PROJECT_STATUS.md          # Current project state and active work
├── docs/                      # High-level documentation
│   ├── architecture.md
│   ├── tech-stack.md
│   └── conventions.md
└── epics/                     # Feature epics
    ├── epic-001-authentication/
    │   ├── epic-summary.md
    │   ├── sprint-001-database-schema.md
    │   ├── sprint-002-user-registration.md
    │   └── sprint-003-login-flow.md
    └── epic-002-user-dashboard/
        ├── epic-summary.md
        └── sprint-004-dashboard-ui.md
```

## Core Concepts

### Project Status File
The `PROJECT_STATUS.md` file serves as the entry point for understanding the current state of the project. It includes:
- Current active sprint
- Recently completed work
- Upcoming priorities
- Blockers or important decisions needed

### Epics
An epic represents a major feature or collection of related functionality. Each epic:
- Lives in its own folder under `.pm/epics/`
- Uses naming convention: `epic-XXX-descriptive-name/`
- Contains an `epic-summary.md` with the overall plan
- Contains individual sprint files for each feature

### Sprints
A sprint represents a single, focused feature implementation. Each sprint:
- Is documented in a single markdown file
- Uses naming convention: `sprint-XXX-feature-name.md`
- Contains planning, progress tracking, and completion notes
- Should be completable in a single focused work session

## Workflow Process

### Starting a New Epic

1. Create epic folder: `.pm/epics/epic-XXX-name/`
2. Create `epic-summary.md` with:
   - Epic description and goals
   - List of planned sprints
   - Technical approach and constraints
   - Success criteria

### Working on a Sprint

1. **Begin Sprint**
   - Read sprint requirements
   - Review related code and documentation
   - Ask clarifying questions

2. **Plan Sprint**
   - Create/update sprint file with detailed plan
   - List all tasks with checkboxes
   - Identify files to create/modify
   - Get approval before coding

3. **Execute Sprint**
   - Implement features according to plan
   - Test functionality
   - Update sprint file with progress

4. **Complete Sprint**
   - Mark completed tasks
   - Document decisions made
   - List all file changes
   - Note any remaining work
   - Update PROJECT_STATUS.md

## File Templates

### Epic Summary Template

```markdown
# Epic XXX: [Epic Name]

## Description
[High-level description of the epic's purpose and value]

## Planned Sprints
1. **Sprint XXX:** [Feature name] - [Brief description]
2. **Sprint XXX:** [Feature name] - [Brief description]
3. **Sprint XXX:** [Feature name] - [Brief description]

## Technical Approach
- [Key technical decisions]
- [Architecture considerations]
- [Dependencies or constraints]

## Success Criteria
- [ ] [Measurable outcome]
- [ ] [Measurable outcome]
```

### Sprint File Template

```markdown
# Sprint XXX: [Feature Name]

**Status:** Planning | In Progress | Complete
**Epic:** XXX - [Epic Name]
**Date Started:** YYYY-MM-DD
**Date Completed:** YYYY-MM-DD

## Feature Requirements
[Clear description of what this sprint will deliver]

## Tasks
- [ ] Task description
- [ ] Task description
- [ ] Task description

## Technical Plan
[Detailed approach for implementation]

## Files to Modify
- `path/to/file.ts` - [What changes]
- `path/to/new-file.ts` - [What it does]

## Decisions & Notes
- [Important decisions made during sprint]
- [Technical choices and rationale]

## Session Summary
**Completed:**
- [What was accomplished]

**Remaining:**
- [What needs to be done next]

**Files Changed:**
- `created: path/to/file.ts`
- `modified: path/to/file.ts`
```

### PROJECT_STATUS.md Template

```markdown
# Project Status

**Last Updated:** YYYY-MM-DD
**Current Sprint:** XXX - [Sprint Name]
**Current Epic:** XXX - [Epic Name]

## Active Work
[Description of current focus]

## Recent Completions
- Sprint XXX: [Feature] - [Date]
- Sprint XXX: [Feature] - [Date]

## Upcoming Priorities
1. [Next planned work]
2. [Future priority]

## Blockers & Decisions Needed
- [Any blocking issues]
- [Decisions requiring input]

## Quick Links
- Current Epic: [./epics/epic-XXX-name/](./epics/epic-XXX-name/)
- Current Sprint: [./epics/epic-XXX-name/sprint-XXX.md](./epics/epic-XXX-name/sprint-XXX.md)
```

## Best Practices

### For Developers
1. Update PROJECT_STATUS.md at the end of each work session
2. Create epics before starting related sprints
3. Keep sprint scope focused and achievable
4. Document decisions as they're made
5. Use descriptive commit messages referencing sprint numbers

### For AI Assistants
1. Always check PROJECT_STATUS.md first
2. Read relevant epic summary before starting a sprint
3. Update sprint documentation throughout the session
4. Document all file changes
5. Keep sprint files as the source of truth
6. Ask for clarification before making assumptions

### General Guidelines
- Use consistent numbering (001, 002, etc.)
- Keep documentation concise but complete
- Focus on what was done, not how
- Document the "why" for important decisions
- Update status in real-time, not retrospectively

## Maintenance

### Weekly
- Review and update PROJECT_STATUS.md
- Archive completed epics if needed
- Plan upcoming sprints

### Per Epic
- Review epic summary for accuracy
- Ensure all sprints are documented
- Update success criteria status

### Per Sprint
- Ensure all tasks are marked appropriately
- Verify file change list is complete
- Check that decisions are documented 