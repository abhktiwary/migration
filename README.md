# execution-commands

Boltic serverless app for testing **Execution Commands** (one-off commands using your deployed image).

The HTTP server stays running on port 8080. Execution Commands run separately with the commands below.

## Deploy to Boltic

1. Commit and push to your hosted Git remote:

```bash
git add .
git commit -m "Prepare serverless app for execution commands"
git push origin main
```

2. Wait until the app status is **Running** in the Boltic console.

3. Open the app → **Execution Commands** (or equivalent section).

4. Add and run these commands:

| Name | Command |
|------|---------|
| `ping` | `node scripts/ping.js` |
| `migrate-status` | `node scripts/migrate.js status` |
| `migrate-up` | `node scripts/migrate.js up` |
| `migrate-down` | `node scripts/migrate.js down` |

5. After each run, check **Logs** for lines starting with `=== BOLTIC EXECUTION COMMAND`.

## Test locally before push

```bash
npm install

# HTTP server (same as deployed default)
npm start
# curl http://localhost:8080

# Execution-command scripts
npm run ping
npm run migrate:status
npm run migrate:up
npm run migrate:status
```

## Docker (matches Boltic build)

```bash
docker build -t execution-commands .
docker run -p 8080:8080 execution-commands

# Simulate an execution command (overrides CMD)
docker run --rm execution-commands node scripts/ping.js
docker run --rm execution-commands node scripts/migrate.js up
```

## Notes

- No `DATABASE_URL` required — migrations run in **local** mode (no DB connection).
- Set `DATABASE_URL` in `serverlessConfig.Env` only when you want real PostgreSQL.
