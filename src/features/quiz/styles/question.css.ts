import { vars } from '../../../styles/theme.css.ts';
import { globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalStyle(
  `${classes.questionEnter},
${classes.results}`,
  { animation: 'surface-in 180ms ease-out both' },
);

globalStyle(`${classes.question}`, {
  display: 'grid',
  padding: 'var(--question-panel-padding)',
  containerType: 'inline-size',
  justifyItems: 'center',
  vars: {
    '--question-panel-padding': 'clamp(1rem, 2.4vw, 1.5rem)',
    '--question-stimulus-size': '9rem',
    '--question-response-size': '14rem',
  },
});

globalStyle(
  `${classes.question} h1,
${classes.results} h1`,
  {
    margin: '0.85rem 0 0',
    color: vars.navy,
    fontSize: vars.textDisplay,
    fontWeight: '800',
    lineHeight: '1.05',
    textAlign: 'center',
  },
);

globalStyle(`${classes.questionSubjectNumber}`, {
  color: vars.muted,
  fontFamily: vars.fontData,
  fontSize: vars.textMicro,
  fontWeight: '800',
  letterSpacing: '0.02em',
});

globalStyle(`${classes.questionContext}`, {
  display: 'grid',
  width: '100%',
  minWidth: '0',
  gridTemplateRows: 'auto',
  gap: '0.5rem',
  marginBlock: '0.6rem 0.75rem',
});

globalStyle(`${classes.questionStimulus}:empty`, { display: 'none' });

globalStyle(`${classes.questionPrompt}`, { margin: '0' });

globalStyle(`${classes.questionMoveDescription}`, {
  display: 'block',
  maxWidth: '42ch',
  margin: '0.5rem auto 0',
  color: vars.muted,
  fontSize: vars.textBody,
  fontWeight: '500',
  lineHeight: '1.4',
  textWrap: 'pretty',
});

globalStyle(`${classes.natureEffect}`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0.7rem',
  width: 'min(28.7rem, 100%)',
});

globalStyle(`${classes.natureEffect} > span`, { minWidth: '0' });

globalStyle(
  `${classes.natureEffect}:not(${classes.natureEffectCompact}) ${classes.statDirection}`,
  { width: '100%', height: '100%', padding: '0.7rem', gap: '0.4rem' },
);

globalStyle(
  `${classes.natureEffect}:not(${classes.natureEffectCompact}) ${classes.statDirection} > strong`,
  { fontSize: 'clamp(0.75rem, 3cqi, 1rem)' },
);

globalStyle(
  `${classes.natureEffect}:not(${classes.natureEffectCompact})
  ${classes.statDirection}
  ${classes.questionRelationArrow}`,
  { width: '2rem', height: '2rem' },
);

globalStyle(`${classes.natureEffectCompact}`, {
  display: 'flex',
  flexWrap: 'wrap',
  width: 'auto',
  gap: '0.35rem 0.9rem',
});

globalStyle(`${classes.questionSupportingText}`, {
  display: 'block',
  marginTop: '0.5rem',
  color: vars.muted,
  fontSize: vars.textMicro,
  fontWeight: '600',
});

globalStyle(
  `${classes.questionSupportingText}:has(${classes.questionInlineItem})`,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
  },
);

globalStyle(`${classes.questionInlineItem}`, {
  flex: '0 0 2.5rem',
  width: '2.5rem',
  height: '2.5rem',
  objectFit: 'contain',
});

globalStyle(`${classes.questionInstruction}`, {
  alignSelf: 'start',
  width: 'min(100%, 60ch)',
  justifySelf: 'center',
  color: vars.navy,
  fontSize: vars.textBody,
  fontWeight: '750',
  lineHeight: '1.4',
  textAlign: 'center',
  textWrap: 'balance',
  overflowWrap: 'anywhere',
});

globalStyle(`${classes.questionStimulus}`, {
  display: 'grid',
  minWidth: '0',
  alignContent: 'center',
  justifyItems: 'center',
});

globalStyle(`${classes.questionArtwork}`, {
  display: 'grid',
  justifyItems: 'center',
  gap: '0.18rem',
});

globalStyle(`${classes.questionResponse}`, {
  display: 'grid',
  width: '100%',
  minWidth: '0',
  minHeight: 'var(--question-response-size)',
});

globalStyle(`${classes.questionResponseSearch}`, { minHeight: '0' });

globalStyle(`${classes.questionVisual}`, {
  display: 'grid',
  width: '100%',
  minWidth: '0',
  placeItems: 'center',
});

globalStyle(`${classes.questionVisual} .generation-label`, {
  color: vars.navy,
});

globalStyle(`${classes.questionEvolutionChain}`, {
  gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)',
  alignItems: 'start',
  gap: '0.35rem',
});

globalStyle(
  `${classes.questionEvolutionChain} ${classes.questionVisualSubject}`,
  { width: '100%' },
);

globalStyle(
  `${classes.questionEvolutionChain} ${classes.questionVisualPokemonSlot}`,
  { width: 'min(100%, 5rem)', height: 'auto', aspectRatio: '1' },
);

globalStyle(
  `${classes.questionEvolutionChain} ${classes.questionRelationArrow}`,
  { width: 'clamp(1.25rem, 5cqw, 2.5rem)', marginTop: '1.5rem' },
);

globalStyle(
  `${classes.answerClassification},
${classes.answerGeneration}`,
  { fontSize: '0.85em' },
);

globalStyle(
  `${classes.answerClassificationReserved},
${classes.answerGenerationReserved}`,
  { visibility: 'hidden' },
);

globalStyle(`${classes.questionVisualSubject}`, {
  display: 'grid',
  minWidth: '0',
  maxWidth: '100%',
  justifyItems: 'center',
  gap: '0.18rem',
});

globalStyle(`${classes.questionVisualPokemon}`, {
  width: '5rem',
  height: '5rem',
  filter: 'drop-shadow(0.18rem 0.22rem 0 rgba(8, 59, 126, 0.28))',
});

globalStyle(`${classes.questionVisualSubjectName}`, {
  display: 'grid',
  minHeight: '1.85rem',
  alignContent: 'center',
  justifyItems: 'center',
  gap: '0.03rem',
  color: vars.navy,
  fontSize: vars.textLabel,
  fontWeight: '850',
  lineHeight: '1.15',
});

globalStyle(`${classes.question} ${classes.questionVisualSubjectName}`, {
  minHeight: '2rem',
  overflowWrap: 'anywhere',
  textAlign: 'center',
});

globalStyle(`${classes.questionVisualSubjectNumber}`, {
  color: vars.muted,
  fontFamily: vars.fontData,
  fontSize: vars.textMini,
  fontWeight: '800',
  letterSpacing: '0.04em',
  lineHeight: '1',
});

globalStyle(`${classes.questionVisualMysteryType}`, {
  display: 'grid',
  minHeight: '1.25rem',
  justifyItems: 'center',
});

globalStyle(`${classes.questionVisualMysteryType} > *`, { gridArea: '1 / 1' });

globalStyle(`${classes.questionVisualTypeAnswerConcealed}`, {
  visibility: 'hidden',
});

globalStyle(`${classes.typeBadgeMystery}`, { objectFit: 'fill' });

globalStyle(
  `${classes.questionVisualRoundupType} ${classes.typeBadge},
${classes.answerTypeChoice} ${classes.typeBadge}`,
  { width: '4.6875rem', height: '1.875rem' },
);

globalStyle(`${classes.statDirection}`, {
  display: 'grid',
  width: 'min(14rem, 100%)',
  minHeight: '4.9rem',
  padding: '0.7rem 0.7rem 0.7rem 1.2rem',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: '0.9rem',
  color: vars.navy,
  background: vars.cream,
  border: `3px solid ${vars.navy}`,
  borderRadius: vars.buttonRadius,
});

globalStyle(`${classes.statDirection} ${classes.questionRelationArrow}`, {
  width: '2.5rem',
  height: '2.5rem',
});

globalStyle(`${classes.statDirection} > strong`, {
  fontFamily: vars.fontData,
  fontSize: `clamp(0.85rem, 3.5cqi, ${vars.textHeadline})`,
  overflowWrap: 'normal',
  wordBreak: 'normal',
  fontWeight: '850',
  letterSpacing: '0.02em',
});

globalStyle(`${classes.questionRelation}`, {
  width: 'min(31rem, 100%)',
  gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
  alignItems: 'center',
  justifyItems: 'center',
  gap: '1rem',
});

globalStyle(
  `${classes.questionRelationEvolution} > ${classes.questionVisualSubject}`,
  { width: '100%', minWidth: '0' },
);

globalStyle(`${classes.questionRelationEvolution}`, {
  alignItems: 'center',
  vars: { '--evolution-portrait-size': '5rem' },
});

globalStyle(
  `${classes.questionRelationEvolution} ${classes.questionVisualPokemonSlot}`,
  {
    width: 'min(100%, var(--evolution-portrait-size))',
    height: 'auto',
    aspectRatio: '1',
  },
);

globalStyle(
  `${classes.questionRelationEvolution} ${classes.questionVisualSubjectName}`,
  { maxWidth: '100%', overflowWrap: 'anywhere' },
);

globalStyle(
  `${classes.questionRelationEvolution} > ${classes.questionVisualSubject} > ${classes.typeBadges}`,
  {
    width: 'min(100%, 6.45rem)',
    minWidth: '0',
    justifyContent: 'center',
    gap: 'clamp(0.1rem, 1vw, 0.2rem)',
  },
);

globalStyle(
  `${classes.questionRelationEvolution}
  > ${classes.questionVisualSubject}
  > ${classes.typeBadges}
  ${classes.typeBadge}`,
  {
    width: 'auto',
    minWidth: '0',
    maxWidth: '3.125rem',
    height: 'auto',
    flex: '1 1 0',
    aspectRatio: '5 / 2',
  },
);

globalStyle(`${classes.questionRelationArrow}`, {
  display: 'grid',
  width: '3.375rem',
  height: '2rem',
  placeItems: 'center',
});

globalStyle(`${classes.questionRelationArrow} svg`, {
  display: 'block',
  width: '100%',
  height: '100%',
  overflow: 'visible',
});

globalStyle(`${classes.questionRelationArrow} path`, {
  fill: vars.blue,
  stroke: vars.navy,
  strokeLinejoin: 'round',
  strokeWidth: '3px',
});

globalStyle(`${classes.questionRelationEffect}`, {
  display: 'grid',
  justifyItems: 'center',
  gap: '0.1rem',
});

globalStyle(`${classes.questionRelationCaption}`, {
  color: vars.muted,
  fontSize: vars.textMicro,
  fontWeight: '700',
  lineHeight: '1.3',
  whiteSpace: 'nowrap',
});

globalStyle(`${classes.questionRelationEffect} > strong`, {
  color: vars.blue,
  fontFamily: vars.fontData,
  fontSize: vars.textHeadline,
  fontWeight: '850',
  lineHeight: '1',
});

globalStyle(
  `${classes.questionRelationMatchup} ${classes.questionVisualMysteryType}`,
  { width: '6.25rem', height: '2.5rem' },
);

globalStyle(`${classes.questionVisualPokemonSlot}`, {
  display: 'grid',
  width: '5rem',
  height: '5rem',
  overflow: 'hidden',
  placeItems: 'center',
  color: vars.navy,
  background: vars.cream,
  border: `3px solid ${vars.navy}`,
  borderRadius: vars.surfaceRadius,
});

globalStyle(`${classes.questionVisualPortrait}`, {
  display: 'grid',
  width: '5rem',
  height: '5rem',
  placeItems: 'center',
});

globalStyle(`${classes.questionVisualPokemonSlot} ${classes.pixelSprite}`, {
  width: '100%',
  height: '100%',
});

globalStyle(`${classes.questionVisualQuestionMark}`, {
  fontFamily: vars.fontData,
  fontSize: `calc(${vars.textHeadline} * 2)`,
  fontWeight: '850',
  lineHeight: '1',
});

globalStyle(`${classes.questionVisualEvolutionTypes}`, {
  display: 'flex',
  width: 'min(100%, 9.525rem)',
  minWidth: '0',
  minHeight: '1.875rem',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'clamp(0.15rem, 1.4vw, 0.35rem)',
});

globalStyle(
  `${classes.questionVisualEvolutionTypes} > ${classes.typeBadges},
${classes.questionVisualEvolutionTypes} ${classes.questionVisualMysteryType}`,
  {
    width: '3.125rem',
    minWidth: '0',
    maxWidth: '3.125rem',
    height: 'auto',
    flex: '0 1 3.125rem',
    aspectRatio: '5 / 2',
  },
);

globalStyle(
  `${classes.questionVisualEvolutionTypes} > ${classes.typeBadges} ${classes.typeBadge},
${classes.questionVisualEvolutionTypes} ${classes.questionVisualTypeAnswer} ${classes.typeBadge}`,
  { width: '100%', height: '100%' },
);

globalStyle(`${classes.questionVisualTypePlus}`, {
  color: vars.navy,
  fontFamily: vars.fontData,
  fontSize: vars.textBody,
  fontWeight: '850',
});

globalStyle(`${classes.questionVisualSubjectTypes}`, { minHeight: '1.25rem' });

globalStyle(`${classes.questionVisualSubjectTypes} ${classes.typeBadge}`, {
  width: '3.125rem',
  height: '1.25rem',
});

globalStyle(`${classes.questionRelationArrowUp} svg`, {
  transform: 'rotate(-90deg)',
});

globalStyle(`${classes.questionRelationArrowDown} svg`, {
  transform: 'rotate(90deg)',
});

globalStyle(`${classes.questionChampion} ${classes.questionStimulus}`, {
  gridTemplateColumns: 'minmax(0, 1fr) var(--question-stimulus-size)',
  alignItems: 'center',
  gap: '0.75rem',
});

globalStyle(
  `${classes.questionChampion} ${classes.questionArtwork}:only-child`,
  { gridColumn: '1 / -1' },
);

globalStyle(`${classes.clueBoardConcealed}`, { visibility: 'hidden' });

globalStyle(`${classes.answerMuted} ${classes.answerSprite}`, {
  opacity: '0.65',
});

globalStyle(`${classes.questionTitle} > svg`, {
  display: 'inline-block',
  width: '0.85em',
  height: '0.85em',
  marginRight: '0.35em',
  verticalAlign: '-0.08em',
});

globalStyle(`${classes.questionEvolutionEndpoints}`, {
  gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
  alignItems: 'center',
  gap: '0.75rem',
});

globalStyle(`${classes.questionItemSubject}`, {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.75rem',
  marginBlock: '0.1rem 0.8rem',
});

globalStyle(`${classes.questionItemSubject} strong`, {
  fontSize: 'clamp(1.4rem, 4.7cqi, 1.9rem)',
  lineHeight: '1.15',
});

globalStyle(`${classes.questionItemPortrait}`, {
  width: '4rem',
  height: '4rem',
  flex: '0 0 4rem',
  objectFit: 'contain',
});

globalStyle(`${classes.statDirectionCompact}`, {
  display: 'inline-flex',
  flexDirection: 'row-reverse',
  justifyContent: 'flex-end',
  whiteSpace: 'nowrap',
  width: 'auto',
  minHeight: '0',
  padding: '0',
  gap: '0.3rem',
  background: 'none',
  border: '0',
  color: 'inherit',
});

globalStyle(`${classes.statDirectionCompact} > strong`, {
  fontFamily: 'inherit',
  fontSize: 'inherit',
  fontWeight: '600',
  letterSpacing: 'normal',
});

globalStyle(
  `${classes.statDirectionCompact} ${classes.questionRelationArrow}`,
  { flex: '0 0 1rem', width: '1rem', height: '1rem' },
);

globalStyle(
  `${classes.statDirectionCompact} ${classes.questionRelationArrow} path`,
  { fill: vars.paper },
);
