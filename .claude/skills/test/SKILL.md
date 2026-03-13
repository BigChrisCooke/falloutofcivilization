# /test

Use this when you need to verify the repo still behaves safely after changes.

## Run From

Run from the repo root.

## Command

```bash
npm run test
```

## What It Covers

- game content validation tests with coverage
- backend auth tests with coverage

## Also Run When Needed

If the change touches authored content directly, also run:

```bash
npm run content:validate
```

If the change touches database setup or migrations, also run:

```bash
npm run db:migrate
```

## Success Looks Like

- all tests pass
- coverage runs without errors
- no content validation failures

## If It Fails

- read the first failing file and error carefully
- do not skip the failure and continue
- if content validation failed, fix the YAML or schema mismatch
- if backend auth tests failed, inspect `backend/src/` before changing frontend code

## Do Not Skip

- `npm run content:validate` when changing `game/content/` or content schemas
