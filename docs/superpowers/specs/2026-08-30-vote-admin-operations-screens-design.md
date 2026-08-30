# Vote Admin Operations Screens Design

## Goal

Expand the authenticated administrator console with the operational screens
supported by the current vote API while keeping ballot casting outside the
administrator information architecture.

## Routes

```text
/votes/new
/votes/[voteId]/sub-votes/[voteDetailId]
/votes/[voteId]/electors
/field-sessions
/commissions
```

## Screen Responsibilities

- Vote setup creates a parent vote, child vote, candidates, and electors in a
  guided sequence. Each successful write uses the identifier returned by the
  previous command.
- Child vote operations show policy, candidates, turnout, and closed results.
- Elector management shows a paged roster, identity state, group and weight,
  and supports individual registration.
- Field voting operations create and transition onsite or visit sessions.
- Commission management creates commissions and registers admin or field
  manager members.

## API Boundaries

- Query screens use GET endpoints and React Query.
- Forms use POST or PUT command endpoints and React Query mutations.
- Mock mode provides complete in-memory read and write behavior without
  contacting the vote or OIDC servers.
- The live API does not currently expose commission or field-session reads.
  Those screens remain create-capable and explain that records created during
  the current browser session are the only records available until read APIs
  are added.
- Attachments are contextual panels, not a standalone route. They are omitted
  from this slice because the API has no attachment list read contract.
- Ballot casting and participation evidence are excluded. They belong to a
  separate elector or field-manager application with independent authorization.

## Security

- Mock mode remains explicit and visibly labeled.
- Administrator screens never expose raw identity payloads or provider tokens.
- Elector identity authentication is displayed as state only. This slice does
  not provide a manual provider transaction form.
- Vote results are requested only through the result query endpoint. A 409 is
  represented as an unavailable state, not treated as an empty result.
- No candidate selection or participation mutation is added to the admin UI.

## UI Direction

Use the existing shadcn-style primitives and cool neutral token system. The UI
is a dense, restrained operations console with consistent cards, explicit form
labels, responsive single-column fallbacks, and full loading, empty, error, and
success states. Avoid decorative motion and marketing-page patterns.

## Validation

- Unit-test API URL, method, body, and mock no-fetch behavior.
- Test route containers in mock mode.
- Run UI tests, lint, and production builds in live and mock modes with Node 24.
