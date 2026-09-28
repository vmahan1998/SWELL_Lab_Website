# Accessibility audit — September 28, 2026

## Minimum font size update - September 28, 2026

Raised small labels, captions, metadata, animation controls, footer text, and mobile navigation across all six public pages using the shared `--font-size-min: max(14px, .875rem)` token. Larger typography is preserved, and the minimum scales with larger browser text preferences. Rebuilt `_site`; the IDE preview redirects to this output.

The browser harness now checks computed font sizes for visible text and form inputs at 1440px and 320px on every public page. **112 of 112 checks passed**, including the twelve new minimum-size checks, mobile reflow, text-spacing reflow, zoom-equivalent reflow, keyboard controls, reduced motion, and contact-form checks. Axe reported zero violations across all twelve page/viewport scans; incomplete desktop contrast checks and the remaining manual verification below still apply. The updated Contact mobile screenshot was visually inspected. Evidence: `.build/accessibility-results.json` and `scripts/check-site.mjs`.

## Remediation and retest — September 28, 2026

The reported motion, fading-label, and feedback-destination issues have been addressed in the sources and rebuilt local site. This does not establish full WCAG conformance; the manual verification listed below remains necessary.

- Home now has a keyboard-accessible Pause waves / Play waves button that freezes all wave animations. Home, Research, People, and Open Positions decorations remain static without JavaScript and respect reduced motion.
- Research uses a permanent opaque tide caption instead of overlapping fading labels. Its computed foreground/background contrast is 8.45:1 at six sampled timeline positions, including the previously failing times and paused states. The 320px caption screenshot was visually inspected. Axe still reports an incomplete SVG-overlap contrast check for this caption; the computed-color measurement is a separate check, not an axe clearance.
- Contact drafts and accessibility feedback address kimberly.huguenard@maine.edu and CC vanessa.mahan@maine.edu, as confirmed by the site owner. Visible email links work without JavaScript. Prepared copy text includes To and CC, and the footer links directly to the feedback section. No email was sent; real email-client handoff remains to be checked.
- The shared harness now checks the named home link, all six public pages including News, keyboard animation controls, reduced motion, no-JavaScript fallbacks, caption contrast, and draft To/CC encoding. News photo placeholders were constrained to avoid mobile overflow.

Fresh local Chrome / axe-core 4.10.3 run: **100 of 100 harness checks passed**, with zero reported violations across twelve page/viewport scans. Desktop scans still contain incomplete contrast items requiring review. Passing checks do not establish full-page conformance. Source/generated CSS and JavaScript hashes matched.

Current evidence: scripts/check-site.mjs, .build/accessibility-results.json, and .build/research-caption-mobile.png. Chrome required execution outside the sandbox after its debugging connection timed out inside. The original audit and its evidence follow as historical context; line numbers refer to the pre-fix sources.

## Original audit (before remediation)

The original audit concluded that the site was not ready for a WCAG 2.1 AA conformance claim. This technical audit found uncontrolled homepage motion, reproduced a Research-page contrast failure, and identified an incomplete accessibility feedback route. It is not a legal compliance certification.

## Scope and standard

Reviewed the five local public pages (Home, Research, People, Open Positions, Contact), Quarto sources, shared templates, CSS, and JavaScript. The IDE preview file redirects to `_site/index.html`. No deployed URL, external university pages, or legacy archive was audited. Website implementation was not changed.

Title II's web rule uses WCAG 2.1 AA and covers public universities. Treat this lab site as in scope if provided by or on behalf of the university. DOJ currently lists April 26, 2027 for public entities with populations of 50,000 or more, and April 26, 2028 for smaller entities and special districts. Confirm the university's applicable deadline with its accessibility office; lab headcount is not the relevant population. [DOJ guidance](https://www.ada.gov/resources/2024-03-08-web-rule/).

## Findings

### 1. High: homepage wave has no pause/stop control

Evidence: `index.qmd:14`, `swell.css:45`, `swell.css:46`, and `site.js`. Browser inspection confirmed that `wave-break` and `wave-foam` run indefinitely in eight-second cycles. The homepage playback button controls only the photographs. Reduced-motion preferences disable animation, but the default presentation has no page control for the continuing wave.

This automatically starting motion runs alongside reading content beyond five seconds, failing the normal-presentation pause/stop requirement of WCAG 2.2.2 (A). The rest between bursts does not terminate the repeating animation. Decorative markup does not address visual distraction. Add a keyboard-accessible wave pause control, make it static, or end the entire animation within five seconds. [W3C explanation](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html).

### 2. Medium: fading tide labels have insufficient contrast

Evidence: `research.qmd:31`, `swell.css:170`, and the tidal label keyframes. The mobile axe scan flagged `.tidal-label-slack`. Focused browser checks at 320 CSS pixels, with reduced motion explicitly disabled and label animations frozen at specified times, reproduced these contrast ratios:

| Animation time | Slack water contrast |
| --- | --- |
| 500 ms | 3.10:1 |
| 1,000 ms | 1.42:1 |
| 7,000 ms | 4.03:1 |
| 9,000 ms | 1.42:1 |

The approximately 11.9px normal-weight label needs 4.5:1 under WCAG 1.4.3 (AA). Labels share a grid cell while crossfading. Keep text opaque and switch labels discretely, or use a permanent readable caption. Recheck every phase and paused states. `aria-hidden` does not fix visible contrast. [WCAG 2.1](https://www.w3.org/TR/WCAG21/#contrast-minimum).

### 3. High launch blocker: accessibility feedback has no working destination

Evidence: `contact.qmd:14`, `contact.qmd:16`, `contact.qmd:20`, and `_includes/footer.html:7`. The footer directs accessibility feedback to Contact, but its address says “Contact email forthcoming,” `data-recipient` is empty, and “Open email draft” is disabled. Preparing/copying a message supplies no recipient.

Add a confirmed visible email address or a working university accessibility reporting route, and configure the recipient consistently. Verify with and without JavaScript. This is a functional and accessibility-service gap; the missing recipient alone is not a separately established WCAG failure.

### 4. Audit documentation and harness are stale

The previous review claimed all 64 checks passed, but its saved JSON contained `research.html: mobile axe` as a failure. The shared harness also expected a removed second header logo and would stop at that assertion. An audit-only copy substitutes a named-home-link check; the original harness is unchanged. The prior document is preserved at `.build/accessibility-review-before-title-ii-audit.md`.

## Verification performed

Fresh headless Chrome / axe-core 4.10.3 run: **63 of 64 checks passed**. Nine of ten page/viewport axe scans reported no violations; Research at 320px failed contrast. All five desktop scans returned contrast items requiring manual review. Zero reported violations do not establish full-page conformance.

Passing checks covered page structure, active navigation, local links/assets, actual Tab/Enter skip-link focus, 320px horizontal reflow, horizontal reflow with text-spacing overrides, 200% zoom-equivalent layout, slideshow playback/navigation and reduced motion, form validation/focus, accessible form-control names, and clipboard fallback. A temporary test recipient and intercepted mailto URLs tested draft encoding without sending messages. Source/generated CSS and JavaScript hashes matched. Mobile Home and Contact screenshots were inspected.

Evidence and reproducible scripts:

- `.build/title-ii-audit-results.json` and `.build/title-ii-audit.mjs`
- `.build/title-ii-focused-results.json` and `.build/title-ii-focused.mjs`

Browser debugging timed out inside the sandbox; approved execution outside it completed the runs. Audit artifacts are in the already-excluded `.build` directory.

## Remaining verification

- NVDA or VoiceOver: reading order, landmarks, all controls, validation, and announcements. Accessibility-tree inspection is not a screen-reader test.
- Full keyboard traversal, reverse navigation, and visible focus. Automated keyboard coverage is limited to the skip link.
- Actual 200%/400% browser zoom, text enlargement, and text spacing for clipping/overlap. Horizontal-overflow checks and viewport emulation do not prove these requirements.
- Resolve incomplete contrast checks over photographs/animated backgrounds; inspect forced-colors mode.
- Review image alternatives against final approved photos and content, and test real contact handoff after an address is supplied.
- Audit the live deployment and future documents, media, and embedded services.

The remediation above addresses findings 1–3 and updates the shared harness. Complete the remaining manual and live-deployment checks before asserting conformance.
