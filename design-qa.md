# ArtistCRM landing — design QA

## Comparison target

- Source visual truth:
  - `docs/design/mockups/artistcrm-landing-v1/01-hero-desktop.png`
  - `docs/design/mockups/artistcrm-landing-v1/04-hero-mobile.png`
- Rendered implementation: `http://localhost:3000/`
- Implementation evidence:
  - `C:/Users/Escal/Documents/Codex/2026-07-28/new-chat-3/outputs/artistcrm-landing-qa/desktop-1510x1030.png`
  - `C:/Users/Escal/Documents/Codex/2026-07-28/new-chat-3/outputs/artistcrm-landing-qa/mobile-390x844.png`
  - `C:/Users/Escal/Documents/Codex/2026-07-28/new-chat-3/outputs/artistcrm-landing-qa/tablet-1024x900-postfix.png`
- Route/state: public home page, light theme, logged-out state, live tariff data.

## Viewports and normalization

| Evidence         | Source pixels | Implementation pixels | CSS viewport requested | Normalization                                                                                                                    |
| ---------------- | ------------: | --------------------: | ---------------------: | -------------------------------------------------------------------------------------------------------------------------------- |
| Desktop hero     |   1506 × 1045 |           1495 × 1020 |            1510 × 1030 | Compared at nearly identical crop; browser content area excludes its scrollbar/chrome offset.                                    |
| Mobile hero      |    853 × 1844 |             375 × 811 |              390 × 844 | Same aspect ratio; source interpreted as a higher-density reference and proportionally normalized to the 375 × 811 content area. |
| Tablet follow-up |           n/a |            1009 × 887 |             1024 × 900 | Responsive resilience check, not a source-fidelity frame.                                                                        |

## Full-view comparison evidence

- Desktop: the approved ivory/graphite/bronze composition, three-line hero, right-side product window, divider, centered benefits heading, numbered benefit line and first-screen density are preserved.
- Mobile: header, three-line hero, stacked actions and a mobile-native “Сегодня” preview preserve the approved hierarchy without a squeezed desktop sidebar.
- No horizontal overflow was found at desktop, tablet or mobile widths.

## Focused region evidence

- Hero typography and spacing were compared directly because the headline wrapping and product-window proportions are the dominant fidelity surfaces.
- Mobile product preview was compared directly because the source uses a different responsive composition from desktop.
- The 1024 px state was captured separately to verify the intermediate CTA layout after correction.

## Required fidelity surfaces

- Fonts and typography: Futura PT remains the display family and Inter Tight the body/UI family. Heading weights were reduced to match the calmer source, headline wrapping matches the approved three-line structure, and small UI text stays readable.
- Spacing and layout rhythm: header, hero, product preview and benefits align to the approved vertical rhythm. Section order is benefits → workflow → audiences → pricing → FAQ → CTA.
- Colors and tokens: `#FFFEFA`, `#171714`, `#65655F`, `#DEDBD3`, `#9A6B27`, `#80551C`, `#F4EDE1` and `#587259` map directly to the approved contract.
- Image quality and asset fidelity: the existing ArtistCRM scroll logo is used as a real image asset. Standard UI icons use the installed MUI icon library; no text-glyph or new handcrafted SVG substitutes remain.
- Copy and content: approved hero, benefits, workflow, audiences, pricing, FAQ and final CTA copy are present. Dynamic tariff names, feature flags and prices remain sourced from the application database.
- Accessibility and behavior: semantic navigation, headings, links, table, details/summary controls, visible focus states, skip link, reduced-motion handling and mobile tap targets are present.

## Comparison history

1. Initial desktop comparison
   - Earlier finding: [P2] hero content sat too low, the product preview was too short/narrow, and the benefits heading was left-aligned.
   - Fix: reduced hero top space, increased the preview height, rebalanced columns, centered the benefits heading and constrained the numbered line.
   - Post-fix evidence: `desktop-1510x1030.png`; first-screen composition now follows the source hierarchy and crop.
2. Initial mobile comparison
   - Earlier finding: [P2] the desktop sidebar was compressed into the mobile preview and changed the intended responsive hierarchy.
   - Fix: hid the desktop preview navigation on mobile and added a mobile-native agenda with payment status.
   - Post-fix evidence: `mobile-390x844.png`; no horizontal overflow, 48 px primary CTA, mobile payment state visible.
3. Intermediate-width comparison
   - Earlier finding: [P2] “Посмотреть возможности” wrapped at 1024 px and separated from its arrow.
   - Fix: tightened the responsive action gap/padding and kept the secondary CTA on one line.
   - Post-fix evidence: `tablet-1024x900-postfix.png`; secondary CTA height is 21 px on one line and the page width equals the viewport width.
4. Icon fidelity follow-up
   - Earlier finding: [P2] several preview/accordion controls used text glyphs or locally drawn icons.
   - Fix: replaced them with direct imports from the installed MUI icon set.
   - Post-fix evidence: browser inspection found 42 MUI icons, no `☎`, `⌄` or `•••` text glyphs, and no console warnings/errors.

## Interaction and runtime checks

- Main navigation: “Возможности” updates the URL to `#features` and scrolls the target to the top.
- FAQ: “Нужно ли устанавливать программу?” opens and exposes its answer.
- Page identity: correct ArtistCRM title and public home route.
- Console: no relevant errors or warnings after desktop, mobile, tablet and icon follow-up checks.
- Framework overlay: none; only the normal Next.js development tools control is present in development mode.

## Findings

- No actionable P0, P1 or P2 findings remain.
- [P3] The generated mockup contains slightly more detailed product-preview microcopy than the production preview; the current preview intentionally uses the same product concepts with maintainable live HTML.

## Open questions

- None blocking handoff.

## Implementation checklist

- [x] Desktop visual match checked against the source image.
- [x] Mobile visual match checked against the source image.
- [x] Intermediate breakpoint checked and corrected.
- [x] Navigation and FAQ interaction tested.
- [x] Console, overflow, semantic structure and focus baseline checked.
- [x] Dynamic tariff behavior preserved.

final result: passed
