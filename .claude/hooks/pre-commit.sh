#!/bin/bash
# Pre-commit hook: Runs type check → lint → test before allowing commit
# Exit code 2 = block the action
# Exit code 0 = allow it

echo "🔍 Running pre-commit checks..."

# Step 1: Type check
echo "📋 Type checking..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ Type check failed! Commit blocked."
  exit 2
fi

# Step 2: Lint staged files
echo "🧹 Linting..."
npx eslint $(git diff --cached --name-only | grep -E "\.(ts|tsx|js|jsx)$") --quiet
if [ $? -ne 0 ]; then
  echo "❌ Linting failed! Commit blocked."
  exit 2
fi

# Step 3: Run tests
echo "🧪 Running tests..."
npm test -- --silent --passWithNoTests
if [ $? -ne 0 ]; then
  echo "❌ Tests failed! Commit blocked."
  exit 2
fi

echo "✅ All checks passed! Committing..."
exit 0
