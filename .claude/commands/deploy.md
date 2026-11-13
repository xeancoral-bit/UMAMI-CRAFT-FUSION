---
name: deploy
argument-hint: [environment]
---

Deploy the application to $ARGUMENTS (staging or production):

1. **Check Status** — Verify all tests pass and code is committed
2. **Build** — Run `npm run build` to ensure no build errors
3. **Verify** — Run smoke tests against build output
4. **Environment** — Set up environment variables for $ARGUMENTS
5. **Deploy** — Push to $ARGUMENTS deployment target (Vercel/AWS/etc)
6. **Monitor** — Check logs and health checks after deployment
7. **Smoke Test** — Run quick integration tests against live deployment
8. **Verify** — Confirm all critical features work in $ARGUMENTS

Usage: `/deploy staging` or `/deploy production`

Note: Production deployments require all tests passing.
