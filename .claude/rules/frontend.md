---
paths:
  - "components/**/*.tsx"
  - "components/**/*.ts"
  - "app/**/*.tsx"
  - "pages/**/*.tsx"
  - "src/components/**/*.tsx"
---

# Frontend Rules

Your code is running in React. Follow these rules strictly.

## Components
- Functional components + hooks only, no class components
- shadcn/ui for all UI primitives, never build from scratch
- Extract reusable components for anything used twice
- Use React.memo() for expensive components
- Implement error boundaries for risky components

## State Management
- Zustand for global state
- useState for local component state
- No prop drilling (use context or Zustand)
- Avoid state updates in render

## Styling
- Tailwind CSS only, no inline styles
- Dark mode first approach
- Use cn() for conditional classes
- 16px border radius standard
- Consistent spacing: 4, 8, 12, 16, 24, 32px

## Images & Media
- next/image for all images
- Always specify width and height
- Use placeholder while loading
- WebP format for new images

## Performance
- Code-split routes with React.lazy()
- Lazy load components below the fold
- Use useMemo for expensive calculations
- Debounce/throttle event handlers
- Profile with React DevTools

## Accessibility
- Semantic HTML (button, link, form, etc)
- ARIA labels where needed
- Keyboard navigation support
- Color not the only indicator
- Test with screen readers
