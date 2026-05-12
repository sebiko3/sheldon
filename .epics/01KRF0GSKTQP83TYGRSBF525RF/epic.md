---
id: 01KRF0GSKTQP83TYGRSBF525RF
brief: "Create a neat little landing page running on GitHub Pages that presents Sheldon. Super awesome spacey futuristic aesthetic. Should explain what Sheldon is, show how missions work, and link to install."
created_at: "2026-05-12T21:12:07.546Z"
issues:
  - id: 1
    title: "Bootstrap docs/ for GitHub Pages with .nojekyll and Pages-from-/docs note"
    rationale: "Pages from /docs needs a single explicit toggle and a .nojekyll file so existing markdown (PLATFORM.md, RELEASING.md, walkthrough.md) keeps serving raw. This must land before any HTML/CSS work so contributors can preview locally and the URL format is stable for inbound links."
    acceptance_sketch:
      - "File docs/.nojekyll exists and is zero bytes (`test -f docs/.nojekyll && test ! -s docs/.nojekyll`)."
      - "docs/RELEASING.md gains a short subsection mentioning the one-time Settings -> Pages -> Source = /docs on main toggle (`grep -q 'Pages' docs/RELEASING.md`)."
      - "Existing files docs/PLATFORM.md, docs/RELEASING.md, docs/walkthrough.md are unchanged in path and still parseable as markdown (`test -f` each; line counts within +/-50% of pre-mission baseline)."
      - "No new top-level config files (no _config.yml, no Gemfile) are introduced (`test ! -f docs/_config.yml && test ! -f docs/Gemfile`)."
    status: proposed
    promoted_mission_id: null
  - id: 2
    title: "Author docs/index.html skeleton with semantic sections and meta tags"
    rationale: "A zero-build HTML skeleton with the right semantic anchors (hero, how-it-works, features, install, footer) and Open Graph + Twitter meta tags lets later issues fill in visuals without re-litigating page structure or social previews."
    acceptance_sketch:
      - "docs/index.html exists, parses (HTML doctype plus matching tag count via a python html.parser smoke check), and is under 30KB (`wc -c < docs/index.html` -lt 30720)."
      - "Contains sections with ids hero, how-it-works, features, install, footer (five `grep -q 'id=\"<id>\"'` checks pass)."
      - "Has meta description, og:title, og:description, og:image, twitter:card tags (all five `grep -q` checks pass)."
      - "Links to the GitHub repo URL and to ./walkthrough.md (`grep -q 'walkthrough.md' docs/index.html`)."
    status: proposed
    promoted_mission_id: null
  - id: 3
    title: "Spacey-futuristic CSS theme plus lightweight starfield JS animation"
    rationale: "Carries the aesthetic: dark background, neon/cyan accents, monospace tech typography, subtle starfield canvas. Self-hosted assets only — no CDNs, no framework — keeps the install-free promise and stays inside the page-weight budget."
    acceptance_sketch:
      - "docs/assets/style.css and docs/assets/main.js exist; each under 50KB (`wc -c` checks)."
      - "style.css declares custom properties for at least --bg, --fg, --accent and references a monospace stack (`grep -q 'monospace' docs/assets/style.css`)."
      - "main.js defines a starfield via requestAnimationFrame and a canvas (`grep -q 'requestAnimationFrame' docs/assets/main.js && grep -q '<canvas' docs/index.html`)."
      - "No external script/style URLs in index.html: zero matches for `src=\"http` or external CSS hrefs (`! grep -E 'src=\"https?://|href=\"https?://[^\"]+\\.css' docs/index.html`)."
    status: proposed
    promoted_mission_id: null
  - id: 4
    title: "Hero plus How-it-works flow (Orchestrator -> Worker -> Validator)"
    rationale: "The single most important explanatory beat from README. An inline SVG (or CSS) flow with the three role labels and pulsing arrows lets a first-time visitor grok the architecture in five seconds. Copy must come verbatim or near-verbatim from README to keep claims accurate."
    acceptance_sketch:
      - "#hero contains an h1 with the project name and a tagline mentioning 'multi-agent' or 'missions' (`grep -qi 'multi-agent\\|missions' docs/index.html`)."
      - "#how-it-works contains the three role names as text or aria-labels: Orchestrator, Worker, Validator (three `grep -q` checks)."
      - "#how-it-works contains an inline <svg> (`grep -q '<svg' docs/index.html`)."
      - "A prominent install CTA anchor `<a href=\"#install\">` appears inside #hero (`grep -A40 'id=\"hero\"' docs/index.html | grep -q 'href=\"#install\"'`)."
    status: proposed
    promoted_mission_id: null
  - id: 5
    title: "Feature cards plus animated terminal demo"
    rationale: "Cards for missions, the brain, validation contracts, and hooks turn the README narrative into scannable units. A static or CSS-animated terminal pane showing a sample /sheldon:mission-new exchange adds visual flavor without shipping any JS execution surface."
    acceptance_sketch:
      - "#features contains at least 4 elements with class card or feature (`grep -oE 'class=\"[^\"]*(card|feature)[^\"]*\"' docs/index.html | wc -l` -ge 4)."
      - "Cards reference missions, brain, contract, and hooks (four `grep -qi` checks against the #features region)."
      - "A <pre> or element with class terminal exists and contains the literal string /sheldon:mission-new (`grep -q '/sheldon:mission-new' docs/index.html`)."
      - "All feature copy is paraphraseable to a sentence in README.md (manual reviewer note in mission handoff; mechanical check: `grep -qi 'orchestrator' docs/index.html && grep -qi 'validator' docs/index.html`)."
    status: proposed
    promoted_mission_id: null
  - id: 6
    title: "Install section mirroring README For-users plus footer with community links"
    rationale: "Closes the funnel: a visitor who reaches the bottom should be able to copy-paste an install command and find CONTRIBUTING / CODE_OF_CONDUCT / SECURITY / CHANGELOG / walkthrough without leaving the page."
    acceptance_sketch:
      - "#install contains a <pre> block with the three install commands from README (`grep -q 'git clone' docs/index.html && grep -q 'npm install' docs/index.html && grep -q 'claude --plugin-dir' docs/index.html`)."
      - "#footer contains anchors to ../CONTRIBUTING.md, ../CODE_OF_CONDUCT.md, ../SECURITY.md, ../CHANGELOG.md, and ./walkthrough.md (five `grep -q` checks)."
      - "#footer contains a link to the GitHub repo (`grep -q 'github.com' docs/index.html`)."
      - "Install commands appear in the same order as README's For-users block (single regex check `.*git clone.*npm install.*claude --plugin-dir` across the file via `tr -d '\\n' | grep -q`)."
    status: proposed
    promoted_mission_id: null
  - id: 7
    title: "Open Graph image plus total page-weight budget enforcement"
    rationale: "Social previews need a real image; without one, link unfurls look broken. A hand-crafted PNG (or SVG-exported PNG) under 50KB at docs/assets/og-image.png closes the polish gap. Pinning a hard total-weight budget via a contract assertion keeps future edits honest."
    acceptance_sketch:
      - "docs/assets/og-image.png exists, is a valid PNG (`file docs/assets/og-image.png | grep -q PNG`), and under 50KB (`wc -c` check)."
      - "index.html og:image meta tag points to assets/og-image.png (`grep -q 'og:image.*assets/og-image.png' docs/index.html`)."
      - "Total critical-path weight (index.html + style.css + main.js + og-image.png) under 200KB (`cat <four files> | wc -c` -lt 204800)."
      - "No file under docs/assets/ exceeds 50KB individually (`find docs/assets -type f -size +50k | wc -l` == 0)."
    status: proposed
    promoted_mission_id: null
---

# Epic 01KRF0GSKTQP83TYGRSBF525RF

## Brief

> Create a neat little landing page running on GitHub Pages that presents Sheldon. Super awesome spacey futuristic aesthetic. Should explain what Sheldon is, show how missions work, and link to install.

## Research summary

**docs/ is already a markdown-only directory.** Three files live there today: `PLATFORM.md` (25 lines), `RELEASING.md` (10 lines), `walkthrough.md` (199 lines). They are stable reference docs and must continue to resolve at the same URLs once Pages is enabled. The way to keep raw markdown serving correctly from `/docs/` on GitHub Pages is a single zero-byte `.nojekyll` file plus the Settings -> Pages -> Source toggle. No build pipeline is required.

**README.md is the canonical source of truth** for what the landing page is allowed to claim. It already organises the story into the exact beats the page needs: a tagline ("multi-agent workflow with three roles"), a How-it-works ASCII flow with Orchestrator -> Worker -> Validator, Install instructions for users (three commands: `git clone`, `npm install`, `claude --plugin-dir`), a Usage walkthrough, a feature surface (missions, brain, epics, contracts, hooks), and a Community block linking CONTRIBUTING / CODE_OF_CONDUCT / SECURITY / CHANGELOG / RELEASING. Every claim on the landing page should be defensible by pointing back to a line in README, agents/, or skills/.

## Decomposition strategy

The work splits cleanly into three layers:

1. **Foundation (issue 1)** — Pages bootstrap. Lands first, unblocks everything else, low risk.
2. **Page body (issues 2-6)** — HTML skeleton -> theme + starfield -> hero/flow -> features/terminal -> install/footer. Each builds on the prior but is independently mergeable because each just *adds* sections; later issues do not refactor earlier output.
3. **Polish (issue 7)** — OG image and total-weight contract assertion. Best done last so the budget reflects the finished page.

Sequencing is recommended but not strictly required: issues 4-6 could in principle land in any order after 2+3, since they touch disjoint section ids.

## Aesthetic-vs-assertion split

"Super awesome spacey futuristic" is a vibe, not a mechanically decidable property. Contract assertions in this epic pin **structural** invariants only: file existence, byte budgets, presence of specific section ids, presence of role-name text, presence of an inline `<svg>` and a `<canvas>`, working anchor links. The Validator cannot decide "is this awesome enough" — that is a human review gate at PR time. The aesthetic constraints (dark bg, cyan accents, monospace, starfield) are enforced indirectly via the CSS-custom-properties + monospace + requestAnimationFrame + canvas assertions in issue 3, which any plausibly-spacey implementation will satisfy.

## Rejected candidates

- **React / Vue / Astro / Next site** — rejected: adds an `npm run build` step for a page that can be three static files. Violates the "every contract assertion runs on raw checked-in files" rule.
- **External Google Fonts / CDN-hosted JS** — rejected: hurts the page-weight budget, adds a third-party dependency, and complicates assertions about asset size. System monospace stack is sufficient for the aesthetic.
- **Light-mode toggle** — rejected: the brief specifies a dark spacey aesthetic; a light mode dilutes that and doubles the CSS surface area for no clear win.
- **Analytics / comments / mailing list** — rejected: out of scope; the brief is "explain Sheldon and link to install", not "build a marketing funnel".
- **A separate GitHub Actions workflow that builds Pages** — rejected: GitHub Pages serves `/docs/` directly when toggled in Settings; a workflow would add CI surface for no benefit. The one-time Settings toggle (mentioned in RELEASING.md per issue 1) is enough.
- **Touching docs/PLATFORM.md, docs/RELEASING.md, docs/walkthrough.md content** — rejected: stable reference docs. Issue 1 only *adds* a Pages note to RELEASING.md; the other two are untouched.

## Layout the workers should land on

```
docs/
  .nojekyll                  # issue 1 (zero bytes)
  index.html                 # issues 2, 4, 5, 6
  assets/
    style.css                # issue 3
    main.js                  # issue 3
    og-image.png             # issue 7
  PLATFORM.md                # untouched
  RELEASING.md               # issue 1 adds the Pages-toggle paragraph
  walkthrough.md             # untouched
```
