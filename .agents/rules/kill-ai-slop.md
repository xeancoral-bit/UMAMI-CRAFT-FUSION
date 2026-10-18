# Kill AI Slop Rule

For every new UI component, screen, or page created or modified in this project, automatically apply the kill-ai-slop principles before considering the design complete.

## Principles to Enforce

1. **Clean Professional UI & Solid Surfaces**:
   - Avoid pointless glassmorphism (`backdrop-filter: blur(...)` over translucent surfaces). Use solid, crisp background surfaces with clean 1px border dividers (`var(--border)` or `var(--rule)`).
   - Avoid atmospheric and multi-color gradients (e.g. indigo→violet, radial gradients as void fillers). Use one deliberate, solid accent color or subtle monochromatic tones.

2. **Intentional Geometry & Border Radii**:
   - Avoid max-radius (`border-radius: 9999px` / `rounded-full`) on containers, cards, and toolbars.
   - Use consistent, nesting border radii (e.g., cards: 8px to 12px; inputs/buttons: 6px to 8px; inner radius = outer radius − padding).

3. **No Emoji as UI Icons**:
   - Never use emoji for buttons, navigation tabs, actions, status indicators, or system dialogs (e.g., do not use 🔔, 🏃, ⚡, 🔋, 📋, 👨‍🍳, 🚨, 🔒, 💾, ❌, ✅ as UI controls).
   - Use proper Lucide icons (`lucide-react`) or standard SVG icons instead.
   - Food/allergen dish metadata can retain domain-specific icons/imagery, but UI controls must use vector icons.

4. **Strong Typography & Hierarchy**:
   - Avoid oversized, shouting display headlines and full-sentence hero titles.
   - Eliminate unnecessary uppercase kickers / overlines above every heading.
   - Avoid decorative serifs where a clean UI sans-serif belongs. Use weight, size ratio (≥1.25x), and intentional whitespace for hierarchy.

5. **Restrained Shadows & Motion**:
   - Never use oversized, blurry, or colored drop shadows (e.g., `box-shadow: 0 20px 60px ...`). Use tight, realistic elevations (e.g. `0 1px 3px rgba(0,0,0,0.08)` or clean border dividers).
   - Avoid springy, exaggerated hover effects (`hover:scale-105`, `hover:-translate-y-2`). Use snappy, purposeful surface transitions (120–200ms standard ease).

6. **Minimal Visual Noise**:
   - Avoid badge & pill spam (e.g. "✨ New", "🔥 Hot"). Use pills strictly for genuine system status states.
   - Avoid left-border accent callouts stacked consecutively. Prefer normal inline copy with clear typography.
