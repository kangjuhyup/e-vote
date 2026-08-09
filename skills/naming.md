# Skill: Backend Naming

## Trigger

- new files
- renamed files/classes
- DTOs
- commands/queries
- controllers
- infrastructure payloads

## Rules

### Presentation

- Controller file: `<resource>.controller.ts`
- Controller class: `<Resource>Controller`
- Request DTO file: `<action>-<resource>-request.dto.ts`
- Request DTO class suffix: `Body`, `Query`, `Param`, `Header`
- Response DTO file: `<action>-<resource>-response.dto.ts`
- Response DTO class suffix: `Response`

### Application

- Command file: `<action>-<resource>.command.ts`
- Command class: `<Action><Resource>Command`
- Command handler file: `<action>-<resource>.handler.ts`
- Query file: `<action>-<resource>.query.ts`
- Query class: `<Action><Resource>Query`
- View model class: `<Resource>View`

### Domain

- Aggregate: `<Resource>Aggregate`
- Value object: `<Concept>`
- Domain event: past tense, e.g. `VoteOpened`, `ParticipationCast`
- Domain error: `<Reason>Error`

### Infrastructure

- Repository implementation: `<Resource>RepositoryAdapter`
- External payload: `<Provider><Action>Payload`
- External result: `<Provider><Action>Result`

## Do

- Prefer domain terms: `elector`, `candidate`, `voteDetail`, `participation`.
- Use `elector` for eligible participant records and `participation` for actual voting action.
- Keep file names lowercase kebab-case.

## Don't

- Use deprecated eligible-user terms for backend domain names or elector master data.
- Mix request DTOs with application commands.
- Put provider payload names in domain.

## Checklist

- [ ] File and class names match layer role.
- [ ] `elector` is used for elector registry concepts.
- [ ] Domain events are past tense.
