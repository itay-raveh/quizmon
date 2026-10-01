import { vars } from '../../../styles/theme.css.ts';
import { globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalStyle(`${classes.championSearch}`, {
  display: 'grid',
  width: 'min(100%, 34rem)',
  margin: '0',
  alignSelf: 'start',
  justifySelf: 'center',
  gap: '0.35rem',
});

globalStyle(`${classes.championSearch} > label`, {
  color: vars.navy,
  fontSize: vars.textLabel,
  fontWeight: '800',
});

globalStyle(`${classes.championSearchControls}`, {
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'start',
  gap: '0.65rem',
});

globalStyle(`${classes.championSearchCombobox}`, { minWidth: '0' });

globalStyle(`${classes.championSearch} input`, {
  width: '100%',
  minHeight: '3rem',
  padding: '0.65rem 0.8rem',
  color: vars.ink,
  background: vars.paper,
  border: `3px solid ${vars.navy}`,
  borderRadius: '0.5rem',
  boxShadow: `0 0.2rem 0 ${vars.yellow}`,
  fontWeight: '700',
});

globalStyle(`${classes.championSearch} input::placeholder`, {
  color: vars.muted,
  opacity: '1',
});

globalStyle(`${classes.championSearch} input:disabled`, { opacity: '1' });

globalStyle(`${classes.championSearchCorrect} input`, {
  color: vars.primaryText,
  background: vars.correct,
});

globalStyle(`${classes.championSearchWrong} input`, {
  color: vars.primaryText,
  background: vars.wrong,
});

globalStyle(`${classes.championSearchAnswer}`, {
  width: 'min(100%, 34rem)',
  margin: '0.35rem 0 0',
  padding: '0.55rem 0.75rem',
  justifySelf: 'center',
  color: vars.navy,
  background: vars.missed,
  border: `2px solid ${vars.navy}`,
  borderRadius: '0.5rem',
  fontWeight: '700',
});

globalStyle(`${classes.championSearchControls} > .game-button`, {
  minWidth: '5.75rem',
  minHeight: '3rem',
});

globalStyle(
  `${classes.championSearch} ul,
${classes.championSearchEmpty}`,
  {
    position: 'absolute',
    zIndex: '3',
    top: 'calc(100% + 0.45rem)',
    right: '0',
    left: '0',
    padding: '0.25rem',
    margin: '0',
    overflowY: 'auto',
    color: vars.ink,
    background: vars.paper,
    border: `3px solid ${vars.navy}`,
    borderRadius: '0.5rem',
    boxShadow: `0 0.22rem 0 ${vars.yellow},
    0 0.42rem 0 ${vars.navyShadow}`,
  },
);

globalStyle(`${classes.championSearch} ul`, {
  position: 'static',
  marginTop: '0.45rem',
  maxHeight: 'min(13rem, var(--suggestion-viewport-height, 100vh) * 0.4)',
  listStyle: 'none',
});

globalStyle(`${classes.championSearch} li`, {
  display: 'flex',
  minHeight: '3.25rem',
  padding: '0.6rem 0.75rem',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: '0.75rem',
  borderRadius: '0.25rem',
  cursor: 'pointer',
  fontWeight: '750',
});

globalStyle(`${classes.championSearch} li + li`, {
  borderTop: '1px solid rgb(12 53 96 / 15%)',
});

globalStyle(`${classes.championSearch} li > ${classes.pokemonIdentity}`, {
  display: 'grid',
  flex: '1',
  gridTemplateAreas: "'name' 'number'",
  gap: '0.2rem',
  lineHeight: '1.2',
});

globalStyle(`${classes.championSearch} ${classes.pokemonIdentityName}`, {
  gridArea: 'name',
  fontSize: vars.textLabel,
  overflowWrap: 'normal',
  wordBreak: 'normal',
});

globalStyle(`${classes.championSearch} ${classes.pokemonIdentityNumber}`, {
  gridArea: 'number',
  opacity: '0.8',
});

globalStyle(`${classes.championSearch} li > ${classes.pokemonPickerSprite}`, {
  flex: '0 0 2.5rem',
});

globalStyle(`${classes.championSearch} ${classes.itemRenderable}`, {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

globalStyle(`${classes.championSearch} ${classes.itemRenderableSprite}`, {
  width: '2.5rem',
  height: '2.5rem',
  objectFit: 'contain',
});

globalStyle(`${classes.championSearch} li > span`, {
  minWidth: '0',
  overflowWrap: 'anywhere',
});

globalStyle(
  `${classes.championSearch} li > small,
${classes.championSearch} li > ${classes.typeBadges}`,
  { flexShrink: '0' },
);

globalStyle(
  `${classes.championSearch} li small,
${classes.answerNameplate} small,
${classes.answerIdentity} small`,
  {
    fontFamily: vars.fontData,
    fontSize: vars.textMini,
    fontWeight: '800',
    letterSpacing: '0.04em',
  },
);

globalStyle(`${classes.championSearch} li:hover:not([aria-selected='true'])`, {
  color: vars.navy,
  background: vars.yellow,
});

globalStyle(`${classes.championSearch} li[aria-selected='true']`, {
  color: vars.primaryText,
  background: vars.blue,
});

globalStyle(`${classes.championSearchEmpty}`, {
  position: 'static',
  marginTop: '0.45rem',
  fontSize: vars.textLabel,
  fontWeight: '700',
  textAlign: 'center',
});

globalStyle(`${classes.typePickerField}`, {
  position: 'relative',
  minWidth: '0',
});

globalStyle(`${classes.typePickerSelected}`, {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginTop: '0.65rem',
});

globalStyle(`${classes.typePickerRemove}`, {
  display: 'flex',
  minHeight: '2.75rem',
  padding: '0.35rem 0.55rem',
  alignItems: 'center',
  gap: '0.65rem',
  color: vars.navy,
  background: vars.paper,
  border: `2px solid ${vars.navy}`,
  borderRadius: '0.4rem',
  cursor: 'pointer',
});

globalStyle(`${classes.typePickerRemove}:hover`, {
  background: vars.yellow,
});

globalStyle(`${classes.typePickerRemove} svg`, {
  width: '1rem',
  height: '1rem',
});

globalStyle(`${classes.typePickerResults}`, {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  width: 'min(100%, 34rem)',
  gap: '0.5rem',
  alignSelf: 'start',
  justifySelf: 'center',
});

globalStyle(`${classes.typePickerResult}`, {
  display: 'flex',
  padding: '0.45rem 0.65rem',
  color: vars.paper,
  border: `2px solid ${vars.navy}`,
  borderRadius: '0.5rem',
  minHeight: '2.75rem',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.65rem',
  fontWeight: '700',
});

globalStyle(`${classes.typePickerResultCorrect}`, {
  background: vars.correct,
});

globalStyle(`${classes.typePickerResultWrong}`, { background: vars.wrong });

globalStyle(`${classes.typePickerResult} ${classes.answerMatchupHelp}`, {
  position: 'static',
  color: 'inherit',
  marginLeft: 'auto',
  transform: 'none',
});

globalStyle(
  `${classes.questionResponse}:has(${classes.typePicker}, ${classes.typePickerResults})`,
  { minHeight: '7rem' },
);

globalStyle(`${classes.typePickerResultMissed}`, {
  color: vars.navy,
  background: vars.missed,
});
