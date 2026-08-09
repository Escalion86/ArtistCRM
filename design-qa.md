# ArtistCRM cabinet design QA

## Evidence

- Source visual truth:
  - Events: `C:/Users/Escal/.codex/generated_images/019fa767-bb78-71e3-bac5-35beaa517e00/exec-d6a4af3e-e2f2-4c12-a824-55de7cc046de.png` (854 × 1842 px)
  - Clients: `C:/Users/Escal/.codex/generated_images/019fa767-bb78-71e3-bac5-35beaa517e00/exec-e6d9a755-e243-4e74-b654-f2f58198219a.png` (866 × 1817 px)
  - Transactions: `C:/Users/Escal/.codex/generated_images/019fa767-bb78-71e3-bac5-35beaa517e00/exec-af562532-4896-4fe0-8b72-23a8b08971ff.png` (853 × 1844 px)
- Browser-rendered implementation screenshots:
  - `C:/Users/Escal/.codex/tmp/artistcrm-user-card-qa/users-v1.jpg`
  - `C:/Users/Escal/.codex/tmp/artistcrm-user-card-qa/users-menu-open.jpg`
  - `C:/Users/Escal/.codex/tmp/artistcrm-client-card-qa/clients-final.jpg`
  - `C:/Users/Escal/.codex/tmp/artistcrm-client-card-qa/clients-menu-open.jpg`
  - `C:/Users/Escal/.codex/tmp/artistcrm-event-divider-qa/events-dividers-final.jpg`
  - `C:/Users/Escal/.codex/tmp/artistcrm-event-layout-qa/events-layout-v1.jpg`
  - `C:/Users/Escal/.codex/tmp/artistcrm-event-layout-qa/events-layout-menu-open.jpg`
  - `C:/Users/Escal/.codex/tmp/artistcrm-event-card-qa/events-upcoming-after.jpg`
  - `C:/Users/Escal/.codex/tmp/artistcrm-event-card-qa/events-filters-open.jpg`
  - `C:/Users/Escal/.codex/tmp/artistcrm-event-card-qa/event-actions-open.jpg`
  - `C:/Users/Escal/.codex/tmp/artistcrm-filter-qa-final/events-final-v4.jpg`
  - `C:/Users/Escal/.codex/tmp/artistcrm-filter-qa-final/events-filters-open-final.jpg`
  - `C:/Users/Escal/.codex/tmp/artistcrm-filter-qa-final/clients-final.png`
  - `C:/Users/Escal/.codex/tmp/artistcrm-filter-qa-final/clients-filters-open.png`
  - `C:/Users/Escal/.codex/tmp/artistcrm-filter-qa-final/transactions.png`
  - `C:/Users/Escal/.codex/tmp/artistcrm-filter-qa-final/transactions-type-open.png`
- Combined side-by-side comparison evidence:
  - `C:/Users/Escal/.codex/tmp/artistcrm-user-card-qa/compare-users-final.png`
  - `C:/Users/Escal/.codex/tmp/artistcrm-client-card-qa/compare-clients-final-v2.png`
  - `C:/Users/Escal/.codex/tmp/artistcrm-event-layout-qa/compare-events-layout-final.png`
  - `C:/Users/Escal/.codex/tmp/artistcrm-event-card-qa/compare-events-card-final.png`
  - `C:/Users/Escal/.codex/tmp/artistcrm-filter-qa-final/compare-events-final-v4.png`
  - `C:/Users/Escal/.codex/tmp/artistcrm-filter-qa-final/compare-clients-final2.png`
  - `C:/Users/Escal/.codex/tmp/artistcrm-filter-qa-final/compare-transactions-final.png`
- Viewport: 390 × 843 CSS px; device scale factor 1.
- Density normalization: each high-density source was resized to 390 × 843 px and placed directly beside the 390 × 843 browser capture.
- State: authenticated cabinet, light application theme, real event/client/user/transaction data. Event, client, and user comparisons use closed controls; the transaction comparison uses the open type menu, matching the source.

## Full-view comparison

- User cards now use the same sectional hierarchy as event and client cards: a full-width name row, a compact avatar-and-metrics middle section, and a bordered contact footer anchored to the lower edge.
- The two-column metrics grid keeps tariff, balance, event, request, registration-date, and registration-source information readable within the existing fixed-height virtualized list.
- Client cards now share the event-card hierarchy: a full-width name row with a divider, a flexible middle details region, and a separated bottom row for compact statistics and quick contacts.
- The existing last-request date/status and preferred communication channel remain visible without adding phone-number or event-history rows.
- The latest event layout separates the title from the three-column detail row. Icons and title now use the full card width except for the independently positioned action trigger; the following row contains date, address/status details, and amount/badges; the contact row remains last.
- Real long titles retain substantially more readable width because the amount no longer shares their row. Truncation remains only for genuinely overlong content and does not change card height.
- The latest event-card pass intentionally removes the duplicated page-level city selector on mobile. `Город / Все города` remains available inside the filter overlay, while the persistent row contains only the primary event scope and `Фильтры`.
- Event contacts now sit against the lower card edge regardless of how many metadata rows appear above them. The title/amount region can grow without pulling the contact row upward.
- Contract events show one contract icon directly before the title. The duplicated icon and `По договору` row have been removed.
- The event action trigger retains its established visual treatment and is positioned independently in the top-right corner. Its portal menu opens from that anchor without turning the entire right-hand card column into a click target.
- The mobile event filter row now follows the revised `Активные / Фильтры` anatomy. The bronze primary control, outlined filter control, and compact neutral quick actions retain the source hierarchy after the explicitly requested removal of the city control.
- The client screen uses the accepted full-width search followed by `Все клиенты / Фильтры`. The filter opens as a portal overlay and does not create a third permanent control or displace cards.
- The transaction screen uses `Все / Период / Фильтры`; the type menu opens at the approved compact width with income, expense, and obligation choices.
- The hamburger remains left of the logo as explicitly requested after the mock was approved. Real data and authenticated-header controls differ from the illustrative source but do not change the filter system.

## Focused comparison

- User header/footer: the name spans the card width up to the independently positioned action trigger; quick-contact actions sit in their own bottom row and do not compete with registration metadata.
- User middle section: the existing avatar remains the visual anchor, while paired tariff/balance and event/request values reduce vertical scanning. Registration date and source retain full-row tracks for longer content.
- Client header/footer: the name retains the full available width except for the top-right action trigger; contact actions remain anchored to the lower edge across cards with and without preferred-channel metadata.
- Mobile statistics use the compact labels `Заявки / События / Отмены`; desktop retains the existing full copy.
- Divider geometry: the full-width title divider and contact divider bound the middle detail row; the date column's right border touches both horizontal dividers without a gap.
- Revised hierarchy: the first visible card shows its title across the top, date/address/amount below, and the client/contact controls aligned along the bottom border. Contract and warning icons stay immediately before the title.
- Badge/amount column: obligation/API/additional-event badges are grouped with the amount rather than competing with title width.
- Latest event-card geometry: the action trigger is anchored to the upper-right edge; the open action menu contains the existing edit/contact/finance/status actions; the filter overlay contains the sole visible city selector.
- Contract marker check: one `[aria-label="Мероприятие по договору"]` is rendered and visible `По договору` copy is absent.
- Event controls: all three labels remain readable, controls have a consistent 40 px height, and the open filter panel leaves the first card at the same vertical coordinate (`251.6 px` before and after opening).
- Client controls: the primary scope button and outlined filter button remain on one row below search; selecting `С мероприятиями` updates the visible list.
- Transaction controls: the 276 px type overlay visually matches the accepted mock; selecting `Расходы` applies the type state while `Период` and `Фильтры` stay visible.
- Separate crops were not required because the controls and open menus are clearly readable in the full 390 px comparisons.

## Required fidelity surfaces

- Fonts and typography: existing ArtistCRM typography is retained; filter labels and user-card metadata use compact 12 px UI text with sufficient weight. User names retain the established 16 px hierarchy and truncate only when they exceed the available single-line header width.
- Spacing and layout rhythm: controls share a 40 px height, compact gaps, restrained radii/borders, and stable overlay positioning. User cards add consistent header/footer dividers and an 8 px vertical rhythm around the fixed-height middle section. Mobile add actions stay beside the page title rather than consuming filter-row width.
- Colors and visual tokens: white controls, `#DEDBD3` borders, bronze `#C75F00` primary state, neutral gray quick chips, and dark-theme overrides map to the accepted palette.
- Image quality and assets: existing ArtistCRM logo, user avatars, fallback avatar, and icon libraries are retained; avatars use the existing source and a consistent 56 px crop. No placeholder or improvised assets were introduced.
- Copy and content: labels are `Все города`, `Активные`, `Фильтры`, `Все клиенты`, `Период`, `Все транзакции`, `Доходы`, `Расходы`, and `Обязательства` as specified by the accepted mock and follow-up decisions. User-card labels preserve the existing tariff, balance, registration date, and source data while shortening only `Создано мероприятий/заявок` to `Мероприятия/Заявки`.

## Comparison history

1. P1: mobile filters were structurally different from the accepted mock: the event city control used the old form presentation, clients used a native orange select, transaction labels were compressed, and add/count controls competed with the filter row. Fix: implemented the accepted compact control anatomy on all three screens and moved mobile add actions to page headings. Post-fix evidence: the three final side-by-side comparison files.
2. P1: upcoming-event quick actions remained as two large half-width panels and visually replaced the compact active chips from the source. Fix: converted them to auto-width neutral chips while preserving their existing actions and counters. Post-fix evidence: `compare-events-final-v4.png`.
3. P2: event city and filter labels truncated at 390 px. Fix: adjusted the three-column track sizes, horizontal gaps, and native select padding; added a safe 320–359 px fallback grid. Post-fix evidence: `events-final-v4.jpg` shows the complete `Все города` and `Фильтры` labels.
4. P2: dropdown content previously participated in normal layout on some screens. Fix: all three menus now render as overlays; the event card top remains exactly `251.6 px` before and after opening. Post-fix evidence: `events-filters-open-final.jpg` and the measured browser check.
5. Final pass: no actionable P0/P1/P2 fidelity issue remains. Remaining visible differences are real data, authenticated-header controls, and the explicitly requested left-side hamburger.
6. P1: the city scope appeared both as a persistent mobile control and inside the filter overlay. Fix: removed the persistent mobile city selector and kept the functional city field in the overlay. Post-fix evidence: `events-upcoming-after.jpg` and `events-filters-open.jpg`.
7. P1: the contract state was repeated as an icon beside the title and as a second icon plus `По договору` row. Fix: retained only the title-leading icon. Post-fix evidence: the browser DOM reports one contract icon and no visible `По договору` label.
8. P1: the action trigger visually reserved the card's right edge. Fix: anchored `CardActions` directly at `top: 0; right: 0` while retaining the established trigger appearance and size. Post-fix evidence: `events-upcoming-after.jpg` and `event-actions-open.jpg`.
9. P2: contact placement depended on the height of the metadata above it. Fix: the event-card grid now uses `auto / 1fr / auto` rows across the full card height, which keeps the contact/footer row at the bottom. Post-fix evidence: all visible cards in `events-upcoming-after.jpg` align their client/contact row to the lower edge.
10. Latest pass: no actionable P0/P1/P2 issue remains. The missing persistent city control is an intentional user-requested deviation from the older source mock.
11. P1: title/address content and amount/badges shared the same row, leaving long event titles visibly compressed. Fix: introduced a dedicated full-width title row, moved date/address/amount into the second row, grouped badges with the amount, and retained the contact footer as the third row. Post-fix evidence: `events-layout-v1.jpg` and `compare-events-layout-final.png`.
12. Latest layout pass: no actionable P0/P1/P2 issue remains. Real content may still truncate when it exceeds the full available title width, which is expected and prevents variable card heights.
13. P2: the title and contact areas lacked a continuous visual structure around the date column. Fix: added a full-width divider below the title, removed inter-row grid gaps, and extended the date column border from the title divider to the contact divider. Post-fix evidence: `events-dividers-final.jpg`.
14. Latest divider pass: no actionable P0/P1/P2 issue remains.
15. P1: client cards did not yet use the same sectional hierarchy as the revised event cards. Fix: added a full-width divider below the client name, made request/channel metadata the flexible middle region, and retained statistics plus quick contacts in the bordered bottom row. Post-fix evidence: `clients-final.jpg` and `compare-clients-final-v2.png`.
16. P2: full mobile statistics copy truncated on ordinary cards with four contact actions. Fix: introduced shorter mobile-only labels while preserving the original desktop labels. Post-fix evidence: the first two cards in `clients-final.jpg` show complete statistics.
17. Latest client-card pass: no actionable P0/P1/P2 issue remains. P3: statistics can still truncate for rare clients exposing five simultaneous quick-contact actions; the contact actions remain fully visible and usable.
18. P1: user cards retained the older avatar-first, unsectioned vertical layout and did not match the accepted event/client card hierarchy. Fix: introduced a full-width name header, a structured avatar-and-metrics middle section, and a separate bottom contact row. Post-fix evidence: `users-v1.jpg` and `compare-users-final.png`.
19. P2: the long one-column metadata stack used most of the card height and weakened scanability. Fix: paired tariff/balance and event/request values in a two-column grid while keeping registration date and source on full-width rows. Post-fix evidence: the first three cards in `users-v1.jpg`.
20. Latest user-card pass: no actionable P0/P1/P2 issue remains. P3: unusually long tariff names or registration-source labels truncate to preserve the fixed card height used by the virtualized list.

## Primary interactions tested

- Events: open `Фильтры`; actual city/check/status options appear in an overlay without shifting the list.
- Event actions: click the overflow control in the upper-right corner; the portal menu opens with editing, client/contact, finance/document, history, copy, status, and delete actions.
- Clients: open `Фильтры`; choose `С мероприятиями`; the filter state applies.
- Transactions: open `Все`; income, expense, and obligation choices appear; choose `Расходы`; the state applies while the remaining controls stay available.
- Users: open the overflow control on a user card; the menu opens above the list with `Баланс и платежи`, edit, password, and related administrative actions without shifting adjacent cards.
- Browser log checked after the final render: no errors or warnings related to the changed interface.
- Technical validation: production build passed; targeted ESLint passed with no errors; 11 transaction filter/date-range tests passed; `git diff --check` passed.

## Follow-up polish

- P3: a separate desktop-specific pass may tune wide-screen spacing without changing the approved mobile controls.

final result: passed
