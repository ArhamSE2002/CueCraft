---
name: project-documentation
description: Documentation protocols, roadmap maintenance, architecture records, and task tracking for CueCraft. Use when logging development progress, recording architectural decisions, or updating project specifications.
---

# CueCraft Project Documentation Protocols

CueCraft is maintained as a long-term, professional engineering project. Comprehensive living documentation ensures maintainability, architectural integrity, and traceability.

## Core Documentation Files

1. **`ARCHITECTURE.md`**:
   - High-level system structure, Astro Islands boundary, physics engine pipeline, state architecture, and module dependency graphs.
2. **`ROADMAP.md`**:
   - Implementation phases from Phase 0 (Setup) through Phase 8 (Release), milestones, deliverables, and future enhancements (multiplayer, AI opponent).
3. **`PHYSICS_MODEL.md`**:
   - Complete mathematical derivations, friction models, collision impulses, spin mechanics, and physical constants with standard references.
4. **`UI_DESIGN_SYSTEM.md`**:
   - Brand identity, color tokens, typography scales, HUD component specifications, responsive layout rules, and accessibility standards.
5. **`PERFORMANCE_GUIDELINES.md`**:
   - Budget constraints (bundle size, frame times, memory usage), lazy-loading strategies, Canvas 2D and Three.js optimization rules.
6. **`DEVELOPMENT_LOG.md`**:
   - Chronological engineering log documenting architectural decisions, milestones completed, bugs discovered and resolved.
7. **`TASKS.md`**:
   - Actionable work items broken down by objective, dependencies, affected files, acceptance criteria, tests, and current status (`TODO`, `IN_PROGRESS`, `DONE`).

## Workflow

- Whenever an architectural change is made, update `ARCHITECTURE.md`.
- Whenever a physics formula or constant is adjusted, update `PHYSICS_MODEL.md`.
- Whenever a milestone or task changes state, update `TASKS.md` and log key entries in `DEVELOPMENT_LOG.md`.
- Always keep documentation in sync with real codebase files and tests.
