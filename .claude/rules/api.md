---
paths:
  - "src/api/**/*.ts"
  - "pages/api/**/*.ts"
  - "src/routes/**/*.ts"
---

# API Rules

You are building an API endpoint. Follow these rules.

## Endpoints
- RESTful design: GET, POST, PUT, DELETE
- Consistent URL structure: /api/resource or /api/resource/:id
- Version API if breaking changes: /api/v1/resource
- Snake_case for URL paths
- Return appropriate HTTP status codes

## Request/Response
- Validate request body with Zod
- Parse JSON and form-data correctly
- Return JSON with consistent structure
- Always include error messages
- Use proper status codes: 200, 201, 400, 401, 403, 404, 500

## Authentication
- Require authentication for protected endpoints
- Verify JWT tokens or sessions
- Check user permissions/roles
- Return 401 for missing auth
- Return 403 for permission denied

## Error Handling
- Catch all errors and return proper status
- Log errors for debugging
- Don't expose internal errors to client
- Return consistent error format
- Include error codes for client handling

## Data
- Return only necessary fields
- Paginate large result sets
- Filter, sort, search on common fields
- Use database queries efficiently
- Cache responses when appropriate

## Security
- No hardcoded secrets in code
- Use environment variables for config
- Validate all inputs (no SQL injection)
- Rate limit endpoints
- CORS configured correctly
- HTTPS enforced in production
- Sanitize error messages
