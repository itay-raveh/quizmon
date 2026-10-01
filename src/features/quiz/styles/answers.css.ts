import { vars } from '../../../styles/theme.css.ts';
import { globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalStyle(`${classes.answers}`, {
  display: 'grid',
  width: '100%',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gridAutoRows: 'minmax(min-content, 1fr)',
  gap: '0.7rem',
});

globalStyle(`${classes.answersPokemon}`, { gap: '0.8rem' });

globalStyle(`${classes.answer}`, {
  position: 'relative',
  display: 'grid',
  minWidth: '0',
  minHeight: '3.2rem',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  alignItems: 'center',
  gap: '0.65rem',
  overflowWrap: 'anywhere',
  textAlign: 'left',
});

globalStyle(`${classes.answerText}`, {
  display: 'grid',
  minWidth: '0',
  justifyItems: 'center',
  gap: '0.3rem',
});

globalStyle(`${classes.answerTextDetail}`, {
  display: 'grid',
  justifyItems: 'center',
  gap: '0.2rem',
  fontSize: vars.textMicro,
  fontWeight: '400',
});

globalStyle(`${classes.answer} kbd`, {
  display: 'grid',
  width: '1.45rem',
  height: '1.45rem',
  color: 'currentColor',
  background: vars.navy,
  border: '1px solid currentColor',
  borderRadius: '0.2rem',
  fontFamily: vars.fontData,
  fontSize: vars.textMicro,
  lineHeight: '1',
  placeItems: 'center',
});

globalStyle(`${classes.answer} kbd svg`, { width: '0.9rem', height: '0.9rem' });

globalStyle(`${classes.answerPokemon}`, {
  minHeight: '6.4rem',
  padding: '0',
  color: vars.navy,
  background: vars.paper,
  gridTemplateColumns:
    'calc(var(--answer-sprite-size) + 0.3rem) minmax(0, 1fr)',
  gap: '0',
  vars: { '--answer-sprite-size': '6.2rem' },
});

globalStyle(`${classes.answerRevealReserved}`, { visibility: 'hidden' });

globalStyle(`${classes.answerPokemon} kbd`, {
  position: 'absolute',
  zIndex: '1',
  top: '0.42rem',
  left: '0.42rem',
  background: 'rgba(255, 251, 234, 0.92)',
});

globalStyle(`${classes.answerSpriteField}`, {
  display: 'grid',
  minWidth: '0',
  alignSelf: 'stretch',
  placeItems: 'center',
});

globalStyle(`${classes.answerSprite}`, {
  width: 'var(--answer-sprite-size)',
  maxWidth: '100%',
  height: 'var(--answer-sprite-size)',
  filter: 'drop-shadow(0.18rem 0.22rem 0 rgba(8, 59, 126, 0.28))',
});

globalStyle(`${classes.answerNameplate}`, {
  display: 'grid',
  minWidth: '0',
  alignSelf: 'stretch',
  padding: '0.75rem',
  alignContent: 'center',
  color: vars.primaryText,
  background: vars.blue,
  borderLeft: `2px solid ${vars.navy}`,
  textAlign: 'left',
  gap: '0.15rem',
});

globalStyle(
  `${classes.answerNameplateStat},
${classes.answerIdentityStat}`,
  {
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gridTemplateAreas: "'number stat'\n    'name stat'",
    columnGap: '0.45rem',
  },
);

globalStyle(
  `${classes.answerNameplateStat} ${classes.pokemonIdentityNumber},
${classes.answerIdentityStat} ${classes.pokemonIdentityNumber}`,
  { gridArea: 'number' },
);

globalStyle(
  `${classes.answerNameplateStat} ${classes.pokemonIdentityName},
${classes.answerIdentityStat} ${classes.pokemonIdentityName}`,
  { gridArea: 'name' },
);

globalStyle(`${classes.answerStat}`, {
  minWidth: '2ch',
  gridArea: 'stat',
  alignSelf: 'center',
  fontFamily: vars.fontData,
  fontSize: vars.textLabel,
  fontVariantNumeric: 'tabular-nums',
  fontWeight: '900',
  lineHeight: '1',
  textAlign: 'right',
});

globalStyle(`${classes.answerStatReserved}`, { visibility: 'hidden' });

globalStyle(`${classes.answerName}`, {
  overflowWrap: 'anywhere',
  fontSize: vars.textAnswer,
  lineHeight: '1.08',
  textShadow: `0.08rem 0.08rem 0 ${vars.navy}`,
});

globalStyle(`${classes.answerIdentity}`, {
  display: 'grid',
  minWidth: '0',
  justifyItems: 'start',
  gap: '0.03rem',
  lineHeight: '1.08',
});

globalStyle(`${classes.typeBadges}`, {
  display: 'flex',
  alignItems: 'center',
  gap: '0.2rem',
});

globalStyle(`${classes.answerTypes}`, {
  minWidth: '0',
  marginTop: '0.3rem',
  flexWrap: 'wrap',
});

globalStyle(`${classes.answerTypesReserved}`, { visibility: 'hidden' });

globalStyle(`${classes.typeBadge}`, {
  width: '3.125rem',
  height: '1.25rem',
  imageRendering: 'pixelated',
});

globalStyle(
  `${classes.answerTypeChoice},
${classes.questionTypes}`,
  { justifyContent: 'center' },
);

globalStyle(`${classes.questionTypes}`, { margin: '-0.2rem 0 0.55rem' });

globalStyle(`${classes.answerCorrect}`, {
  background: vars.correct,
  filter: 'none',
});

globalStyle(
  `${classes.answerMissed} kbd,
${classes.answerCorrect} kbd,
${classes.answerWrong} kbd`,
  {
    color: vars.navy,
    background: vars.paper,
    borderColor: vars.navy,
    boxShadow: `0 0.12rem 0 ${vars.yellow}`,
    fontSize: vars.textLabel,
    fontWeight: '800',
    opacity: '1',
  },
);

globalStyle(`${classes.answerSelected}`, {
  color: vars.navy,
  background: vars.yellow,
  filter: 'none',
});

globalStyle(`${classes.answerSelected} kbd`, {
  color: vars.paper,
  background: vars.navy,
});

globalStyle(`${classes.answerSelected} ${classes.answerNameplate}`, {
  color: vars.navy,
  background: vars.yellow,
});

globalStyle(`${classes.answerSpriteSilhouette}`, {
  filter: 'brightness(0) drop-shadow(0.18rem 0.22rem 0 rgba(8, 59, 126, 0.28))',
});

globalStyle(`${classes.answerWrong}`, {
  background: vars.wrong,
  filter: 'none',
});

globalStyle(`${classes.answerCorrect} ${classes.answerNameplate}`, {
  background: vars.correct,
});

globalStyle(`${classes.answerWrong} ${classes.answerNameplate}`, {
  background: vars.wrong,
});

globalStyle(`${classes.answer}:disabled`, { filter: 'none', opacity: '1' });

globalStyle(`${classes.checkAnswer}`, { marginTop: '0.7rem' });

globalStyle(`${classes.questionActionSlot}`, {
  display: 'grid',
  width: '100%',
  paddingTop: '0.75rem',
});

globalStyle(`${classes.questionActionSlot} > .game-button`, {
  gridArea: '1 / 1',
  marginTop: '0',
  placeSelf: 'start center',
});

globalStyle(`${classes.questionActionReserve}`, {
  visibility: 'hidden',
  pointerEvents: 'none',
});

globalStyle(`${classes.newGame}`, {
  minHeight: '2.75rem',
  paddingBlock: '0.55rem',
  marginTop: '1.05rem',
});

globalStyle(`${classes.answerMatchup}`, {
  position: 'relative',
  display: 'grid',
  minWidth: '0',
});

globalStyle(`${classes.answerMatchup} > ${classes.answer}`, {
  width: '100%',
  height: '100%',
  paddingRight: '5.4rem',
});

globalStyle(`${classes.answerMatchupHelp}`, {
  position: 'absolute',
  top: '50%',
  right: '0.4rem',
  display: 'flex',
  minHeight: '2.75rem',
  padding: '0.35rem',
  alignItems: 'center',
  gap: '0.3rem',
  color: vars.primaryText,
  background: 'transparent',
  border: '0',
  borderRadius: '0.35rem',
  cursor: 'pointer',
  fontFamily: vars.fontData,
  fontSize: vars.textLabel,
  fontWeight: '800',
  transform: 'translateY(-50%)',
});

globalStyle(`${classes.answerMatchupHelp} svg`, {
  width: '1.25rem',
  height: '1.25rem',
});

globalStyle(`${classes.answerMatchupHelp}:hover`, {
  background: vars.navy,
});

globalStyle(`${classes.answerMatchupHelp}:focus-visible`, {
  outline: `2px solid ${vars.paper}`,
  outlineOffset: '0',
});

globalStyle(`${classes.answerMatchupPokemon} > ${classes.answer}`, {
  paddingRight: '0',
});

globalStyle(`${classes.answers}${classes.answersSuperEffectiveAttacker}`, {
  gridTemplateColumns: '1fr',
  gap: '0.6rem',
});

globalStyle(
  `${classes.answersSuperEffectiveAttacker} ${classes.answerPokemon}`,
  {
    minHeight: '5.25rem',
    gridTemplateColumns: '2.25rem var(--answer-sprite-size) minmax(0, 1fr)',
    gridTemplateRows: 'auto',
    vars: { '--answer-sprite-size': '4.5rem' },
  },
);

globalStyle(
  `${classes.answersSuperEffectiveAttacker} ${classes.answerPokemon} kbd`,
  { position: 'static', justifySelf: 'center' },
);

globalStyle(
  `${classes.answersSuperEffectiveAttacker} ${classes.answerNameplate}`,
  { padding: '0.5rem 3.25rem 0.5rem 0.5rem', border: '0', textAlign: 'left' },
);

globalStyle(`${classes.answersSuperEffectiveAttacker} ${classes.answerName}`, {
  fontSize: vars.textBody,
});

globalStyle(`${classes.answersSuperEffectiveAttacker} ${classes.answerTypes}`, {
  justifyContent: 'flex-start',
});

globalStyle(
  `${classes.answersSuperEffectiveAttacker} ${classes.answerMatchupHelp}`,
  {
    top: '0.25rem',
    right: '0.25rem',
    bottom: '0.25rem',
    width: '2.75rem',
    padding: '0.4rem 0',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '0.5rem',
    border: '0',
    borderRadius: '0',
    transform: 'none',
  },
);

globalStyle(
  `${classes.answersSuperEffectiveAttacker} ${classes.answerMatchupHelp} > span`,
  { fontSize: vars.textBody },
);

globalStyle(`${classes.matchupHelp}${classes.questionTypeHelp}[popover]`, {
  width: 'max-content',
  maxWidth: 'calc(100vw - 1.5rem)',
  maxHeight: 'calc(100dvh - 2rem)',
  padding: '0',
  overflowY: 'auto',
});

globalStyle(`${classes.matchupHelpCalculation}`, {
  padding: '0.65rem 3rem 0.65rem 0.65rem',
});

globalStyle(
  `${classes.matchupHelpCalculation} + ${classes.matchupHelpCalculation}`,
  { borderTop: `1px solid ${vars.navy}` },
);

globalStyle(`${classes.matchupHelpAttack}`, {
  marginBottom: '0.65rem',
  color: vars.navy,
  fontSize: vars.textBody,
  fontWeight: '500',
});

globalStyle(`${classes.matchupHelpAttack} b`, { fontWeight: '800' });

globalStyle(`${classes.matchupHelpFormula}`, {
  display: 'grid',
  gap: '0.75rem',
  color: vars.navy,
  fontFamily: vars.fontInterface,
  fontSize: vars.textBody,
  fontWeight: '600',
  lineHeight: '1.25',
});

globalStyle(`${classes.matchupHelpFactor}`, {
  display: 'grid',
  gridTemplateColumns:
    'minmax(0, 3.125rem) minmax(0, 3.375rem) minmax(\n      0,\n      3.125rem\n    )',
  gridTemplateRows: 'auto 2rem',
  alignItems: 'center',
  justifyItems: 'center',
  justifyContent: 'start',
  gap: '0.1rem 0.4rem',
});

globalStyle(`${classes.matchupHelpFactor} > ${classes.typeBadges}`, {
  gridRow: '2',
  minWidth: '0',
});

globalStyle(`${classes.matchupHelpFactor} ${classes.typeBadge}`, {
  maxWidth: '100%',
  height: 'auto',
});

globalStyle(
  `${classes.matchupHelpFactor} > ${classes.typeBadges}:first-child`,
  { gridColumn: '1' },
);

globalStyle(`${classes.matchupHelpFactor} > ${classes.typeBadges}:last-child`, {
  gridColumn: '3',
});

globalStyle(`${classes.matchupHelpFactor} ${classes.questionRelationEffect}`, {
  display: 'contents',
});

globalStyle(
  `${classes.matchupHelpFactor} ${classes.questionRelationEffect} > strong`,
  { gridArea: '1 / 2' },
);

globalStyle(`${classes.matchupHelpFactor} ${classes.questionRelationArrow}`, {
  gridArea: '2 / 2',
  maxWidth: '100%',
});

globalStyle(`${classes.matchupHelpTotal}`, {
  paddingTop: '0.6rem',
  borderTop: `1px solid ${vars.navy}`,
  textAlign: 'center',
});

globalStyle(`${classes.answers}${classes.answersSuperEffectiveAttacker}`, {
  '@media': {
    '(min-width: 36.01rem)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
  },
});

globalStyle(
  `${classes.answersSuperEffectiveAttacker} ${classes.answerPokemon}`,
  {
    '@container': {
      '(max-width: 16rem)': {
        gridTemplateColumns: '2.25rem minmax(0, 1fr) 2.75rem',
        gridTemplateRows: 'var(--answer-sprite-size) auto',
      },
    },
  },
);

globalStyle(
  `${classes.answersSuperEffectiveAttacker} ${classes.answerNameplate}`,
  {
    '@container': {
      '(max-width: 16rem)': { gridColumn: '1 / -1', padding: '0.5rem' },
    },
  },
);

globalStyle(
  `${classes.answersSuperEffectiveAttacker} ${classes.answerMatchupHelp}`,
  {
    '@container': {
      '(max-width: 16rem)': {
        bottom: 'auto',
        width: '3rem',
        minHeight: '4rem',
        color: vars.navy,
        background: vars.paper,
        border: '0',
        borderRadius: '0.2rem',
      },
    },
  },
);

globalStyle(
  `${classes.answersSuperEffectiveAttacker} ${classes.answerMatchupHelp}:focus-visible`,
  { '@container': { '(max-width: 16rem)': { outlineColor: vars.navy } } },
);

globalStyle(
  `${classes.answerMissed},
${classes.answerMissed} ${classes.answerNameplate}`,
  { color: vars.navy, background: vars.missed },
);

globalStyle(
  `${classes.answerMatchup}:has(${classes.answerMissed}) > ${classes.answerMatchupHelp}`,
  { color: vars.navy },
);

globalStyle(`${classes.answersStatements} ${classes.answerText}`, {
  whiteSpace: 'pre-line',
});

globalStyle(
  `${classes.answersStatements},
${classes.answersEffectDetails}`,
  { gridTemplateColumns: 'minmax(0, 1fr)', gridAutoRows: 'auto' },
);

globalStyle(`${classes.answerItem}`, {
  gridTemplateColumns: 'auto 3rem minmax(0, 1fr)',
});

globalStyle(`${classes.answerItemRenderable}`, { display: 'contents' });

globalStyle(`${classes.answerItemSlot}`, {
  display: 'grid',
  width: '3rem',
  height: '3rem',
  placeItems: 'center',
});

globalStyle(`${classes.answerItemSprite}`, {
  width: '3rem',
  height: '3rem',
  objectFit: 'contain',
});

globalStyle(`${classes.answerReveal}`, {
  minWidth: '0',
  fontSize: vars.textSmall,
  fontWeight: '500',
  lineHeight: '1.3',
  textShadow: 'none',
});

globalStyle(`${classes.answers}${classes.answersMany}`, {
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(9rem, 100%), 1fr))',
});

globalStyle(`${classes.answersMany} ${classes.answer}`, {
  padding: '0.55rem',
  gap: '0.35rem',
});

globalStyle(`${classes.answersTypeOptions} ${classes.answerTypeChoice}`, {
  minWidth: '0',
});

globalStyle(
  `${classes.answersTypeOptions} ${classes.answerTypeChoice} ${classes.typeBadge}`,
  { maxWidth: '100%', height: 'auto', aspectRatio: '5 / 2' },
);

globalStyle(
  `${classes.answerSelected} ${classes.answerName},
${classes.answerMissed} ${classes.answerName}`,
  { textShadow: 'none' },
);

globalStyle(`${classes.answers}${classes.answersEvolutionLevels}`, {
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
});

globalStyle(`${classes.answersEvolutionLevels} ${classes.answer}`, {
  minHeight: '4rem',
  fontSize: vars.textHeadline,
  fontVariantNumeric: 'tabular-nums',
});

globalStyle(
  `${classes.questionResponse}:has(${classes.answersEvolutionLevels})`,
  { minHeight: '0' },
);

globalStyle(`${classes.answersEffectDetails} ${classes.answer}`, {
  minHeight: '4.8rem',
});

globalStyle(
  `${classes.answersEffectDetails} ${classes.answerText},
${classes.answerEffects}`,
  { width: '100%' },
);

globalStyle(`${classes.answerEffects}`, { display: 'grid', gap: '0.55rem' });

globalStyle(`${classes.answerEffect}`, {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)',
  alignItems: 'center',
  gap: '0.65rem',
});

globalStyle(`${classes.answerEffect} strong`, {
  gridColumn: '2',
  gridRow: '1',
  fontSize: 'clamp(1.2rem, 4cqi, 1.65rem)',
  lineHeight: '1.2',
  textAlign: 'end',
  fontVariantNumeric: 'tabular-nums',
});

globalStyle(`${classes.answerEffect} > span`, {
  gridColumn: '1',
  gridRow: '1',
  fontSize: vars.textSmall,
  fontWeight: '600',
  lineHeight: '1.3',
  textAlign: 'start',
});

globalStyle(`${classes.moveReveal}`, {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4rem',
});

globalStyle(`${classes.answersNature} ${classes.answerText}`, {
  justifyItems: 'start',
  gap: '0.55rem',
});
