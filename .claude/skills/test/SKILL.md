---
name: test
description: Review and write test cases across all workspaces (backend, client, game). Use when creating new tests, reviewing existing tests for correctness, or improving test coverage. Enforces strict rules to prevent AI-generated tests that are designed to pass rather than genuinely verify behavior.
---

# Test Skill - Review & Write Test Cases

Use this skill with `<target>` as a service name, file path, or description of what to test.

**The #1 danger of AI-written tests:** When an AI reads implementation code and generates tests, it mirrors the code's current behavior back as assertions - including bugs. This is **transcription, not validation.** The test confirms what the code *does*, not what it *should do*. Every rule below exists to prevent this.

---

## The Rules

### 1. Every test must be capable of failing

Before finishing any test, mentally invert the logic. If the code returned the wrong value, would the test catch it? If the assertion is too loose, it won't.

**DON'T** - write a test and move on without checking it can fail.
**DO** - for at least one test per batch, temporarily break the assertion and confirm it fails.

### 2. Arrange -> Act -> Assert (one Act per test)

Three clearly separated sections. The Act should be a single call.

```typescript
// DO
it('deducts resources when crafting an item', async () => {
  // Arrange - register user, create save, set up inventory state
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username: 'courier', password: 'highdesert77' });
  await agent.post('/api/saves').send({ name: 'Test Save' });

  // Act
  const response = await agent.post('/api/game/craft').send({ itemId: 'bandage' });

  // Assert
  expect(response.status).toBe(200);
  expect(response.body.state.inventory).not.toContainEqual(
    expect.objectContaining({ id: 'cloth', quantity: 5 })
  );
});
```

**DON'T** - interleave setup, calls, and assertions. If you need two Act sections, write two tests.

### 3. Test behavior, not implementation

Ask "what should happen?" - not "does line 47 execute?"

**DON'T** - test internal field values, private methods, or call order.
**DO** - test through public APIs and service functions. If you refactor the code and the test breaks but behavior is unchanged, the test was coupled to implementation.

### 4. Test names must describe what/scenario/expected

```typescript
// DON'T
it('test1', ...);
it('should work', ...);
it('movement test', ...);

// DO
it('rejects move to non-adjacent hex on overworld', ...);
it('discovers new tiles when moving to unexplored area', ...);
it('returns 400 when entering undiscovered location', ...);
```

### 5. Cover happy path + error path + edge cases

Every feature needs at minimum:
- **Happy:** normal operation succeeds
- **Error:** invalid input, missing prereqs, permission denied -> returns specific status/error
- **Edge:** zero quantities, boundary hex coordinates, empty collections, exact boundary values

### 6. Assert on DB/game state, not just return values

For mutations, verify the state actually changed:

```typescript
// DON'T - only check the response status
const response = await agent.post('/api/game/overworld/move').send({ x: 3, y: 2 });
expect(response.status).toBe(200);

// DO - also verify side effects in game state
const stateResponse = await agent.get('/api/game/state');
expect(stateResponse.body.state.worldState.player_x).toBe(3);
expect(stateResponse.body.state.worldState.player_y).toBe(2);
expect(stateResponse.body.state.mapDiscovery.discoveredTileKeys).toContain('3,2');
```

### 7. Assert status codes and error content, not just messages

Status codes and error shapes are part of the contract.

```typescript
// DON'T
expect(response.body.error).toBeTruthy();

// DO
expect(response.status).toBe(400);
expect(response.body.error).toContain('not been discovered yet');
```

### 8. Use the most specific assertion possible

```typescript
// DON'T
expect(result).toBeTruthy();
expect(result).toBeDefined();
expect(locations.length > 0).toBe(true);

// DO
expect(response.body.state.worldState.current_screen).toBe('overworld');
expect(locations).toHaveLength(5);
expect(discoveredTileKeys.length).toBeGreaterThan(1);
```

Reserve `toBeTruthy()`/`toBeDefined()` only when that is genuinely all that matters.

### 9. No branching logic in tests

If you see `if`, `switch`, `try/catch`, or ternaries inside a test body, the test is broken - some assertions may never execute.

```typescript
// DON'T
it('handles movement', async () => {
  const response = await agent.post('/api/game/overworld/move').send({ x: 3, y: 2 });
  if (response.status === 200) {
    expect(response.body.state.worldState.player_x).toBe(3);
  } else {
    expect(response.body.error).toBeDefined();
  }
});

// DO - write separate tests for each branch
it('moves player to adjacent hex', ...);
it('rejects move to non-adjacent hex', ...);
```

### 10. Expect errors explicitly - never swallow them

```typescript
// DON'T - passes whether it throws or not
try { await service.doSomething(); } catch (e) { /* silent */ }

// DO - for API tests
const response = await agent.post('/api/game/location/enter').send({ locationId: 'unknown' });
expect(response.status).toBe(400);
expect(response.body.error).toContain('not been discovered');

// DO - for service-level code
await expect(service.doSomething()).rejects.toThrow('specific message');
```

### 11. Fresh data per test - no shared mutable state

Each test seeds its own data in `beforeEach`. Never depend on data from another test.

```typescript
// DON'T - global state shared across tests
let sharedAgent: ReturnType<typeof request.agent>;
beforeAll(async () => {
  sharedAgent = request.agent(app);
  await sharedAgent.post('/api/auth/register').send({ username: 'shared', password: 'pass123' });
});

// DO - fresh per test
let db: Database.Database;
let config: AppConfig;

beforeEach(() => {
  db = new Database(':memory:');
  runMigrations(db);
  config = { port: 3001, clientOrigin: 'http://localhost:4321', sqlitePath: ':memory:', sessionTtlDays: 14, cookieName: 'foc_session' };
});
```

### 12. Control all non-determinism

Mock `Math.random()`, pin time, never depend on wall clock or execution speed.

```typescript
// DON'T - flaky, depends on random outcome
const result = await combatService.resolveBattle(attacker, defender);
expect(result.winner).toBe('attacker');

// DO
vi.spyOn(Math, 'random').mockReturnValue(0.5);
const result = await combatService.resolveBattle(attacker, defender);
expect(result.winner).toBe('attacker');
vi.restoreAllMocks();
```

### 13. Use realistic test data

```typescript
// DON'T
await agent.post('/api/auth/register').send({ username: 'x', password: 'y' });

// DO
await agent.post('/api/auth/register').send({ username: 'wanderer', password: 'highdesert77' });
```

---

## Anti-Patterns - Reject on Sight

| Anti-Pattern | What It Looks Like | Why It's Dangerous |
|---|---|---|
| **Tautological test** | Asserts on mock's return value, not production code output | Always passes - tests the mock, not the code |
| **Testing setup** | Seeds data then asserts the seed worked | Proves test helpers work, not your service |
| **Mocking the SUT** | `vi.spyOn(service, 'method').mockReturnValue(x)` then tests `service.method()` | You mocked the answer - test is circular |
| **No assertions** | Test body has no `expect()` calls | Passes if it doesn't throw - tests nothing |
| **Copy-paste errors** | Assertion copied from success test into failure test | Wrong assertion for the scenario - always passes |
| **The Liar** | `expect(true).toBeTruthy()` or `expect(result).toBeDefined()` on a mutation | Achieves coverage, verifies nothing |
| **The Loudmouth** | `console.log` scattered through test code | Noise obscures actual results; remove |
| **Over-mocking** | More mock setup lines than assertion lines | Testing mock wiring, not application behavior |
| **Sequencer** | Depends on array/object key ordering | Use `toContain`, `expect.objectContaining`, or sort first |

---

## Project Test Infrastructure

### Workspaces & Test Locations

| Workspace | Test Location | Test Type |
|---|---|---|
| `backend` | `backend/src/__tests__/` | API integration tests (supertest + in-memory SQLite) |
| `client` | `client/src/lib/**/*.test.ts` | Unit tests (pure functions, scene models, input handling) |
| `game` | `game/src/__tests__/` | Content validation tests (YAML/JSON schema compliance) |

### Backend Test Setup Pattern

Backend tests create a fresh in-memory SQLite database and Express app per test:

```typescript
import Database from 'better-sqlite3';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { runMigrations } from '../db/run_migrations.js';
import type { AppConfig } from '../shared/config.js';

describe('feature name', () => {
  let db: Database.Database;
  let config: AppConfig;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
    config = {
      port: 3001,
      clientOrigin: 'http://localhost:4321',
      sqlitePath: ':memory:',
      sessionTtlDays: 14,
      cookieName: 'foc_session',
    };
  });

  it('does something specific', async () => {
    const app = createApp(db, config);
    const agent = request.agent(app);

    // Register + authenticate (agent maintains session cookies)
    await agent.post('/api/auth/register').send({
      username: 'courier',
      password: 'highdesert77',
    });

    // Act
    const response = await agent.post('/api/game/action').send({ /* ... */ });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.state.worldState.current_screen).toBe('overworld');
  });
});
```

Key details:
- `request.agent(app)` maintains session cookies across requests (required for auth)
- `runMigrations(db)` applies all SQL migrations from `backend/src/db/migrations/`
- No teardown needed - in-memory DB is garbage collected automatically
- `createApp(db, config)` wires up all services, controllers, and middleware

### Client Test Pattern

Client tests are pure unit tests with inline mock data factories:

```typescript
import { describe, expect, it } from 'vitest';
import type { GameState } from '../api.js';

function createGameState(overrides?: Partial<GameState>): GameState {
  return {
    save: { id: 'save_1', name: 'Test Save', region_id: 'frontier' },
    playerCharacter: { name: 'Courier', level: 1, archetype: 'Scout' },
    worldState: { current_screen: 'overworld', player_x: 2, player_y: 2, /* ... */ },
    // ... full state shape ...
    ...overrides,
  };
}

describe('feature', () => {
  it('computes correct value from game state', () => {
    const state = createGameState();
    const result = someFunction(state);
    expect(result).toBe(expectedValue);
  });
});
```

### Game Content Test Pattern

```typescript
import { describe, expect, it } from 'vitest';
import { validateGameContent } from '../index.js';

describe('game content', () => {
  it('loads and validates authored content', () => {
    const content = validateGameContent();
    expect(content.regions).toHaveLength(1);
    expect(content.locations.length).toBeGreaterThanOrEqual(4);
  });
});
```

---

## Review Checklist

When reviewing tests (new or existing), reject if any item fails:

| # | Check | Reject if... |
|---|---|---|
| 1 | Calls production code | Only calls mocks/helpers |
| 2 | Assertions test behavior | Assertions only verify mock outputs |
| 3 | Assertions are specific | Uses vague truthy/defined checks for specific values |
| 4 | Would fail on bug | Inverting logic would still pass |
| 5 | No branching in test body | Contains `if`/`switch`/ternary/silent `catch` |
| 6 | Non-determinism controlled | Uses wall clock or random without mocking |
| 7 | State changes validated | Mutation test checks only return values |
| 8 | Error contract asserted | No explicit status/error assertions for failure paths |
| 9 | One behavior per test | Multiple unrelated acts/assertions |
| 10 | No leftover diagnostics | `console.log`/debug prints left in file |
| 11 | Fresh state per test | Tests share mutable state or depend on test ordering |

---

## Authoring Workflow (Mandatory)

For every new test file or substantial edit:

1. Write expected behavior bullets first (outside code) from product/domain rules.
2. Add tests for happy path, error path, and boundary/edge cases.
3. Validate at least one assertion by intentionally breaking it once.
4. Run the touched workspace tests first, then run the full suite.

---

## Running Tests

```bash
# Full suite (all workspaces)
npm run test

# Individual workspaces
npm run test -w backend
npm run test -w client
npm run test -w game

# Single file
cd backend && npx vitest run src/__tests__/auth.test.ts
cd client && npx vitest run src/lib/iso.test.ts

# Single test by name
cd backend && npx vitest run -t "registers a user and restores the session"

# Watch mode (development)
cd backend && npx vitest --watch
cd client && npx vitest --watch

# With coverage
cd backend && npx vitest run --coverage
```

## Also Run When Needed

If the change touches authored content directly:
```bash
npm run content:validate
```

If the change touches database setup or migrations:
```bash
npm run db:migrate
```
