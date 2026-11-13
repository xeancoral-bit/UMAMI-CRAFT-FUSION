---
paths:
  - "src/db/**/*.ts"
  - "src/models/**/*.ts"
  - "src/schemas/**/*.ts"
  - "prisma/**/*.prisma"
---

# Database Rules

You are writing code that touches the database. Follow these rules.

## Schema Design
- Use Prisma as ORM
- All tables have id (primary key) and timestamps (createdAt, updatedAt)
- Foreign keys always reference correct types
- Enums for fixed categories
- Indexes on frequently queried fields

## Queries
- Use select() to fetch only needed fields
- Eager load relations with include()
- Paginate large result sets
- Use where() to filter before fetch
- Avoid N+1 queries (use batch queries)

## Data Validation
- Use Zod for all input validation
- Validate types, lengths, ranges
- Sanitize user inputs to prevent injection
- Check permissions before database access

## Migrations
- Create new migration for schema changes
- Include both up and down migrations
- Test migrations before deploying
- Never delete data without backup

## Performance
- Create indexes on foreign keys
- Create indexes on frequently filtered fields
- Use EXPLAIN to analyze slow queries
- Cache read-heavy data
- Archive old data to reduce table size

## Security
- No hardcoded SQL (always use Prisma)
- Parameterized queries for any raw SQL
- Never expose database credentials
- Use environment variables for DB connection
- Encrypt sensitive fields
