# Project Brain

This is the central source of truth for the project. Claude loads this every session.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **State**: Zustand
- **Database**: Prisma ORM + PostgreSQL
- **Auth**: NextAuth.js or JWT
- **Payment**: Stripe (optional)
- **Deployment**: Vercel
- **Monitoring**: Sentry

## Core Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run test suite
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run type-check   # TypeScript check
```

## Code Conventions

### TypeScript
- Strict mode enabled
- No `any` types allowed
- All functions have return types
- All props have interfaces

### React
- Functional components + hooks only
- Extract to custom hooks if logic is reused
- Use React.memo for expensive components
- Error boundaries for risky components

### State Management
- Zustand for global state
- useState for component-level state
- No prop drilling

### Styling
- Tailwind CSS only
- Dark mode first approach
- Mobile responsive by default
- Component classes in globals.css or shadcn/ui

### Database
- Prisma schema in prisma/schema.prisma
- Migrations for schema changes
- Always validate with Zod before saving
- Encrypt sensitive fields

### Testing
- Jest for unit tests
- React Testing Library for components
- Playwright for E2E tests
- 80%+ coverage on critical paths

## Folder Structure

```
project/
├── app/              # Next.js app router
├── components/       # Reusable React components
├── lib/              # Utilities and helpers
├── pages/            # API routes (if using pages router)
├── prisma/           # Database schema
├── public/           # Static assets
├── styles/           # Global styles
├── tests/            # Test files
├── .claude/          # Claude configuration
└── CLAUDE.md         # This file
```

## Environment Variables

Required `.env.local`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

Never commit `.env.local` to git. Use `.env.example` for documentation.

## Git Workflow

1. Create feature branch: `git checkout -b feature/description`
2. Make changes and test locally
3. Commit with semantic messages: `feat: add feature` or `fix: resolve issue #123`
4. Push to GitHub: `git push origin feature/description`
5. Create PR with description
6. Wait for code review and CI to pass
7. Merge with `Squash and merge`

Allowed commit types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code structure
- `perf:` Performance
- `test:` Test additions
- `chore:` Dependencies

## Deployment

### Development
```bash
npm run dev
```

### Staging
```bash
git push origin develop
# Vercel auto-deploys from develop branch
```

### Production
```bash
git checkout main
git merge develop
git push origin main
# Vercel auto-deploys from main branch
```

## Quality Gates

All code must pass:
- ✅ TypeScript type check
- ✅ ESLint linting
- ✅ Test suite (Jest + React Testing Library)
- ✅ Code review (security, performance, quality)

**Pre-commit hook blocks commits that fail these checks.**

## Debugging

### Frontend Issues
1. Check browser DevTools Console for errors
2. Use React DevTools to inspect component state
3. Add console.log statements (remove before commit)
4. Check Network tab for API issues

### API Issues
1. Check server logs: `npm run dev` output
2. Test endpoint with curl or Postman
3. Check database connection in Prisma Studio: `npx prisma studio`

### Database Issues
1. Run migrations: `npx prisma migrate deploy`
2. Introspect schema: `npx prisma db pull`
3. View data in Prisma Studio: `npx prisma studio`

## Performance Tips

- Use Next.js Image component
- Code-split routes with React.lazy()
- Lazy load components below the fold
- Debounce/throttle event handlers
- Use useMemo/useCallback wisely
- Monitor with Sentry/LogRocket

## Security Checklist

- [ ] No hardcoded secrets (use environment variables)
- [ ] Input validation on all forms
- [ ] SQL injection protection (Prisma handles this)
- [ ] CORS configured correctly
- [ ] HTTPS enforced in production
- [ ] Rate limiting on API endpoints
- [ ] XSS protection (React default)
- [ ] CSRF tokens on state-changing operations
- [ ] Dependencies up to date (`npm audit`)

## Available Agents

Invoke agents with `/agent-name` or assign with comments:

- **code-reviewer**: Reviews code for bugs and security
- **debugger**: Diagnoses and fixes runtime errors
- **test-writer**: Writes comprehensive tests
- **refactorer**: Improves code quality
- **doc-writer**: Creates documentation
- **security-auditor**: Performs security audits

## Available Commands

Invoke with slash commands:

- `/fix-issue [number]`: Fix a GitHub issue
- `/deploy [environment]`: Deploy to staging/production
- `/pr-review [number]`: Review a pull request

## Need Help?

1. Check this file for conventions
2. Run `/code-reviewer` to review your code
3. Run `npm run lint` to catch style issues
4. Check `.claude/` folder for detailed rules
5. Review existing code for patterns

---

Last Updated: 2026-04-20
Questions? Check `.claude/` for detailed instructions for agents, commands, rules, and skills.
