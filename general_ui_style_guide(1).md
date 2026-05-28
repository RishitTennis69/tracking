# General UI Style Guide: Clean Editorial SaaS Style

Use this guide to create UI that feels premium, calm, trustworthy, and product-focused. This is **not** a landing page structure. It is a reusable visual system for any interface: dashboards, forms, web apps, settings pages, pricing screens, onboarding flows, admin panels, reports, modals, and marketing pages.

The core style is: **white space, elegant serif headings, neutral sans-serif body text, soft cards, thin borders, muted grays, and restrained blue accents.**

---

## 1. Overall Design Feel

The UI should feel:

- Clean and high-trust
- Spacious and uncluttered
- Editorial, but still practical
- Premium without looking flashy
- Calm, not loud
- Structured, not chaotic
- Modern, but not overly “AI-generated”

Avoid:

- Heavy gradients everywhere
- Neon colors
- Emoji icons
- Overly glassy cards
- Random colorful badges
- Thick borders
- Too many shadows
- Too many different font sizes
- Dense blocks of text
- Generic startup-template sections

The design should look like a polished product from a serious company, not a template filled with random UI effects.

---

## 2. Color System

### Primary Palette

Use a mostly neutral palette with blue as the main accent.

```css
:root {
  --color-bg: #ffffff;
  --color-bg-soft: #f7f8fb;
  --color-bg-muted: #f2f4f8;

  --color-text: #0b0d12;
  --color-text-muted: #536071;
  --color-text-soft: #8b95a5;
  --color-text-faint: #b7bfcc;

  --color-border: #e4e8f0;
  --color-border-strong: #cdd5e3;

  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-soft: #eff5ff;
  --color-primary-border: #bcd2ff;

  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-danger: #dc2626;
}
```

### Usage Rules

Use white as the dominant background. Use soft gray backgrounds to separate major areas or containers. Use blue only for important actions, selected states, links, highlights, and active indicators.

Do **not** use blue everywhere. The blue works because the rest of the design is quiet.

### Good Color Balance

- 70–80% white / off-white
- 15–20% gray and border colors
- 5–10% blue accents
- Tiny amounts of success, warning, or danger colors only when needed

### Accent Color Rules

Use blue for:

- Primary buttons
- Active tabs
- Important links
- Selected states
- Focus rings
- Highlighted words or numbers
- Chart lines
- Small status dots

Avoid using blue for:

- Every icon
- Every card border
- Large backgrounds
- Decorative blobs everywhere
- Long paragraphs of text

---

## 3. Typography

This style works best with a serif display font for headings and a clean sans-serif for everything else.

### Recommended Font Pairings

Option 1:

```css
--font-heading: "Georgia", "Times New Roman", serif;
--font-body: "Inter", "Helvetica Neue", Arial, sans-serif;
```

Option 2:

```css
--font-heading: "Playfair Display", "Georgia", serif;
--font-body: "Inter", system-ui, sans-serif;
```

Option 3:

```css
--font-heading: "Instrument Serif", "Georgia", serif;
--font-body: "Inter", system-ui, sans-serif;
```

### Heading Style

Headings should be large, elegant, and slightly editorial.

```css
.heading-xl {
  font-family: var(--font-heading);
  font-size: clamp(3rem, 7vw, 6rem);
  line-height: 0.95;
  letter-spacing: -0.045em;
  font-weight: 500;
}

.heading-lg {
  font-family: var(--font-heading);
  font-size: clamp(2.25rem, 5vw, 4rem);
  line-height: 1;
  letter-spacing: -0.04em;
  font-weight: 500;
}

.heading-md {
  font-family: var(--font-heading);
  font-size: clamp(1.75rem, 3vw, 2.75rem);
  line-height: 1.05;
  letter-spacing: -0.035em;
  font-weight: 500;
}
```

### Body Text Style

Body text should be calm and readable.

```css
.body {
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.65;
  color: var(--color-text-muted);
}

.body-sm {
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--color-text-muted);
}
```

### Labels and Eyebrows

Use small uppercase labels for section labels, card labels, statuses, and metadata.

```css
.label {
  font-family: var(--font-body);
  font-size: 0.72rem;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--color-text-soft);
}
```

### Typography Rules

- Use serif fonts for big headings only.
- Use sans-serif fonts for body text, UI labels, buttons, tables, forms, and dashboards.
- Keep line lengths controlled. Paragraphs should usually be 45–70 characters wide.
- Do not center long paragraphs.
- Use blue highlights inside headings sparingly.

Example:

```html
<h1>Know where you win, where you lose, and <span>what to fix next.</span></h1>
```

```css
h1 span {
  color: var(--color-primary);
}
```

---

## 4. Spacing System

Use generous spacing. This style depends on breathing room.

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
}
```

### Layout Spacing Rules

- Small component padding: `12–16px`
- Card padding: `24–32px`
- Large panels: `32–48px`
- Section padding: `72–120px`
- Grid gaps: `20–32px`
- Form field gaps: `12–16px`

UI should never feel cramped. When in doubt, add more vertical spacing instead of adding more decoration.

---

## 5. Border Radius

Use soft, medium-rounded corners. Avoid extreme pill-shaped cards unless used for small badges or buttons.

```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 22px;
  --radius-full: 999px;
}
```

### Radius Usage

- Inputs: `10–12px`
- Buttons: `10–12px`
- Small cards: `14–16px`
- Large panels: `18–22px`
- Badges/pills: `999px`

---

## 6. Shadows and Depth

Use shadows quietly. The goal is subtle elevation, not floating glass cards.

```css
:root {
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 24px 70px rgba(15, 23, 42, 0.12);
}
```

### Shadow Rules

Use shadows for:

- Important panels
- Floating cards
- Dropdowns
- Modals
- Primary buttons

Avoid shadows on every small component. Most components should rely on borders instead.

---

## 7. Borders

Borders are important in this style. Use thin, soft borders to define structure.

```css
.card {
  border: 1px solid var(--color-border);
}
```

### Border Rules

- Use `#e4e8f0` for normal borders.
- Use `#cdd5e3` for active or stronger borders.
- Use blue-tinted borders only for selected states or important panels.
- Avoid black borders except for rare high-contrast elements.

---

## 8. Backgrounds

### Main Backgrounds

Use mostly white and very light gray.

```css
.surface-main {
  background: #ffffff;
}

.surface-soft {
  background: #f7f8fb;
}

.surface-muted {
  background: #f2f4f8;
}
```

### Subtle Radial Glow

Use soft background glow when a screen needs depth.

```css
.bg-radial-soft {
  background:
    radial-gradient(circle at center, rgba(37, 99, 235, 0.08), transparent 45%),
    #ffffff;
}
```

### Grid Background

Use faint grid backgrounds inside empty states, demo panels, reports, or large callout containers.

```css
.bg-grid {
  background-image:
    linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148, 163, 184, 0.12) 1px, transparent 1px);
  background-size: 22px 22px;
}
```

### Background Rules

- Use patterns lightly.
- Never let patterns reduce readability.
- Keep decorative backgrounds low-contrast.
- Do not use intense gradients behind normal text.

---

## 9. Cards

Cards are one of the core UI components in this style.

### Base Card

```css
.card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}
```

### Elevated Card

```css
.card-elevated {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 32px;
  box-shadow: var(--shadow-md);
}
```

### Selected Card

```css
.card-selected {
  background: #f8fbff;
  border: 1px solid var(--color-primary-border);
  box-shadow: 0 12px 32px rgba(37, 99, 235, 0.12);
}
```

### Muted Card

```css
.card-muted {
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
```

### Card Rules

- Give every card one clear job.
- Use a small icon or label at the top only when useful.
- Keep card text short.
- Avoid stuffing too many metrics into one card.
- Use subtle hover states for clickable cards.

```css
.card-clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-strong);
}
```

---

## 10. Buttons

Buttons should be simple and confident.

### Primary Button

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  font-size: 0.925rem;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}
```

### Secondary Button

```css
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  background: #ffffff;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  font-weight: 600;
  font-size: 0.925rem;
}

.btn-secondary:hover {
  border-color: var(--color-border-strong);
  background: var(--color-bg-soft);
}
```

### Ghost Button

```css
.btn-ghost {
  background: transparent;
  color: var(--color-text-muted);
  font-weight: 600;
}

.btn-ghost:hover {
  color: var(--color-text);
}
```

### Button Rules

- Use one primary action per screen area.
- Secondary buttons should be quieter.
- Avoid giant pill buttons unless the rest of the interface uses rounder shapes.
- Arrows are useful for forward actions, but do not overuse them.

---

## 11. Inputs and Forms

Forms should feel clean, calm, and easy to complete.

```css
.input {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  border: 1px solid var(--color-border-strong);
  background: #ffffff;
  padding: 0 14px;
  font-size: 0.95rem;
  color: var(--color-text);
}

.input::placeholder {
  color: var(--color-text-soft);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}
```

### Form Rules

- Labels should be small, clear, and above the input.
- Do not hide important labels inside placeholders.
- Use helper text under fields when needed.
- Validation messages should be concise.
- Group related fields inside soft cards or panels.

---

## 12. Badges, Pills, and Status Labels

Use badges sparingly. They should help the user scan, not decorate randomly.

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 9px;
  border-radius: var(--radius-full);
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-primary {
  background: var(--color-primary-soft);
  border-color: var(--color-primary-border);
  color: var(--color-primary);
}
```

### Badge Rules

Use badges for:

- Status
- Priority
- Category
- Plan type
- New feature labels

Avoid using badges as random decoration.

---

## 13. Icons

Use simple line icons with consistent stroke width.

Recommended icon libraries:

- Lucide
- Heroicons
- Feather Icons
- Phosphor Icons

### Icon Style

```css
.icon-box {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-soft);
  border: 1px solid var(--color-primary-border);
  color: var(--color-primary);
}
```

### Icon Rules

- Keep icons small and crisp.
- Use one icon style across the entire UI.
- Do not mix filled icons, emojis, and line icons.
- Do not make icons overly colorful.
- Icons should support text, not replace it.

---

## 14. Navigation Components

This style works well with quiet, structured navigation.

### Top Nav

```css
.navbar {
  height: 68px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--color-border);
}
```

### Tabs

```css
.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.tab {
  padding: 8px 12px;
  border-radius: 9px;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 600;
}

.tab-active {
  background: #ffffff;
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}
```

### Sidebar

For apps or dashboards, use a clean sidebar with muted text, simple icons, and a clear selected state.

```css
.sidebar-item-active {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border: 1px solid var(--color-primary-border);
}
```

---

## 15. Tables and Lists

Tables should be light and readable, not spreadsheet-heavy.

```css
.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.table th {
  background: var(--color-bg-soft);
  color: var(--color-text-soft);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.table td,
.table th {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}
```

### List Rows

```css
.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  background: #ffffff;
  border-radius: 12px;
}
```

### Rules

- Use clear row spacing.
- Keep headers muted.
- Use blue only for links or selected rows.
- Avoid zebra stripes unless the table is dense.

---

## 16. Metric Cards and Dashboards

Metrics should feel useful, not fake or decorative.

### Metric Card

```css
.metric-card {
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 18px;
}

.metric-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-soft);
  font-weight: 700;
}

.metric-value {
  font-family: var(--font-heading);
  font-size: 2rem;
  line-height: 1;
  color: var(--color-text);
}
```

### Dashboard Rules

- Use 3–5 top-level metrics maximum.
- Put the most important metric first.
- Use small charts, progress bars, and trend lines instead of giant decorative cards.
- Keep charts low contrast and readable.
- Use blue as the primary chart line.
- Use gray gridlines and muted labels.

---

## 17. Charts and Data Visualization

Use charts that feel calm and professional.

### Chart Style

- Blue line or bar for primary data
- Light gray axes
- Very faint gridlines
- No rainbow colors unless comparing many categories
- Minimal labels
- Rounded bars when possible
- Soft blue area fill under line charts

### Progress Bar

```css
.progress {
  height: 6px;
  border-radius: 999px;
  background: #e8edf5;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}
```

---

## 18. Modals, Popovers, and Dropdowns

Floating UI should feel crisp and intentional.

```css
.modal {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  padding: 28px;
}

.dropdown {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: var(--shadow-md);
  padding: 8px;
}
```

### Rules

- Use strong shadows only for floating layers.
- Keep modal titles clear and concise.
- Put primary action on the right or as the most visually dominant button.
- Use muted overlay backgrounds: `rgba(15, 23, 42, 0.35)`.

---

## 19. Empty States

Empty states should be minimal and reassuring.

```css
.empty-state {
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-xl);
  background: var(--color-bg-soft);
  padding: 48px;
  text-align: center;
}
```

### Empty State Rules

- Use one simple icon.
- Use one clear headline.
- Explain what happens next.
- Include one action if useful.
- Do not over-illustrate.

---

## 20. Callouts and Alerts

Use callouts to make information stand out without yelling.

```css
.callout {
  border: 1px solid var(--color-border);
  background: var(--color-bg-soft);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
}

.callout-primary {
  border-color: var(--color-primary-border);
  background: var(--color-primary-soft);
}
```

### Alert Rules

- Use warning/danger colors only when needed.
- Keep alert copy short.
- Use icons only if they clarify the message.
- Avoid full-width red alerts for minor issues.

---

## 21. Accordions

Accordions should be quiet, bordered, and easy to scan.

```css
.accordion-item {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  overflow: hidden;
}

.accordion-trigger {
  padding: 18px 20px;
  font-weight: 600;
  color: var(--color-text);
}

.accordion-content {
  padding: 0 20px 20px;
  color: var(--color-text-muted);
  line-height: 1.6;
}
```

### Rules

- One question or topic per accordion item.
- Use a chevron icon on the right.
- Rotate the chevron when open.
- Do not hide critical information inside accordions.

---

## 22. Comparison Components

Comparison UI should be simple and readable.

### Comparison Row

```css
.comparison-row {
  display: grid;
  grid-template-columns: 1.5fr repeat(3, 1fr);
  align-items: center;
  min-height: 52px;
  border-bottom: 1px solid var(--color-border);
}

.comparison-featured-col {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
```

### Rules

- Highlight one recommended option with a blue-tinted column or border.
- Use check and x icons consistently.
- Keep labels short.
- Do not make every cell colorful.

---

## 23. Pricing or Plan Cards

Plan cards should be calm and clear.

```css
.plan-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 28px;
}

.plan-card-featured {
  border-color: var(--color-primary-border);
  box-shadow: 0 18px 45px rgba(37, 99, 235, 0.12);
}
```

### Rules

- Make one plan visually featured.
- Use simple checklists.
- Use strong price hierarchy.
- Keep CTA text clear.
- Avoid overly complicated pricing tables.

---

## 24. Motion and Hover States

Motion should be subtle.

```css
.interactive {
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}
```

### Motion Rules

Use motion for:

- Hover lift on cards
- Button hover color change
- Accordion opening
- Modal entrance
- Tab switching

Avoid:

- Excessive bouncing
- Long animations
- Constant moving backgrounds
- Overly dramatic scroll effects

---

## 25. Layout Principles

This guide is not tied to any specific page type, but the layout should follow these rules.

### Container Widths

```css
.container {
  width: min(1120px, calc(100% - 40px));
  margin-inline: auto;
}

.container-narrow {
  width: min(760px, calc(100% - 40px));
  margin-inline: auto;
}
```

### Grid Rules

- Use 12-column grids for complex layouts.
- Use 2–4 column grids for cards.
- Collapse to one column on mobile.
- Keep consistent gaps.

```css
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

@media (max-width: 800px) {
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
```

### Composition Rules

- Align related items precisely.
- Keep max widths intentional.
- Use whitespace before adding decoration.
- Group related information into cards or panels.
- Do not let every section/component have the same visual weight.

---

## 26. Responsive Rules

The design should stay calm on mobile.

Mobile adjustments:

- Reduce large heading sizes.
- Stack columns vertically.
- Increase tap targets to at least `44px` high.
- Reduce section padding from `96px` to `56px`.
- Avoid horizontal scrolling.
- Hide nonessential nav links behind a menu.
- Keep cards full-width.

---

## 27. Accessibility Rules

Do not sacrifice usability for style.

- Maintain strong text contrast.
- Use visible focus states.
- Do not rely on color alone to show status.
- Use semantic buttons and links.
- Make form labels visible.
- Ensure keyboard navigation works.
- Use `aria-expanded` for accordions.
- Use `aria-current` for selected navigation items.

Focus style:

```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.18);
}
```

---

## 28. Anti-Vibecode Rules

To keep the UI from looking generic or AI-generated:

- Do not use emojis as icons.
- Do not use random gradient blobs.
- Do not use five different accent colors.
- Do not make every card the same size if the content does not need it.
- Do not center every paragraph.
- Do not use huge fake KPI cards everywhere.
- Do not overuse glassmorphism.
- Do not add decorative badges unless they communicate something.
- Do not use bright red/green unless they are real status states.
- Do not fill the page with vague text and oversized cards.

The strongest version of this style comes from restraint. The UI should feel designed, not decorated.

---

## 29. Component Checklist

Use this checklist when building any screen.

### Visual System

- White or soft gray background
- Serif display headings
- Sans-serif UI/body text
- Blue accent used sparingly
- Thin gray borders
- Soft shadows only where needed
- Rounded but not cartoonish corners

### Components

- Buttons are clear and hierarchy-driven
- Inputs are clean with visible focus states
- Cards have one clear purpose
- Icons are consistent line icons
- Tables are light and readable
- Charts are simple and calm
- Modals are focused and not overloaded

### Layout

- Generous spacing
- Clear alignment
- Controlled text widths
- Responsive card grids
- No cramped sections
- No random decoration

---

## 30. Quick Design Prompt

Use this prompt when asking an AI design tool to build with this style:

> Create a clean, premium UI using a mostly white and soft-gray color system with restrained blue accents. Use elegant serif typography for major headings and a neutral sans-serif for body text and UI labels. Components should have thin gray borders, soft rounded corners, subtle shadows, and generous spacing. Use calm cards, crisp line icons, simple tables, understated charts, and accessible form controls. Avoid neon colors, emoji icons, heavy glassmorphism, loud gradients, generic startup clutter, and overly dense layouts. The result should feel editorial, high-trust, modern, and product-focused.

---

## 31. Tailwind Token Translation

If using Tailwind, approximate the style like this:

```txt
Backgrounds: bg-white, bg-slate-50, bg-slate-100
Text: text-slate-950, text-slate-600, text-slate-400
Borders: border-slate-200, border-slate-300
Primary: blue-600, blue-700, blue-50, blue-200
Radius: rounded-xl, rounded-2xl, rounded-[22px]
Shadows: shadow-sm, shadow-lg, custom soft shadows
Spacing: px-6, py-8, gap-6, section py-24
Fonts: serif headings + Inter/system sans body
```

A good default card in Tailwind:

```html
<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div class="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600">
    <!-- icon -->
  </div>
  <h3 class="font-serif text-2xl tracking-tight text-slate-950">Card title</h3>
  <p class="mt-2 text-sm leading-6 text-slate-600">Card description goes here.</p>
</div>
```

A good default primary button in Tailwind:

```html
<button class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20">
  Continue
  <span aria-hidden="true">→</span>
</button>
```
