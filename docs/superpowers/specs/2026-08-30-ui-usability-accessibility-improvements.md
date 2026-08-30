# UI Usability and Accessibility Improvements

## Goal

Improve the authenticated vote operations UI without changing vote business behavior or backend contracts.

## Requirements

- Add a persistent authenticated app header with dashboard and vote-list navigation, current-location indication, user identity, and sign-out.
- Add a skip link and a semantic heading hierarchy.
- Keep reusable components feature-independent and feature UI hookless.
- Reflect vote-list and elector-roster filters in URL query parameters while preserving the existing Zustand UI-state boundary.
- Show vote-list result counts and provide a one-click filter reset for empty filtered results.
- Show the dashboard data timestamp and make refresh progress understandable to assistive technology.
- Prevent large elector rosters from rendering every row at once by paging the reusable roster component.
- Improve narrow-screen roster access, form metadata, focus states, motion preferences, touch targets, and numeric alignment.
- Preserve existing routes and API response contracts.
- Do not add runtime dependencies.

## Verification

- Run UI tests, lint, and production build using the Node version selected by `.nvmrc`.
- Re-run the installed web interface guideline checks on changed UI files.
