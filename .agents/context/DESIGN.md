---
name: Quizmon
description: A charming Logo Echo interface for a quick, tactile Pokémon knowledge game.
colors:
  landscape-sky: '#72c3ee'
  primary: '#0d6be6'
  primary-text: '#e8fcff'
  outline: '#083b7e'
  hard-shadow: '#123f76'
  soft-sky: '#b7e1fa'
  depth-edge: '#eed23e'
  accent-surface: '#feec99'
  trainer-bronze: '#ed9147'
  trainer-silver: '#b8cbd2'
  trainer-gold: '#f0c51f'
  badge-recess: '#254d67'
  badge-recess-hover: '#2c5976'
  game-surface: '#fffbea'
  ink: '#143149'
  muted-ink: '#446078'
  success: '#18763a'
  error: '#a92843'
  focus: '#083b7e'
  footer-ink: '#1b3e40'
  control-shine: 'rgba(255, 255, 255, 0.12)'
  modal-scrim: 'rgba(8, 35, 73, 0.8)'
  disabled-surface: '#e5ebed'
  error-ink: '#8b1e31'
  error-surface: '#fff0f3'
typography:
  display:
    fontFamily: 'Gabarito Variable, system-ui, sans-serif'
    fontSize: 'clamp(1.65rem, 4.5vw, 2.3rem)'
    fontWeight: 800
    lineHeight: 1.05
  headline:
    fontFamily: 'Gabarito Variable, system-ui, sans-serif'
    fontSize: 'clamp(1.35rem, 4vw, 1.75rem)'
    fontWeight: 800
  body:
    fontFamily: 'Gabarito Variable, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
  control:
    fontFamily: 'Gabarito Variable, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 700
  label:
    fontFamily: 'Gabarito Variable, system-ui, sans-serif'
    fontSize: '0.82rem'
    fontWeight: 700
    lineHeight: 1.35
  mini:
    fontFamily: 'Gabarito Variable, system-ui, sans-serif'
    fontSize: '0.65rem'
    fontWeight: 700
    lineHeight: 1.2
  numeric:
    fontFamily: 'Martian Mono Variable, ui-monospace, monospace'
    fontSize: '0.76rem'
    fontWeight: 800
    letterSpacing: '0.04em'
rounded:
  compact: '0.2rem'
  field: '0.25rem'
  control: '0.3rem'
  icon-control: '0.35rem'
  tile: '0.38rem'
  button: '0.5rem'
  mobile-surface: '0.55rem'
  surface: '0.75rem'
spacing:
  xs: '0.25rem'
  sm: '0.7rem'
  md: '1rem'
  lg: '1.2rem'
  xl: '1.5rem'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-text}'
    typography: '{typography.control}'
    rounded: '{rounded.button}'
    padding: '0.62rem 1.1rem'
    height: '2.8rem'
  button-quiet:
    backgroundColor: '{colors.game-surface}'
    textColor: '{colors.outline}'
    typography: '{typography.control}'
    rounded: '{rounded.button}'
    padding: '0.62rem 1.1rem'
    height: '2.8rem'
  daily-action:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.game-surface}'
    typography: '{typography.control}'
    rounded: '{rounded.button}'
    padding: '0.65rem 1rem'
  game-panel:
    backgroundColor: '{colors.game-surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.surface}'
    padding: 'clamp(1rem, 2.4vw, 1.5rem)'
    width: 'min(42rem, 94vw)'
  timer:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-text}'
    typography: '{typography.numeric}'
    rounded: '{rounded.control}'
    padding: '0.35rem 0.58rem'
  progress-track:
    backgroundColor: '{colors.soft-sky}'
    rounded: '{rounded.compact}'
    height: '0.65rem'
  answer-correct:
    backgroundColor: '{colors.success}'
    textColor: '{colors.primary-text}'
    typography: '{typography.control}'
    rounded: '{rounded.button}'
    padding: '0.62rem 1.1rem'
  answer-wrong:
    backgroundColor: '{colors.error}'
    textColor: '{colors.primary-text}'
    typography: '{typography.control}'
    rounded: '{rounded.button}'
    padding: '0.62rem 1.1rem'
  answer-pokemon:
    backgroundColor: '{colors.game-surface}'
    textColor: '{colors.outline}'
    typography: '{typography.control}'
    rounded: '{rounded.button}'
    height: '6.4rem'
  search-field:
    backgroundColor: '{colors.game-surface}'
    textColor: '{colors.ink}'
    typography: '{typography.control}'
    rounded: '{rounded.button}'
    padding: '0.65rem 0.8rem'
    height: '3rem'
  selection-tile-selected:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-text}'
    typography: '{typography.control}'
    rounded: '{rounded.tile}'
    height: '3.15rem'
  dialog:
    backgroundColor: '{colors.game-surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.surface}'
    width: 'min(42rem, calc(100% - 1rem))'
  trainer-card:
    backgroundColor: '{colors.game-surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.surface}'
    width: '100%'
---

# Design System: Quizmon

## Overview

**Creative North Star: "Logo Echo"**

Quizmon's Logo Echo world starts with two binding identity assets: the exact Pokémon-like wordmark and the crisp pixel-art landscape. Interface chrome borrows their visual confidence without simulating a whole handheld console. Small cream and cobalt surfaces use deep navy outlines, slim yellow lower edges, compact corners, and modest hard shadows.

The landing screen remains open and asset-led. The wordmark occupies the sky, one large Daily Challenge button anchors the primary action, and the Settings, Trainer Card, and Training controls stay small beneath it. After the player earns every League Badge, one quiet Quizmon League action appears below that compact row without competing with the daily. Question, result, and setup states may use one contained cream surface because they need sustained reading and interaction, but they must still feel like parts of the same compact game system.

The result is playful, direct, and tactile. It avoids generic application chrome and keeps the quiz itself visually dominant.

**Key Characteristics:**

- Exact wordmark and crisp landscape remain the primary identity.
- Cream, cobalt, navy, and yellow controls echo the wordmark in restrained doses.
- Dense game information stays clear through Gabarito and small Martian Mono numeric labels.
- Hard-edged depth makes controls feel physical without adding ornamental framing.
- One short transform-and-opacity entrance opens a round and its results.

## Colors

The palette takes its interactive colors from the wordmark, then uses warm pale surfaces to keep the quiz readable against the landscape.

### Primary

- **Battle Cobalt** (`colors.primary`): Primary actions, selected tiles, answer choices, and the timer.
- **Deep Game Navy** (`colors.outline`): Control outlines, headings, progress borders, links, and high-emphasis labels.
- **Pale Button Ink** (`colors.primary-text`): Text on cobalt controls.

### Secondary

- **Butter Depth Edge** (`colors.depth-edge`): The slim lower edge under controls and surfaces, plus progress fill. It signals game-object depth rather than decoration.
- **Daily Cream** (`colors.accent-surface`): The daily challenge strip, dialog header and footer, and score band.
- **Soft Sky** (`colors.soft-sky`): Quiet progress tracks and loading details.
- **Trainer Bronze, Silver, and Gold** (`colors.trainer-bronze`, `colors.trainer-silver`, `colors.trainer-gold`): Automatic Trainer Card rank accents. They progress from the classic cobalt Youngster card through Ace, Veteran, and League Challenger or Champion finishes.

### Tertiary

- **Correct Forest** (`colors.success`): Correct-answer feedback only.
- **Wrong Berry** (`colors.error`): Incorrect-answer and error feedback only.

### Neutral

- **Warm Game Paper** (`colors.game-surface`): Question, results, dialog, quiet buttons, and fields.
- **Landscape Ink** (`colors.ink`): Main copy on warm surfaces.
- **Muted Blue Ink** (`colors.muted-ink`): Supporting descriptions, mode labels, details, and status text.
- **Hard Navy Shadow** (`colors.hard-shadow`): The dark lower layer under compact controls and contained surfaces.
- **Badge Recess** (`colors.badge-recess`): The dark blue-green wells that seat badges inside the metal case.
- **Badge Recess Hover** (`colors.badge-recess-hover`): A brighter version of the same material used only while a badge well is interactive.
- **Focus Navy** (`colors.focus`): The default keyboard focus outline on pale surfaces. Selected cobalt tabs and controls inside the dark Badge Case switch to Warm Game Paper for visible contrast.
- **Field Footer Ink** (`colors.footer-ink`): The small unboxed credit line over the landscape.

**The Logo-First Rule.** Cobalt and yellow echo the wordmark. They do not compete with it by filling large decorative regions.

**The State-Color Rule.** Green and rose communicate answer or error state only. Do not use them as general accents.

## Typography

- **Display Font:** Gabarito Variable, with system sans-serif fallback
- **Body Font:** Gabarito Variable, with system sans-serif fallback
- **Data Font:** Martian Mono Variable, with system monospace fallback

**Character:** Gabarito gives headings and controls a warm, confident game voice without imitating the wordmark. Martian Mono keeps progress, time, Pokédex numbers, and scores crisp. It is a narrow functional accent, not a pixel-game theme.

### Hierarchy

- **Display** (800, `clamp(1.65rem, 4.5vw, 2.3rem)`, 1.05): Question and results titles.
- **Headline** (800, `clamp(1.35rem, 4vw, 1.75rem)`): Dialog titles.
- **Body** (400, `1rem`): Instructions, descriptions, and general copy.
- **Control** (700, `1rem`): Buttons, answers, selection labels, and result values.
- **Label** (700, `0.82rem`, 1.35): Game modes, helper text, result details, and status copy.
- **Mini** (700, `0.65rem`, 1.2): The smallest readable progress and state labels inside compact Trainer collection layouts.
- **Footer** (700, `0.875rem`, 1.25): Source attribution at a readable compact size.
- **Numeric** (800, `0.76rem`, `0.04em` letter spacing): Question progress and elapsed time. Large score figures may use the same monospace family at a larger responsive size.

**The No-Pixel-Font Rule.** Do not use bitmap or novelty pixel fonts. Pixel character comes from the landscape, not from reduced text legibility.

**The Wordmark-Is-Art Rule.** Render the approved wordmark asset. Never recreate or approximate it with live type.

## Layout

The landscape is a fixed full-viewport plate with centered cover cropping. Main content is centered within the safe viewport height and uses fluid outer padding from `0.85rem` to `1.75rem`.

The landing page is an open stage, not a card. A responsive grid keeps the wordmark, daily strip, and compact control stack in normal reading order and centers the complete composition within the space above the footer. Intrinsic row sizing preserves the hierarchy without percentage-based coordinates or content-dependent shifts. The wordmark caps at `31rem`, the daily strip at `26rem`, and the controls at `24rem`, while each can shrink to `90vw`. Settings remains a square icon control while Trainer Card and Start training share the remaining row. The Daily Combo medallion decisively overlaps the daily strip's upper-right edge instead of sitting inside its content. Once unlocked, the quiet Quizmon League action sits centered below the row as a separate secondary destination.

The footer stays in document flow and uses three explicit tiers: ownership and contact, production credits, then the smaller Pokémon legal credit. Each tier controls its own wrapping so the footer reads as a hierarchy rather than one dense paragraph.

Question and result panels use `min(42rem, 94vw)`. Text answer choices form two equal columns on desktop and one column at `36rem` and below. Pokémon answer choices remain a two-by-two field on phones so their compact sprite tiles do not turn the round into a long scrolling list. On phones no taller than `50rem`, the round tightens its outer padding, prompt spacing, and sprite size while preserving touch targets. The footer remains present in normal document flow below questions and results, and vertical scrolling remains a safety fallback. On short, wide screens below `43rem` in height, identification questions may split artwork and answers into two columns while progress, title, feedback, and the leave-game action span both columns.

The Settings dialog uses `min(42rem, calc(100% - 1rem))`, caps its height to the safe viewport, and scrolls only its body. On phones it becomes an edge-to-edge, full-height sheet so the title, content, and actions use the available viewport instead of nesting inside another frame. Its action footer remains visible. Every Training round contains ten questions. The generation picker leads the Training settings, followed by its concise mode description and the two-choice League or Custom control. League uses the 13 core formats without abilities, moves, or stats and permits its two performance badges. Custom offers all 16 formats and uses only those the player chooses. Only Custom reveals the question-type controls immediately after the mode choice. Identity, General knowledge, and Battle knowledge split those formats into collapsible semantic groups. Only one group opens at a time, and each heading reports its selected count so collapsed groups remain understandable. Question-type tiles show only their titles and selected state. A compact help button opens the selected format's explanation in a light-dismissable popover without hiding its selection. One select-all control serves the complete question-type set instead of repeating bulk actions inside every group. Validation appears beside the invalid section and moves focus there. Experience contains Quick transitions and sound effects. A two-control tab strip separates the sections without introducing another card layer. Settings remain reachable from the landing screen, every question, and results. Multi-select options use full-tile hit areas with native checkbox semantics. On narrow screens, generations form a three-column grid and question types form a wider two-column grid.

Spacing is compact and regular. Most internal gaps sit near `0.7rem`, contained surfaces use `1rem` to `1.5rem` of padding, and controls remain large enough for touch without becoming oversized.

**The Open-Landing Rule.** Do not place the wordmark and landing actions inside a full-page card or simulated device frame.

## Elevation & Depth

Depth is structural and hard-edged. Yellow lower edges and navy shadow layers make controls read as small physical game objects. There are no glass surfaces, ambient blur fields, or soft floating-card shadows.

### Shadow Vocabulary

- **Control Rest** (`inset 0 0.1rem 0 rgba(255, 255, 255, 0.12), 0 0.22rem 0 #eed23e, 0 0.3rem 0 #123f76`): Primary buttons and answer controls.
- **Quiet Control Rest** (`inset 0 0.1rem 0 #ffffff, inset 0 -0.14rem 0 rgba(8, 59, 126, 0.1), 0 0.22rem 0 #eed23e, 0 0.3rem 0 #123f76`): Cream secondary actions.
- **Game Surface** (`0 0.28rem 0 #eed23e, 0 0.62rem 0 #123f76`): Question and results panels.
- **Dialog Surface** (`0 0.3rem 0 #eed23e, 0 0.7rem 0 #123f76`): The modal surface over its dark navy backdrop.

**The Modest-Hard-Shadow Rule.** Keep depth short, opaque, and downward. Do not replace it with diffuse elevation or a glow.

## Shapes

Quizmon uses compact rounded rectangles with firm navy strokes. Tiny indicators use the compact radius. Timers and small panels use a slightly larger control radius. Buttons and selection tiles use modest radii, and major game surfaces stop at `0.75rem`.

Control outlines are normally `2px` or `3px`. Borders stay visually continuous and do not become decorative double frames. The landscape and wordmark preserve their original silhouettes and are never clipped into cards.

**The Compact-Corner Rule.** Corners should feel friendly but controlled. Avoid pills, circles for rectangular actions, and broad soft cards.

## Components

### Buttons

Buttons are compact physical game controls.

- **Shape:** A compact rounded rectangle with a `3px` navy outline and `0.5rem` radius.
- **Primary:** Cobalt with pale text and `0.62rem 1.1rem` padding.
- **Quiet:** Warm paper with navy text and the same outline, depth edge, and geometry.
- **Hover:** Brighten slightly and rise by `1px`.
- **Active:** Translate down by `0.22rem` while compressing the yellow and navy lower shadows. The button must visibly depress.
- **Focus:** Use a `0.2rem` navy outline with a `0.2rem` offset on pale surfaces. Selected cobalt tabs and controls inside the dark Badge Case use a paper outline instead.
- **Disabled:** Remove the shadow, reduce saturation, set opacity to `0.65`, and keep the cursor neutral.

### Daily Challenge Action

The landing signature is one large cobalt button with a navy outline, a short yellow edge, and a modest navy shadow. The current Daily Challenge shows only that primary line. A historical challenge may add its date in compact data type, and unavailable browser storage may add a short requirement. The entire surface starts the challenge. After completion, the same footprint becomes a cream share button with a share icon, the explicit action “Share result”, and the score. The completed state is already evident from the available action and cream treatment, so do not repeat it in the copy. Do not bury the action inside score metadata, wrap the control in another card, or place a smaller button inside it. Each UTC date deterministically selects four standard question types with repeats allowed, then ends with one Champion question.

A nonzero Daily Combo adds one capture-ball medallion that overlaps the action's upper-right edge. Its large numeric center carries the visual weight, while the small Gabarito label names the combo without turning it into another statistic row. The badge stays fully inside the viewport at every width and remains visually separate from the action copy. The same medallion replaces the empty left cell in the Daily results header. A challenge earns combo credit only when completed on its own UTC date. Historical links never repair a combo.

### Question Surface

The question surface is one warm panel anchored near the top of the available viewport over the unchanged landscape. Its top edge stays fixed while question lengths change, and text-led prompts reserve a modest responsive region so the answer field does not jump between short and longer copy. The progress row sits first, followed by a centered category title, mode, question, and answer grid. When a text prompt names its subject, the Pokémon name uses bold Gabarito followed by a smaller, muted Martian Mono Pokédex number. The pair stays inline without a badge or added container. Sprite questions add unframed artwork with a modest drop shadow. The Champion question begins with one Pokédex clue and an autocomplete search across the active Pokémon pool, with no visible choices. Its first assist replaces search with the four-choice answer grid, while later clues use the ruled cream field.

Question formats whose prompt carries changing game data use a compact visual grammar. Type Check pairs its instruction with the Pokémon sprite and a mystery type badge. Type Roundup says “Select every Pokémon.” and shows the target type as artwork. Evolution Shift shows the current Pokémon, a block arrow, and an unknown evolved form with its retained and mystery types. Stat Showdown says whether to find the highest or lowest value, then shows one stat label with an up or down arrow. Type Matchup and Counter Pick use an unknown source, `×2`, a block arrow, and the visible target without exposing extra matchup information. Silhouette Match says only “Find [Pokémon]” and leaves the concealed choices unlabeled. Odd One Out and Pokédex text formats remain direct. Every visual question keeps its complete natural-language prompt in the accessibility tree. Mystery sprites and types reveal after submission.

An unfinished round resumes automatically after a reload in the same browser tab. A submitted answer is committed when selected, so reloading while feedback is visible advances to the next unanswered question instead of granting another attempt. Leaving the game or completing it clears the resumable session.

The Quizmon League uses the same question surface with a compact five-stop rail between the HUD and title. Square markers labelled I, II, III, IV, and C show the four three-question Elite trials and final Champion stage. Only the active marker is yellow; completed markers turn cobalt. The stage name replaces the generic mode line. One wrong answer ends the run immediately, so no redundant confirmation action appears after failure. The final Champion question stays search-only and exposes no clue or four-choice fallback.

Generation roundup uses the four-card select-all layout with a plain generation prompt. Cards conceal Pokédex numbers and reserve a generation label that reveals after submission. Evolution link presents a name-only chain with a missing middle stage and four text choices. The completed chain remains text-only, with no sprites or Pokédex numbers in any state.

Answer buttons use the primary control treatment and include small outlined number-key labels. Description, evolution, and stat questions present each Pokémon option as a cream field with a crisp front-facing PokéAPI pixel sprite and a cobalt nameplate containing its Pokédex number and readable Gabarito name. Type-focused answer choices use compact X/Y type name icons. Ability and move questions keep text answers. Questions that depend on typing reveal the relevant Pokémon types with the same icons after the answer. Their concealed type rows reserve the exact revealed footprint so answer cards do not resize. Pokédex Scan selects evenly between each available current, historical, Home, official artwork, Dream World, and Showdown sprite family while preserving one consistent prompt and question layout. Opaque early-generation canvases blend into the paper surface instead of showing a white square. Other identification and Champion questions scale classic pixel sprites into larger subjects or silhouettes while preserving hard edges. Once selected, the correct answer becomes green with a visible check, the wrong selected answer becomes rose with a visible cross, unrelated answers fade to `0.5` opacity, and a silhouette immediately reveals its full-color sprite. When sound is enabled, controls use quiet tap and toggle cues, correct and incorrect answers use distinct short cues, completed or perfect rounds receive separate flourishes, and the animated score keeps its rolling count-up cue. Repeated interactions play one cue and interrupt their previous instance so sounds do not stack. Normal Training and Daily Challenge reserve one action row before submission, then keep the answer state visible until the player chooses Next question or See results. Quick transitions advance automatically after `0.3s`. No visible post-answer text repeats the answer, score, or explanation. Assistive technology receives a concise hidden answer announcement.

Training exposes every format directly in Settings. Identity includes Pokédex scans across game sprites, animation, and illustration families, silhouette choices, cropped pixel peeks, and shiny spotting. Type play includes type checks, odd-one-out, select-all rounds, direct matchups, and Counter Pick. Field Notes, Evolution Shift, Ability Check, Move Check, and highest-or-lowest Stat Showdown add variety without turning the quiz into a deep data exercise. Multi-select choices turn yellow while composing an answer, keep checked markers visible, and use one explicit check action. Concealed or cropped artwork reveals its full sprite after submission. The Daily Challenge selects from the 13 core formats independently of Training settings, excluding abilities, moves, and stats.

### Progress and Timer

The progress track is a slim pale-blue bar with a `2px` navy border and yellow fill. The timer is a compact cobalt badge with the same outline and a short yellow lower edge. Both use monospace numeric labels, but neither should introduce a broader HUD frame.

### Trainer Profile

The Trainer Card is a first-class local profile reached from the landing screen and results. It makes the optional trainer name the title, presents the local six-digit number as a game-style `ID No.`, and places the partner Pokémon's name and Pokédex number directly beneath its square portrait. A qualified player-selected specialty may appear as a title beneath the trainer name. The join date, earned rank, automatic rank accent, and visible card finish complete the identity without explanatory finish copy. The Quizmon League Badge Case is a separate shareable collection artifact with eight one-time achievements and no general-purpose statistics. Many Paths rewards correct answers across ten question formats. Pokédex Trail rewards correct answers about 151 distinct Pokémon. World Tour covers all nine generations. True Calling requires fifty correct answers in one specialty. These broad knowledge badges advance in either Daily or Training, including custom Training. Quick Attack requires at least eight correct answers in a ten-question League Training round completed in under sixty seconds. Perfect Form requires three perfect League Training rounds. League Training keeps generation choice flexible and uses the core formats, excluding abilities, moves, and stats. Daily Resolve requires a seven-day Daily Combo. Champion's Instinct requires five Champion answers without clues.

The Badge Case gives the eight 32-pixel badges the maximum practical size in a fixed four-by-two arrangement inside one dark inset tray and cool metal shell. It carries no visible title because the active profile tab and page heading already provide context. Each badge is either locked or earned, with no labels or tier markers competing with the artwork. Earned marks use their full palette. Locked marks remain visible as silhouettes. Selecting any badge opens a responsive detail dialog with its name, state, requirement, exact progress, and progress bar. The old persistent achievement list does not appear below the case. Earning a badge adds one result callout with its name and a direct route to the Badge Case. Badge count determines the first four Trainer ranks: Youngster with zero or one, Ace with two through four, Veteran with five or more until every badge is earned, and League Challenger after earning every badge. A perfect Quizmon League clear advances League Challenger to Champion. Youngster uses the classic cobalt Trainer Card accent; Ace, Veteran, and League Challenger or Champion replace it with progressively brighter bronze, silver, and gold structural accents across the card banner, rank plate, portrait, rules, and footer. Earned card finishes use a short looping pixel sheen, while Champion adds staggered pixel sparkles and Hall of Fame state. Both effects pause while the card is offscreen or the page is hidden, and reduced-motion preferences receive a static finish. A specialty qualifies after ten correct answers in its knowledge field and remains separate from rank.

Trainer Titles use one warm wood display board with eight icon-led progress plaques and no title banner or repeated current-title panel. Each locked plaque uses one large lock mark; earning it reveals the specialty icon. The visible plaque copy is limited to the title name and correct-answer count. Selecting a plaque opens its description, progress, and equip or unequip action. The equipped title appears only on the Trainer Card, paired with the same specialty icon.

After every badge is earned, a ruled gateway appears directly below the Badge Case. It names Quizmon League, states the mechanical requirement of 15 correct answers, shows the five square stage markers, and provides one start action. It does not use slogans, promotional promises, or campaign-style copy. After a perfect clear, the gateway becomes the Hall of Fame entry and offers a rematch.

Only the active profile tab panel exists in the accessibility tree. Trainer Card, Badge Case, and Trainer Titles are peer artifacts and never present as faces of one object. The Trainer Card and Badge Case exports use the same `3 / 2` landscape silhouette at every viewport, while Trainer Titles sizes to its collection. Mobile content becomes denser without shrinking the badges into noise. The Trainer Card's first visit receives one reveal animation.

Customization stays optional and local. The card editor offers only a name and partner; earned titles are equipped from their detail dialogs on the Titles board. Rank alone determines the card accent, so progression remains visible and the editor does not offer cosmetic color choices. Saving requests persistent browser storage when the platform supports it. Sharing renders the active artifact at double its displayed resolution from the same profile and progression data. The image itself contains no site attribution. Native share text places the canonical game URL on a new line and always links to the main game rather than the local profile route. Native file sharing is preferred, with direct PNG download as the fallback. The successful native-share message is announced to assistive technology without adding visible confirmation copy.

### Results Surface

Results use the same contained surface as questions. Time appears once as a formatted clock without a repeated seconds count. Rounds of ten questions or fewer use only the compact answer trail to communicate accuracy. Longer rounds replace the trail with one `correct / total` summary and never add a percentage. The score sits in a full-width cream band with navy rules at the top and bottom. A standard correct answer earns 1,000 knowledge points. A Champion search answer earns 1,000 knowledge points. Revealing choices reduces it to 750, and later clues reduce it to 500 and then 250. A speed bonus adds `round-to-10(knowledge × 3 × 2^(-answer milliseconds / 5000))`, so it starts at three times the answer's knowledge value and halves every five seconds. The mastery bonus is `round(total knowledge² / (question count × 1000))`, so accuracy has visible weight. The band shows knowledge, speed, and mastery separately, while the interface never presents a maximum score.

A Trainer Card callout follows the score only when one or more League Badges are earned. Routine specialty and badge progress does not compete with the result actions. A failed League result names the reached trial and offers Retry League with the preserved lineup. A perfect clear names the player League Champion, links directly to the Hall of Fame Badge Case, and offers a rematch with a new lineup. Neither League state adds promotional copy or social sharing. Best scores use only three durable keys: Daily, League Training, and Custom Training. Train again is the primary Training action and immediately starts a fresh round with the current saved configuration. Sharing opens the native system sheet when available and otherwise offers direct service targets in a compact Quizmon dialog. Daily shares use the date without repeating the in-game mode label, and green or red squares communicate each result. Clipboard copy is always labelled as a separate action.

### Dialogs and Fields

Dialogs use one cream header and a paper body. Settings keeps a cream action footer outside its scrolling body, while the shorter share sheet lays out clearly labelled service buttons and one full-width copy action. A dark navy backdrop provides separation without blurring the landscape. Checkboxes are square white controls with `2px` navy borders and cobalt checked states. Number fields use the same white fill, navy border, and compact corners. On mobile, preserve three-column setup choice grids and comfortable share targets.

### Brand Assets and Footer

Serve the wordmark and landscape through AVIF and WebP sources, with the checked-in provenance-bearing PNG plates as fallbacks. Keep the wordmark proportions and the landscape's crisp pixel edges. Use cover cropping for the background without blur, gradients, overlays, or added scenery.

The visible footer remains unboxed and uses three controlled tiers. The first line contains copyright, the project email, and GitHub. The second credits TextStudio, PokéAPI, and @beresteyskaya. The smaller third line carries the visible Nintendo and The Pokémon Company credit. Every named source is linked, each tier controls its own wrapping, and the footer stays in normal document flow so it never covers gameplay.

### Motion

The first question and the result surface use one `180ms` ease-out entrance from `0.45rem` below while fading from transparent. The question panel stays fixed while later questions replace its content. The open dialog uses the same treatment at `160ms`. Buttons use `100ms` transform, shadow, and brightness transitions. A newly earned Daily Combo locks into place once with a short scale-and-rotation snap and one expanding yellow capture ring. Do not chain entrances or add decorative looping motion. Honor `prefers-reduced-motion` by reducing animation and transition durations to effectively immediate.

## Do's and Don'ts

### Do:

- **Do** preserve the exact wordmark and crisp pixel-art landscape.
- **Do** keep landing controls small and let open scenery dominate the first viewport.
- **Do** use Gabarito for interface text and reserve Martian Mono for compact data and scores.
- **Do** preserve hard edges on pixel sprites and natural rendering on illustrated Pokémon artwork.
- **Do** give buttons a physical pressed state through synchronized translation and compressed lower shadows.
- **Do** animate the start and finish of a round, keep its question surface stable, and honor reduced motion.
- **Do** prefer AVIF and WebP while retaining the provenance-bearing PNG plate fallbacks.
- **Do** keep ownership, production credits, and the visible Pokémon legal credit in three concise linked tiers.

### Don't:

- **Don't** build a giant HUD, simulated handheld frame, or full-page landing card.
- **Don't** use glass panels, blurred scenery, gradients, or diffuse floating-card shadows.
- **Don't** introduce pixel-font overkill, oversized uppercase labels, or decorative game glyphs.
- **Don't** force Pokémon sprites onto type, move, or ability choices that do not represent Pokémon.
- **Don't** add navigation, marketing copy, characters, ornamental frames, or ball symbols beyond functional game progression to fill open space.
- **Don't** redesign, redraw, crop, blur, or place the wordmark inside another container.
- **Don't** let decoration obscure answers, progress, score, modifiers, or keyboard focus.
