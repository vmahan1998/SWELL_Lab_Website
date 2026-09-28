# SWELL Lab website

A monochrome editorial website built with Quarto for editing in RStudio. The public pages are Home, Research, People, News, Open Positions, and Contact.

## Preview and render

Open `SWELL_Lab_Website.Rproj` in RStudio. In its Terminal:

```powershell
quarto preview
```

For a clean Windows build (removes only the generated `_site` directory):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/render.ps1
```

The script locates Quarto on PATH or uses the RStudio-bundled executable. An explicit installation can be selected with `-QuartoPath`. On this computer, the executable is `C:\Program Files\RStudio\resources\app\bin\quarto\bin\quarto.exe`. The bundled .cmd launcher has a path-with-spaces issue; use the .exe or the script.

On other systems, start with a clean output directory and run `quarto render`. Open `_site/index.html` to review the built site. Do not edit generated HTML.

## Editing content

The shared header uses `images/logo_final.png` inside a named home link. The homepage wave has a keyboard-accessible pause/play button. Decorative hero animations stay static without JavaScript and respect reduced-motion preferences. The Research tide caption remains opaque throughout playback and pause. The homepage photo panel cycles through three images from `images/landscape/` every 6.5 seconds. Previous/next and pause/play controls are available; reduced-motion settings disable autoplay and transitions. Keyboard interaction with photo navigation pauses playback, and hovering over the panel temporarily suspends rotation. To change the three photos, update the image sources and descriptive alternatives in `index.qmd`.

- `index.qmd`: lab introduction, research highlights, group photograph.
- `research.qmd`: draft research overview, its university source, and a photo-led activities section covering field measurements, sampling and lab processing, workshops, and conferences. Captions describe visible scenes without assigning an unconfirmed instrument, sampling protocol, or event to a photograph.
- `people.qmd`: six member profiles. Vanessa's supplied biography is included verbatim, divided into readable paragraphs.
- `positions.qmd`: inquiry invitation; no funded vacancy is asserted.
- `news.qmd`: editorial news layout with a featured Kennebec River fieldwork dispatch and preview cards for the previous-news archive. Every story includes a `news-photo` figure with a photo placeholder and caption. Replace its entire `photo-placeholder` div with an image with descriptive alt text, intrinsic width/height, and `loading="lazy"`; update the caption with any photographer credit. Include a photo or the same placeholder figure when adding stories.
- `contact.qmd`: contact details, form, and recipient setting.
- `swell.css` and `swell-theme.scss`: layout, colors, and typography.
- `_includes/`: shared navigation and footer; `site.js`: current-page indication and email-draft behavior.

See CONTENT-CHECKLIST.md for outstanding content. Preserve semantic heading levels and explicit form labels when editing.

Use each content image only once across the six public pages, except Sasha's portrait in her news coverage. Shared header/footer branding is reusable. Keep member portraits on People and choose distinct coastal, campus, or fieldwork scenes for News previews. These scenes are illustrative unless a caption confirms the event; do not imply that archival field photos document the September 2026 Kennebec trip.

### Member photographs and emails

Put approved, optimized photographs in `images/`. Replace a member's entire `photo-placeholder portrait` block with:

```html
<img class="portrait" src="images/member-name.webp"
     alt="Portrait of Member Name" width="900" height="1200"
     loading="lazy" decoding="async">
```

Use the actual intrinsic width and height. Review the crop at mobile and desktop sizes; adjust `object-position` per photo to keep faces visible. Portraits use a 3:4 frame without stretching. For the group photograph, use `class="group-photo"` to preserve its natural aspect ratio and write alt text describing the supplied scene. Replace the placeholder caption too. Optimize copies, retain originals outside the public folder, and strip location metadata before publishing.

Replace each pending biography with the supplied text. Replace the pending email paragraph with a visible, descriptive link:

```html
<p class="email"><a href="mailto:CONFIRMED_ADDRESS">CONFIRMED_ADDRESS</a></p>
```

Use only confirmed addresses; the example must never ship as literal content.

### Contact and accessibility feedback

The confirmed recipient is `kimberly.huguenard@maine.edu`, with `vanessa.mahan@maine.edu` copied. In `contact.qmd`, keep `data-recipient`, `data-cc`, the visible email links, and the accessibility feedback link consistent when changing recipients. The direct links work without JavaScript; the footer links to the accessibility feedback section.

The script enables “Open email draft” only with a valid recipient. Prepared messages include both To and CC lines. The site does not submit email, store messages, or report successful delivery. Visitors must send their drafts in an email application. Clipboard failure falls back to selected text for manual copying.

## GitHub Pages

The site uses relative URLs and works at `https://USERNAME.github.io/REPOSITORY/` as well as at a custom domain. No backend or paid form service is required.

The workflow in `.github/workflows/pages.yml` renders the six public pages with Quarto 1.10.18 (matching the local build) and deploys only `_site/`. Each push to `main` publishes an update; it can also be run manually from the Actions tab. Generated files do not need to be committed.

### First deployment

1. Review CONTENT-CHECKLIST.md and ACCESSIBILITY.md for remaining content and manual checks.
2. Create or select the intended GitHub repository and connect this source folder to it. For a new repository, use `main` as the source branch. The workflow assumes this name.
3. In the repository's **Settings > Pages > Build and deployment**, set **Source** to **GitHub Actions**.
4. Commit and push the source, including `.github/workflows/pages.yml`. If the first push happened before Pages was enabled, open **Actions > Deploy website to GitHub Pages > Run workflow** and select `main`.
5. Wait for both the build and deploy jobs to succeed. The deployment's `github-pages` environment links to the published site.
6. Check the live site's six pages, images, navigation, keyboard access, and contact behavior.

This workflow uses GitHub's built-in token; no personal access token or `gh-pages` branch is needed. See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The render allowlist and resource exclusions in `_quarto.yml` keep old template content out of the published build. `.nojekyll` is included for Pages. Archived templates, local previews, generated files, and `.build/` review materials are excluded from Git. Earlier generated files are preserved locally in `.build/previous-site`.

## Accessibility checks

See ACCESSIBILITY.md for test coverage and remaining manual checks. The local browser harness is `scripts/check-site.mjs`; it uses Deno, Chrome, and axe-core 4.10.3 downloaded into `.build/axe.min.js`. Run:

```powershell
& 'C:\Program Files\RStudio\resources\app\bin\quarto\bin\tools\x86_64\deno.exe' run --allow-read --allow-write --allow-net --allow-run scripts/check-site.mjs
```

The test server is local only. It tests beneath a repository URL prefix, uses a temporary example.org recipient in its test response, and intercepts email-draft URLs so it cannot open an email app or send mail. Reports and screenshots go into `.build/`. No test address is saved in the site.
