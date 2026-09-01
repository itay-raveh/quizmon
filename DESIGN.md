---
name: Quizmon
description: A restrained Logo Echo interface for a quick, charming Pokémon knowledge game.
colors:
  primary: '#0d6be6'
  primary-text: '#ddfafe'
  outline: '#083b7e'
  hard-shadow: '#123f76'
  soft-sky: '#b7e1fa'
  depth-edge: '#eed23e'
  accent-surface: '#feec99'
  game-surface: '#fffbea'
  ink: '#143149'
  muted-ink: '#446078'
  success: '#18763a'
  error: '#a92843'
  focus: '#083b7e'
  footer-ink: '#1b3e40'
typography:
  display:
    fontFamily: 'Vend Sans Variable, system-ui, sans-serif'
    fontSize: '2.3rem'
    fontWeight: 700
    lineHeight: 1.05
  headline:
    fontFamily: 'Vend Sans Variable, system-ui, sans-serif'
    fontSize: '1.75rem'
    fontWeight: 700
  body:
    fontFamily: 'Vend Sans Variable, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
  control:
    fontFamily: 'Vend Sans Variable, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 700
  label:
    fontFamily: 'Vend Sans Variable, system-ui, sans-serif'
    fontSize: '0.82rem'
    fontWeight: 700
    lineHeight: 1.35
  numeric:
    fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace'
    fontSize: '0.76rem'
    fontWeight: 800
    letterSpacing: '0.04em'
rounded:
  compact: '0.2rem'
  control: '0.3rem'
  button: '0.5rem'
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
  daily-panel:
    backgroundColor: '{colors.accent-surface}'
    textColor: '{colors.outline}'
    rounded: '{rounded.control}'
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
---

# Design System: Quizmon

## Overview

**Creative North Star: "Logo Echo"**

The implemented direction is the approved Logo Echo world, seed `ae843a63`. Quizmon starts with two binding identity assets: the exact Pokémon-like wordmark and the crisp pixel-art landscape. Interface chrome borrows their visual confidence without simulating a whole handheld console. Small cream and cobalt surfaces use deep navy outlines, slim yellow lower edges, compact corners, and modest hard shadows.

The landing screen remains open and asset-led. The wordmark occupies the sky, the Trainer Trial sits in one narrow strip, and the two Training controls stay small beneath it. Question, result, and setup states may use one contained cream surface because they need sustained reading and interaction, but they must still feel like parts of the same compact game system.

The result is playful, direct, and tactile. It avoids generic application chrome and keeps the quiz itself visually dominant.

**Key Characteristics:**

- Exact wordmark and crisp landscape remain the primary identity.
- Cream, cobalt, navy, and yellow controls echo the wordmark in restrained doses.
- Dense game information stays clear through Vend Sans and small monospace numeric labels.
- Hard-edged depth makes controls feel physical without adding ornamental framing.
- One short transform-and-opacity entrance opens a round and its results.

## Colors

The palette takes its interactive colors from the wordmark, then uses warm pale surfaces to keep the quiz readable against the landscape.

### Primary

- **Battle Cobalt** (`colors.primary`): Primary actions, selected checkboxes, answer choices, and the timer.
- **Deep Game Navy** (`colors.outline`): Control outlines, headings, progress borders, links, and high-emphasis labels.
- **Pale Button Ink** (`colors.primary-text`): Text on cobalt controls.

### Secondary

- **Butter Depth Edge** (`colors.depth-edge`): The slim lower edge under controls and surfaces, plus progress fill. It signals game-object depth rather than decoration.
- **Daily Cream** (`colors.accent-surface`): The daily challenge strip, dialog header and footer, and score band.
- **Soft Sky** (`colors.soft-sky`): Quiet progress tracks and loading details.

### Tertiary

- **Correct Forest** (`colors.success`): Correct-answer feedback only.
- **Wrong Berry** (`colors.error`): Incorrect-answer and error feedback only.

### Neutral

- **Warm Game Paper** (`colors.game-surface`): Question, results, dialog, quiet buttons, and fields.
- **Landscape Ink** (`colors.ink`): Main copy on warm surfaces.
- **Muted Blue Ink** (`colors.muted-ink`): Supporting descriptions, mode labels, details, and status text.
- **Hard Navy Shadow** (`colors.hard-shadow`): The dark lower layer under compact controls and contained surfaces.
- **Focus Navy** (`colors.focus`): Keyboard focus outlines separated from controls by a light offset gap.
- **Field Footer Ink** (`colors.footer-ink`): The small unboxed credit line over the landscape.

**The Logo-First Rule.** Cobalt and yellow echo the wordmark. They do not compete with it by filling large decorative regions.

**The State-Color Rule.** Green and rose communicate answer or error state only. Do not use them as general accents.

## Typography

- **Display Font:** Vend Sans Variable, with system sans-serif fallback
- **Body Font:** Vend Sans Variable, with system sans-serif fallback
- **Label/Mono Font:** System monospace for compact numeric status only

**Character:** Vend Sans is friendly and readable without looking like a generic corporate interface. Its rounded forms belong with the wordmark while staying clear over dense game states. Monospace is a narrow functional accent, not a pixel-game theme.

### Hierarchy

- **Display** (700, `clamp(1.65rem, 4.5vw, 2.3rem)`, 1.05): Question and results titles.
- **Headline** (700, `clamp(1.35rem, 4vw, 1.75rem)`): Dialog titles.
- **Body** (400, `1rem`): Instructions, descriptions, and general copy.
- **Control** (700, `1rem`): Buttons, answers, checkbox labels, and result values.
- **Label** (700, `0.82rem`, 1.35): Game modes, helper text, result details, and status copy.
- **Numeric** (800, `0.76rem`, `0.04em` letter spacing): Question progress and elapsed time. Large score figures may use the same monospace family at a larger responsive size.

**The No-Pixel-Font Rule.** Do not use bitmap or novelty pixel fonts. Pixel character comes from the landscape, not from reduced text legibility.

**The Wordmark-Is-Art Rule.** Render the approved wordmark asset. Never recreate or approximate it with live type.

## Layout

The landscape is a fixed full-viewport plate with centered cover cropping. Main content is centered within the safe viewport height and uses fluid outer padding from `0.85rem` to `1.75rem`.

The landing page is an open stage, not a card. On desktop, the wordmark, daily strip, and two-button row occupy the center while most of the sky and field remain visible. At the `36rem` breakpoint, the wordmark expands to `90vw`, the daily strip expands to `90%`, and the two actions each use `42%` of the viewport width. Preserve the same vertical story instead of inventing a mobile navigation or stacking extra containers.

Question and result panels use `min(42rem, 94vw)`. Text answer choices form two equal columns on desktop and one column at `36rem` and below. Pokémon answer choices remain a two-by-two field on phones so their compact sprite tiles do not turn the round into a long scrolling list. On short, wide screens below `43rem` in height, identification questions may split artwork and answers into two columns while progress, title, feedback, and the leave-game action span both columns.

The Training setup dialog uses `min(42rem, calc(100% - 1rem))`, caps its height to the safe viewport, and scrolls only its body. Its action footer remains visible. Generation and knowledge-category grids reduce to three columns on narrow screens.

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

Quizmon uses compact rounded rectangles with firm navy strokes. Tiny indicators and checkbox controls use the compact radius. Timers and small panels use a slightly larger control radius. Buttons use a modest `0.5rem` radius, and major game surfaces stop at `0.75rem`.

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
- **Focus:** Use a `0.2rem` focus-yellow outline with a `0.2rem` offset.
- **Disabled:** Remove the shadow, reduce saturation, set opacity to `0.65`, and keep the cursor neutral.

### Daily Challenge Strip

The landing signature is a narrow cream strip with a `2px` navy outline, a short yellow edge, and a modest navy shadow. The title and date stay left aligned. The primary action stays inside the right end. Do not turn this strip into a large dashboard card.

### Question Surface

The question surface is one warm panel centered over the unchanged landscape. The progress row sits first, followed by a centered category title, mode, prompt, and answer grid. Sprite questions add unframed artwork with a modest drop shadow, size questions compare Pokémon directly, and the Champion question reveals clues inside one ruled cream field.

Answer buttons use the primary control treatment and include small outlined number-key labels. Size, description, evolution, and stat questions present each Pokémon option as a cream field with a crisp front-facing PokéAPI pixel sprite and a cobalt nameplate containing its Pokédex number and readable Vend Sans name. Type, ability, move, and matchup questions keep text answers and place one compact pixel sprite of the named Pokémon between the prompt and choices. Identification and Champion questions retain their larger artwork or silhouette. Once selected, the correct answer becomes green, the wrong selected answer becomes rose, and unrelated answers fade to `0.5` opacity.

### Progress and Timer

The progress track is a slim pale-blue bar with a `2px` navy border and yellow fill. The timer is a compact cobalt badge with the same outline and a short yellow lower edge. Both use monospace numeric labels, but neither should introduce a broader HUD frame.

### Results Surface

Results use the same contained surface as questions. Rows are separated by low-contrast navy dividers, and a compact answer trail summarizes the round. The score sits in a full-width cream band with navy rules at the top and bottom. Actions reuse the primary and quiet button pair. Sharing opens the native system sheet when available and otherwise offers direct service targets in a compact Quizmon dialog; clipboard copy is always labelled as a separate action.

### Dialogs and Fields

Dialogs use one cream header and a paper body. The Training setup keeps a cream action footer outside its scrolling body, while the shorter share sheet lays out clearly labelled service buttons and one full-width copy action. A dark navy backdrop provides separation without blurring the landscape. Checkboxes are square white controls with `2px` navy borders and cobalt checked states. Number fields use the same white fill, navy border, and compact corners. On mobile, preserve three-column setup choice grids and comfortable share targets.

### Brand Assets and Footer

Serve the wordmark and landscape through AVIF and WebP sources, with the checked-in provenance-bearing PNG plates as fallbacks. Keep the wordmark proportions and the landscape's crisp pixel edges. Use cover cropping for the background without blur, gradients, overlays, or added scenery.

The visible footer remains unboxed and comp-faithful: “Wordmark made with TextStudio · Data from PokéAPI · Fan project”. Keep the Nintendo trademark sentence visually hidden and noninteractive.

### Motion

The first question and the result surface use one `180ms` ease-out entrance from `0.45rem` below while fading from transparent. The question panel stays fixed while later questions replace its content. The open dialog uses the same treatment at `160ms`. Buttons use `100ms` transform, shadow, and brightness transitions. Do not chain entrances or add decorative looping motion. Honor `prefers-reduced-motion` by reducing animation and transition durations to effectively immediate.

## Do's and Don'ts

### Do:

- **Do** preserve the exact wordmark and crisp pixel-art landscape.
- **Do** keep landing controls small and let open scenery dominate the first viewport.
- **Do** use Vend Sans for interface text and reserve monospace for compact numeric status.
- **Do** use classic front-facing pixel sprites as compact gameplay information and preserve their hard edges when scaled.
- **Do** give buttons a physical pressed state through synchronized translation and compressed lower shadows.
- **Do** animate the start and finish of a round, keep its question surface stable, and honor reduced motion.
- **Do** prefer AVIF and WebP while retaining the provenance-bearing PNG plate fallbacks.
- **Do** preserve the exact visible footer copy and its visually hidden trademark sentence.

### Don't:

- **Don't** build a giant HUD, simulated handheld frame, or full-page landing card.
- **Don't** use glass panels, blurred scenery, gradients, or diffuse floating-card shadows.
- **Don't** introduce pixel-font overkill, oversized uppercase labels, or decorative game glyphs.
- **Don't** force Pokémon sprites onto type, move, or ability choices that do not represent Pokémon.
- **Don't** add navigation, marketing copy, characters, ball symbols, badges, or ornamental frames to fill open space.
- **Don't** redesign, redraw, crop, blur, or place the wordmark inside another container.
- **Don't** let decoration obscure answers, progress, score, modifiers, or keyboard focus.
