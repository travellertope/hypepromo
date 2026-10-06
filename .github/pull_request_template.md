## What

<!-- One paragraph. What does this PR change and why? -->

## Checklist

- [ ] `pnpm turbo typecheck` passes locally
- [ ] `pnpm turbo test` passes locally
- [ ] New schema changes have a migration (`pnpm --filter @promoet/db db:generate`)
- [ ] Money amounts are in kobo; no magic numbers (use `@promoet/config` constants)
- [ ] No secrets, keys or PII committed
- [ ] `docs/STANDARDS.md` security rules followed
