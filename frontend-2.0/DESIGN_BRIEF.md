# Kamna Portfolio v2 — Design Brief (read before writing any component)

Goal: rebuild the **April Leihuanani Evangelista** portfolio (One Page Love reference) as a
Next.js 16 / React 19 site, but with **Kamna Bhardwaj's content**.

Reference screenshots (look at these before coding):
- `/private/var/folders/qc/1dlcrc2s7ldc52q1t0z9nh980000gn/T/april-sec1.png` (header, hero, who-i-am, values)
- `/private/var/folders/qc/1dlcrc2s7ldc52q1t0z9nh980000gn/T/april-sec2.png` (about collage, services title, service card 01)
- `/private/var/folders/qc/1dlcrc2s7ldc52q1t0z9nh980000gn/T/april-sec3.png` (service card 02, experience strip)
- `/private/var/folders/qc/1dlcrc2s7ldc52q1t0z9nh980000gn/T/april-sec4.png` (marketing experience statement, video project cards, campaign polaroids)
- `/private/var/folders/qc/1dlcrc2s7ldc52q1t0z9nh980000gn/T/april-sec5.png` (content creation statement, envelope of photos, on camera title)
- `/private/var/folders/qc/1dlcrc2s7ldc52q1t0z9nh980000gn/T/april-sec6.png` (HIT ME UP NOW, contact form + collage, footer)

## Stack / conventions
- Next.js App Router. Files live in `src/`. Path alias `@/*` → `src/*`.
- Plain CSS per component. Import it at the top of the component: `import './x.css'`.
- No new npm dependencies. Use `framer-motion` + `lucide-react` only if needed; CSS is preferred.
- Components are server components by default. Add `'use client'` only when using hooks/motion.
- All copy comes from `src/lib/content.ts` — **do not invent a different story**. Do not edit `content.ts`.
- Reuse collage primitives from `src/components/collage/Decor.tsx`:
  `Polaroid, Tape (cream|blue|pink|dark), Stamp, Pin, Postmark, PaperClip, Doodle (squiggle|arrow|star|circle|sparkle), FilmStrip`.
- Global CSS in `src/app/globals.css` provides tokens + `.wrap`, `.section`, `.rule`, `.eyebrow`,
  `.serif`, `.serif-italic`, `.display`, `.statement` (+ `.statement .accent`), `.link-underline`,
  `.pill`, `.small-caps`, `.muted`, `.polaroid`, `.tape`, `.stamp`, `.pin`, `.paper`, `.doodle`.
  Do not redefine those classes; add section-scoped classes with a unique prefix (e.g. `svc-`, `wrk-`).

## Visual language (match the reference)
- Background `var(--bg)` (#0c0b0a). Text `var(--ink)` (#f3f0e8). Thin 1px rules `var(--line)`.
- Display type = Instrument Serif (`var(--serif)`), often UPPERCASE, huge, tight (`line-height .86`).
  Accent words in italic serif. Body = Inter 300, muted = `var(--muted)`.
- Editorial spacing: sections separated by a full-width hairline rule; generous vertical padding
  (`clamp(72px, 9vw, 148px)`).
- Scrapbook collage: polaroids with white borders + tape, postage stamps, kraft paper, blue/green
  sticky notes, push pins, paper clips, dashed doodles, stamps/postmarks. Rotate elements −12°…+12°.
  Layer with z-index. Shadows soft and dark, never glossy.
- Textures must stay subtle. No bright gradients, no glassmorphism, no rounded "SaaS" cards.
- Section labels are 10–11px uppercase with letter-spacing .14em.
- Responsive: 1280 max width, gutters `var(--gutter)`. Collages collapse to static grids / hide a
  few decorative pieces under 760px. Nothing may overflow horizontally.

## Photo assets (public/)
Portraits/video posters (9:16 unless noted):
`/assets/portfolio/hero-selected.webp`, `/assets/portfolio/reel-01.webp`, `reel-02`, `reel-03`, `reel-04`,
`reel-v2-taco.webp`, `/assets/portfolio/hero.webp`, `/kamna.jpg` (square headshot).
Carousels (4:5): `/assets/portfolio/carousel-01.webp`, `carousel-02.webp`, `carousel-03.webp`,
`carousel-01-02.webp`, `carousel-02-02.webp`, `carousel-03-03.webp`, `carousel-03-04.webp`.
Feeds (9:16): `/assets/portfolio/feed-DXvzWqTMfIp.webp`, `feed-DZ10LkGNC-0.webp`.
Videos: `/assets/portfolio/reel-01.mp4`, `reel-02.mp4`, `reel-03.mp4`, `reel-v2-taco.mp4`.
Brand logos: `/assets/brands/<file>` (see `brands` export in content.ts).
Always use `next/image`. `next.config.ts` already sets `images.unoptimized`; `fill` + `sizes` preferred.

## Accessibility / quality bar
- Semantic landmarks, `alt` on every image, `aria-hidden` for pure decoration.
- Focus-visible outlines must remain visible (do not remove outline without replacement).
- Respect `prefers-reduced-motion` (globals already nerf CSS animations; gate JS motion too).
- No horizontal scrollbars at 375 / 768 / 1440 / 1920.
- Build must pass `npx tsc --noEmit` and `npm run build`.
