---
name: frontend-design
description: Apply consistent design standards to any UI. Colors, typography, spacing, animations, dark mode.
user-invocable: true
applies-to: components
---

# Design System

Use these standards for every UI component and page.

## Color Palette

### Primary Colors
- Primary: #FF6B35 (Coral/Orange)
- Secondary: #004E89 (Navy Blue)
- Accent: #F7B801 (Gold)

### Backgrounds
- Background: #0A0A0F (Near black with blue tint)
- Surface Primary: #1A1A23 (Slightly lighter)
- Surface Secondary: #242433 (Even lighter)
- Overlay: rgba(255, 255, 255, 0.04) (Subtle surfaces)

### Text Colors
- Text Primary: #FFFFFF
- Text Secondary: #A0A0AF
- Text Tertiary: #80808B
- Text Inverted: #000000

### Status Colors
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444
- Info: #3B82F6

## Typography

### Font Family
- Primary: Inter (or -apple-system, BlinkMacSystemFont as fallback)
- Mono: Fira Code (for code blocks)

### Font Sizes & Weights
- Hero Title: 48px, Weight 700, Letter-spacing -0.02em
- Title: 32px, Weight 600, Letter-spacing -0.01em
- Heading: 24px, Weight 600
- Subheading: 18px, Weight 600
- Body: 15-16px, Weight 400
- Small: 14px, Weight 400
- Micro: 12px, Weight 500

## Spacing System

Maintain consistent spacing throughout the design:
- Sections: 64px vertical spacing
- Components: 32px padding/margin
- Cards: 24px internal padding
- Elements: 16px for smaller components
- Micro spacing: 8px, 4px

## Border Radius

- Large containers: 20px
- Standard cards: 16px
- Buttons: 12px
- Small elements: 8px

## Dark Mode Design

- Never use flat #000000. Use depths through:
  - Gradients: Linear gradients for subtle depth
  - Glows: Subtle box-shadows with colored glows
  - Borders: Thin borders with rgba(255, 255, 255, 0.08)
  - Layering: Stacked surfaces at different opacities

### Shadow Elevation Levels

```
Elevation 1: 0 1px 2px rgba(0, 0, 0, 0.05)
Elevation 2: 0 4px 6px rgba(0, 0, 0, 0.1)
Elevation 3: 0 10px 15px rgba(0, 0, 0, 0.2)
Elevation 4: 0 20px 25px rgba(0, 0, 0, 0.3)
```

## Components

### Buttons
- Primary: #FF6B35 background, #FFFFFF text
- Secondary: #1A1A23 background, #FF6B35 text, border 1px #FF6B35
- Danger: #EF4444 background, #FFFFFF text
- Disabled: #404049 background, #80808B text, no cursor
- Padding: 12px 24px
- Border radius: 12px
- Hover: Slightly lighter shade + subtle lift

### Cards
- Background: #1A1A23
- Border: 1px solid rgba(255, 255, 255, 0.08)
- Padding: 24px
- Border radius: 16px
- Hover: Background #242433, border rgba(255, 255, 255, 0.16)

### Input Fields
- Background: #0A0A0F
- Border: 1px solid rgba(255, 255, 255, 0.12)
- Text: #FFFFFF
- Placeholder: #80808B
- Focus: Border #FF6B35, box-shadow 0 0 0 3px rgba(255, 107, 53, 0.1)
- Padding: 12px 16px
- Border radius: 12px

### Code Blocks
- Background: #0F0F14
- Text: #E0E0E8
- Border: 1px solid rgba(255, 255, 255, 0.08)
- Font: Fira Code, 14px
- Line height: 1.5

## Animations

### Transitions
- Quick interactions: 100-150ms
- UI changes: 200-300ms
- Page transitions: 300-500ms
- Easing: cubic-bezier(0.4, 0, 0.2, 1) for ease-in-out

### Hover Effects
- Slight scale: transform scale(1.02)
- Glow: Add box-shadow with primary color
- Brightness: opacity-80 to opacity-100

### Loading States
- Use spinner or skeleton
- Skeleton: Pulsing opacity between 0.5-1.0
- Spinner: Rotating SVG or animation

## Accessibility

- Minimum color contrast: 4.5:1 for normal text, 3:1 for large text
- Focus indicators: 2px solid #FF6B35
- All interactive elements keyboard accessible
- ARIA labels for complex interactions
- Motion reduced: Respect prefers-reduced-motion

## Layout

- Max content width: 1280px
- Container padding: 24px on mobile, 48px on desktop
- Grid gap: 24px
- Breakpoints:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
