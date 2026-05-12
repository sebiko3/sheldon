---
id: 01KRF0GSKTQP83TYGRSBF525RF
brief: >-
  Create a neat little landing page running on GitHub Pages that presents
  Sheldon. Super awesome spacey futuristic aesthetic. Should explain what
  Sheldon is, show how missions work, and link to install.
created_at: '2026-05-12T21:12:07.546Z'
issues:
  - id: 1
    title: Bootstrap docs/ for GitHub Pages with .nojekyll and Pages-from-/docs note
    rationale: >-
      Pages from /docs needs a single explicit toggle and a .nojekyll file so
      existing markdown (PLATFORM.md, RELEASING.md, walkthrough.md) keeps
      serving raw. This must land before any HTML/CSS work so contributors can
      preview locally and the URL format is stable for inbound links.
    acceptance_sketch:
      - >-
        File docs/.nojekyll exists and is zero bytes (`test -f docs/.nojekyll &&
        test ! -s docs/.nojekyll`).
      - >-
        docs/RELEASING.md gains a short subsection mentioning the one-time
        Settings -> Pages -> Source = /docs on main toggle (`grep -q 'Pages'
        docs/RELEASING.md`).
      - >-
        Existing files docs/PLATFORM.md, docs/RELEASING.md, docs/walkthrough.md
        are unchanged in path and still parseable as markdown (`test -f` each;
        line counts within +/-50% of pre-mission baseline).
      - >-
        No new top-level config files (no _config.yml, no Gemfile) are
        introduced (`test ! -f docs/_config.yml && test ! -f docs/Gemfile`).
    status: promoted
    promoted_mission_id: 01KRF0PASS8H831VCZDTXA5D0W
  - id: 2
    title: Author docs/index.html skeleton with semantic sections and meta tags
    rationale: >-
      A zero-build HTML skeleton with the right semantic anchors (hero,
      how-it-works, features, install, footer) and Open Graph + Twitter meta
      tags lets later issues fill in visuals without re-litigating page
      structure or social previews.
    acceptance_sketch:
      - >-
        docs/index.html exists, parses (HTML doctype plus matching tag count via
        a python html.parser smoke check), and is under 30KB (`wc -c <
        docs/index.html` -lt 30720).
      - >-
        Contains sections with ids hero, how-it-works, features, install, footer
        (five `grep -q 'id="<id>"'` checks pass).
      - >-
        Has meta description, og:title, og:description, og:image, twitter:card
        tags (all five `grep -q` checks pass).
      - >-
        Links to the GitHub repo URL and to ./walkthrough.md (`grep -q
        'walkthrough.md' docs/index.html`).
    status: promoted
    promoted_mission_id: 01KRF0T8XSTYR7XQ57X18ARCQT
  - id: 3
    title: Spacey-futuristic CSS theme plus lightweight starfield JS animation
    rationale: >-
      Carries the aesthetic: dark background, neon/cyan accents, monospace tech
      typography, subtle starfield canvas. Self-hosted assets only — no CDNs, no
      framework — keeps the install-free promise and stays inside the
      page-weight budget.
    acceptance_sketch:
      - >-
        docs/assets/style.css and docs/assets/main.js exist; each under 50KB
        (`wc -c` checks).
      - >-
        style.css declares custom properties for at least --bg, --fg, --accent
        and references a monospace stack (`grep -q 'monospace'
        docs/assets/style.css`).
      - >-
        main.js defines a starfield via requestAnimationFrame and a canvas
        (`grep -q 'requestAnimationFrame' docs/assets/main.js && grep -q
        '<canvas' docs/index.html`).
      - >-
        No external script/style URLs in index.html: zero matches for
        `src="http` or external CSS hrefs (`! grep -E
        'src="https?://|href="https?://[^"]+\.css' docs/index.html`).
    status: promoted
    promoted_mission_id: 01KRF0ZJF4Z7FVT09367WXB7T9
  - id: 4
    title: Hero plus How-it-works flow (Orchestrator -> Worker -> Validator)
    rationale: >-
      The single most important explanatory beat from README. An inline SVG (or
      CSS) flow with the three role labels and pulsing arrows lets a first-time
      visitor grok the architecture in five seconds. Copy must come verbatim or
      near-verbatim from README to keep claims accurate.
    acceptance_sketch:
      - >-
        #hero contains an h1 with the project name and a tagline mentioning
        'multi-agent' or 'missions' (`grep -qi 'multi-agent\|missions'
        docs/index.html`).
      - >-
        #how-it-works contains the three role names as text or aria-labels:
        Orchestrator, Worker, Validator (three `grep -q` checks).
      - >-
        #how-it-works contains an inline <svg> (`grep -q '<svg'
        docs/index.html`).
      - >-
        A prominent install CTA anchor `<a href="#install">` appears inside
        #hero (`grep -A40 'id="hero"' docs/index.html | grep -q
        'href="#install"'`).
    status: promoted
    promoted_mission_id: 01KRF166Z6VR8G0E7SPJKAT9VB
  - id: 5
    title: Feature cards plus animated terminal demo
    rationale: >-
      Cards for missions, the brain, validation contracts, and hooks turn the
      README narrative into scannable units. A static or CSS-animated terminal
      pane showing a sample /sheldon:mission-new exchange adds visual flavor
      without shipping any JS execution surface.
    acceptance_sketch:
      - >-
        #features contains at least 4 elements with class card or feature (`grep
        -oE 'class="[^"]*(card|feature)[^"]*"' docs/index.html | wc -l` -ge 4).
      - >-
        Cards reference missions, brain, contract, and hooks (four `grep -qi`
        checks against the #features region).
      - >-
        A <pre> or element with class terminal exists and contains the literal
        string /sheldon:mission-new (`grep -q '/sheldon:mission-new'
        docs/index.html`).
      - >-
        All feature copy is paraphraseable to a sentence in README.md (manual
        reviewer note in mission handoff; mechanical check: `grep -qi
        'orchestrator' docs/index.html && grep -qi 'validator'
        docs/index.html`).
    status: promoted
    promoted_mission_id: 01KRF1C8M5YMHP768PTCN7A097
  - id: 6
    title: >-
      Install section mirroring README For-users plus footer with community
      links
    rationale: >-
      Closes the funnel: a visitor who reaches the bottom should be able to
      copy-paste an install command and find CONTRIBUTING / CODE_OF_CONDUCT /
      SECURITY / CHANGELOG / walkthrough without leaving the page.
    acceptance_sketch:
      - >-
        #install contains a <pre> block with the three install commands from
        README (`grep -q 'git clone' docs/index.html && grep -q 'npm install'
        docs/index.html && grep -q 'claude --plugin-dir' docs/index.html`).
      - >-
        #footer contains anchors to ../CONTRIBUTING.md, ../CODE_OF_CONDUCT.md,
        ../SECURITY.md, ../CHANGELOG.md, and ./walkthrough.md (five `grep -q`
        checks).
      - >-
        #footer contains a link to the GitHub repo (`grep -q 'github.com'
        docs/index.html`).
      - >-
        Install commands appear in the same order as README's For-users block
        (single regex check `.*git clone.*npm install.*claude --plugin-dir`
        across the file via `tr -d '\n' | grep -q`).
    status: promoted
    promoted_mission_id: 01KRF1KQM7RTYZHZ4VGT12VZFQ
  - id: 7
    title: Open Graph image plus total page-weight budget enforcement
    rationale: >-
      Social previews need a real image; without one, link unfurls look broken.
      A hand-crafted PNG (or SVG-exported PNG) under 50KB at
      docs/assets/og-image.png closes the polish gap. Pinning a hard
      total-weight budget via a contract assertion keeps future edits honest.
    acceptance_sketch:
      - >-
        docs/assets/og-image.png exists, is a valid PNG (`file
        docs/assets/og-image.png | grep -q PNG`), and under 50KB (`wc -c`
        check).
      - >-
        index.html og:image meta tag points to assets/og-image.png (`grep -q
        'og:image.*assets/og-image.png' docs/index.html`).
      - >-
        Total critical-path weight (index.html + style.css + main.js +
        og-image.png) under 200KB (`cat <four files> | wc -c` -lt 204800).
      - >-
        No file under docs/assets/ exceeds 50KB individually (`find docs/assets
        -type f -size +50k | wc -l` == 0).
    status: proposed
    promoted_mission_id: null
---

# Epic 01KRF0GSKTQP83TYGRSBF525RF
