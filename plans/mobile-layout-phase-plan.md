# Mobile Usability Plan (Two-Phase)

## Summary
Ship mobile usability improvements in two phases:
1. Phase 1: quick fix so phone users are no longer forced into a squeezed one-screen layout.
2. Phase 2: add mobile mode selectors (`Status`, `Activities`, `Kanban`, `Chat`) with sticky top tabs.

Desktop behavior stays intact.

## Scope and Success Criteria
1. On phones (`max-width: 768px`), content is readable without compression and can be navigated comfortably.
2. Phase 1 keeps all major sections accessible with improved vertical flow.
3. Phase 2 allows focusing on one primary panel at a time via top mode tabs.
4. Existing desktop Kanban/Chat splitter behavior remains unchanged.
5. No backend/API/database changes.

## Public Interfaces, Types, and UI Contracts
1. Add frontend-only type in `client/src/App.tsx`:
   - `type MobileViewMode = 'status' | 'activities' | 'kanban' | 'chat'`
2. Add frontend state in `App.tsx`:
   - `mobileViewMode`
3. Add localStorage key:
   - `hub.mobileViewMode.v1`
4. Keep existing localStorage keys:
   - `hub.chatPanelRatio.v1` (desktop splitter)
   - `hub.mobilePanelPreset.v1` (kept for Phase 1 mobile presets)
5. No public server API changes.

## Phase 1 (MVP): Vertical Flow Fix
1. Mobile layout behavior:
   - Switch mobile container behavior from constrained viewport locking to natural vertical flow.
   - Use mobile-safe viewport sizing (`100dvh` where applicable) and allow vertical scrolling in the main content region.
2. Spacing and readability:
   - Increase mobile vertical gaps and panel spacing.
   - Prevent hard min-height constraints from forcing compression on short screens.
3. Existing controls:
   - Keep current mobile Kanban/Chat preset controls.
4. Non-goals in Phase 1:
   - No tabbed panel switching yet.
   - No redesign of desktop layout.

## Phase 2: Mode Selector Tabs
1. Add a mobile-only segmented control at top of main content:
   - Tabs: `Status`, `Activities`, `Kanban`, `Chat`
2. Tab bar behavior:
   - Sticky top, remains visible while scrolling.
3. Visibility model:
   - Mobile shows only the active panel section.
   - Desktop continues showing full multi-panel layout.
4. Defaults and persistence:
   - Default mobile panel: `Status`.
   - Persist selection in `hub.mobileViewMode.v1`.
5. Existing mobile presets:
   - Phase 1 keeps presets.
   - In Phase 2 tab mode, hide preset controls when not relevant to the active panel composition.

## File-by-File Implementation Plan
1. `client/src/App.tsx`
   - Add `MobileViewMode` type, parser, defaulting, and persistence hooks.
   - Add mobile mode tab UI and event handlers.
   - Add conditional rendering branches for mobile active panel.
   - Keep desktop splitter logic untouched.
2. `client/src/App.css`
   - Mobile overflow/height fixes for Phase 1.
   - Add styles for sticky `mobile-mode-tabs` and active/inactive states.
   - Add mobile spacing refinements.
   - Ensure no regressions in desktop media queries.
3. `client/src/__tests__/App.test.js`
   - Add tests for mobile tab rendering, selection, and persistence.
   - Add test that default mobile tab is `Status`.
   - Add assertions for single active panel rendering on mobile.
   - Keep existing desktop splitter and existing smoke tests.

## Test Cases and Validation
1. Desktop regression:
   - Splitter renders and existing desktop panel behavior remains.
2. Mobile Phase 1:
   - Main content can scroll vertically and panels are reachable.
   - No clipped header/footer in common phone viewports.
3. Mobile Phase 2:
   - Sticky tab bar renders with four modes.
   - Switching tabs changes visible panel.
   - `hub.mobileViewMode.v1` is written and restored.
4. Existing behavior smoke:
   - Status fetch/render still works.
   - Activities render and expand behavior works.
   - Chat input and message list work.
   - Mocked Kanban remains rendered when its tab is active.
5. Verification commands:
   - `cd client && npm test -- --runInBand`

## Rollout and Delivery
1. Create a new feature branch from the latest `main` commit before implementation.
2. Commit 1: Phase 1 mobile vertical-flow and spacing fix.
3. Commit 2: Phase 2 mode selectors with sticky tabs and persistence.
4. Perform local manual testing before any push to GitHub:
   - 390x844
   - 375x667
   - Verify tab switching, scrolling, and desktop splitter regression
5. Push branch to GitHub only after local manual validation passes.
6. After each push, check GitHub Actions workflow status and confirm build and test jobs complete without errors.

## Assumptions and Locked Defaults
1. Rollout strategy: two-phase.
2. Phase 1 keeps current mobile presets.
3. Phase 2 tabs are sticky top.
4. Default phone panel is `Status`.
5. Plan output file target: `plans/mobile-layout-phase-plan.md`.
