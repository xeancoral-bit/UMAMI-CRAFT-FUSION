#!/bin/bash
# Lint-on-save hook: Auto-formats code after edits
# Runs eslint --fix and prettier to keep code clean

echo "🎨 Auto-formatting code..."

# Get all changed TypeScript/JavaScript files
CHANGED_FILES=$(git diff --name-only | grep -E "\.(ts|tsx|js|jsx)$")

if [ -z "$CHANGED_FILES" ]; then
  exit 0
fi

# Run eslint --fix on changed files
echo "🧹 Fixing ESLint issues..."
npx eslint $CHANGED_FILES --fix --quiet

# Run prettier on changed files (optional, remove if not using prettier)
# echo "✨ Formatting with Prettier..."
# npx prettier --write $CHANGED_FILES

echo "✅ Formatting complete!"
exit 0
