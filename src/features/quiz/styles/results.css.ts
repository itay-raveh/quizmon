import { vars } from '../../../styles/theme.css.ts';
import { globalKeyframes, globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalKeyframes('perfect-sweep', {
  from: { transform: 'translateX(-100%)' },
  to: { transform: 'translateX(500%)' },
});

globalStyle(`${classes.results}`, {
  containerType: 'inline-size',
  padding: '0.75rem var(--results-padding) 0.875rem',
  textAlign: 'center',
  vars: { '--results-padding': '1rem' },
});

globalStyle(`${classes.resultsHeader}`, {
  display: 'grid',
  gridTemplateColumns: '44px minmax(0, 1fr)',
  alignItems: 'start',
  gap: '0.625rem',
  marginBottom: '0.75rem',
});

globalStyle(`${classes.results} ${classes.resultsHeader} h1`, {
  margin: '0',
  fontSize: '1.35rem',
  outline: 'none',
  textAlign: 'left',
  overflowWrap: 'anywhere',
});

globalStyle(`${classes.resultsClose}.game-button`, {
  width: '44px',
  height: '44px',
  minWidth: '44px',
  minHeight: '44px',
});

globalStyle(`${classes.resultsHeading}`, { minWidth: '0' });

globalStyle(`${classes.resultsHeaderWithCombo}`, {
  gridTemplateColumns: '44px minmax(0, 1fr) auto',
});

globalStyle(
  `${classes.resultsSubtitle},
${classes.resultsDate}`,
  {
    margin: '0.25rem 0 0',
    color: vars.muted,
    fontSize: vars.textStatus,
    lineHeight: '1.35',
    textAlign: 'left',
  },
);

globalStyle(`${classes.resultsSubtitle}`, { fontWeight: '700' });

globalStyle(`${classes.resultsCombo}`, { alignSelf: 'center' });

globalStyle(`${classes.resultsSettings}`, {
  margin: '0',
  color: vars.navy,
  fontSize: vars.textStatus,
});

globalStyle(`${classes.resultsSettings} summary`, {
  display: 'flex',
  width: 'fit-content',
  minHeight: '32px',
  alignItems: 'center',
  gap: '0.4rem',
  textAlign: 'left',
  cursor: 'pointer',
  listStyle: 'none',
});

globalStyle(`${classes.resultsSettings} summary::-webkit-details-marker`, {
  display: 'none',
});

globalStyle(`${classes.resultsSettings} summary:hover`, {
  color: vars.blue,
});

globalStyle(`${classes.resultsSettings} summary:focus-visible`, {
  outline: `2px solid ${vars.navy}`,
  outlineOffset: '2px',
});

globalStyle(`${classes.resultsSettings} summary svg`, { flexShrink: '0' });

globalStyle(`${classes.resultsSettings}[open] summary svg`, {
  transform: 'rotate(180deg)',
});

globalStyle(`${classes.resultsSettings} dl`, {
  display: 'grid',
  gap: '0.5rem',
  maxWidth: '28rem',
  margin: '0.5rem 0 0.75rem',
  textAlign: 'left',
});

globalStyle(`${classes.resultsSettings} dl > div`, {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: '0.125rem',
});

globalStyle(`${classes.resultsSettings} dt`, { fontWeight: '700' });

globalStyle(`${classes.resultsSettings} dd`, {
  margin: '0',
  overflowWrap: 'anywhere',
});

globalStyle(
  `${classes.resultScore},
${classes.resultDetails}`,
  {
    marginInline: 'calc(-1 * var(--results-padding))',
    paddingInline: 'var(--results-padding)',
    background: vars.cream,
  },
);

globalStyle(`${classes.resultScore}`, {
  paddingBlock: '8px 6px',
  borderTop: `2px solid ${vars.navy}`,
});

globalStyle(`${classes.resultScorePerfect}`, {
  position: 'relative',
  display: 'flex',
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.5rem var(--results-padding)',
  margin: '-8px calc(-1 * var(--results-padding)) 0.65rem',
  color: vars.metalGoldLight,
  background: vars.navy,
  borderBottom: `3px solid ${vars.metalGold}`,
});

globalStyle(`${classes.resultScorePerfect} strong`, {
  fontSize: vars.textHeadline,
  lineHeight: '1.1',
});

globalStyle(`${classes.resultScorePerfect}::after`, {
  position: 'absolute',
  inset: '0 auto 0 0',
  width: '25%',
  background: 'rgba(255, 255, 255, 0.16)',
  content: "''",
  pointerEvents: 'none',
  animation: 'perfect-sweep 700ms ease-out both',
});

globalStyle(`${classes.resultScorePerfect}::after`, {
  '@media': {
    '(prefers-reduced-motion: reduce)': { animation: 'none', display: 'none' },
  },
});

globalStyle(`${classes.resultDetails}`, {
  paddingBlock: '6px 10px',
  borderBottom: `2px solid ${vars.navy}`,
  marginBottom: '12px',
});

globalStyle(`${classes.score}`, { display: 'grid', color: vars.navy });

globalStyle(`${classes.score} > span`, {
  fontSize: vars.textMicro,
  fontWeight: '800',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
});

globalStyle(`${classes.score} strong`, {
  minWidth: '0',
  font: `800 clamp(2rem, 10vw, 2.35rem) / 1.05 ${vars.fontData}`,
  overflowWrap: 'anywhere',
  fontVariantNumeric: 'tabular-nums',
});

globalStyle(`${classes.personalBest}`, {
  margin: '2px 0 0',
  color: vars.navy,
  fontSize: vars.textLabel,
  fontWeight: '700',
});

globalStyle(`${classes.scoreMultiplied}`, { containerType: 'inline-size' });

globalStyle(`${classes.score}${classes.scoreMultiplied} strong`, {
  fontSize: 'min(2.35rem, calc(130cqw / var(--score-digits)))',
  whiteSpace: 'nowrap',
});

globalStyle(`${classes.scoreFactors}`, {
  display: 'flex',
  flexWrap: 'nowrap',
  gap: '0.25rem',
  margin: '0.75rem 0',
  padding: '0',
  listStyle: 'none',
  color: vars.navy,
});

globalStyle(`${classes.scoreFactors} li`, {
  display: 'grid',
  flex: '1',
  minWidth: '0',
  gap: '0.125rem',
  padding: '0.2rem 0',
  transition: 'color 150ms,\n    transform 150ms',
});

globalStyle(`${classes.scoreFactors} span`, {
  fontSize: `clamp(0.65rem, 3cqw, ${vars.textLabel})`,
  overflowWrap: 'anywhere',
});

globalStyle(`${classes.scoreFactors} strong`, {
  font: `800 1rem / 1.2 ${vars.fontData}`,
});

globalStyle(`${classes.scoreFactors} ${classes.scoreFactorsActive}`, {
  color: vars.navy,
  background: vars.yellow,
  transform: 'scale(1.08)',
});

globalStyle(`${classes.scoreFactors} li`, {
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
      transform: 'none',
    },
  },
});

globalStyle(`${classes.personalBestWarning}`, { color: vars.errorInk });

globalStyle(`${classes.resultsList}`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 4.5rem), 1fr))',
  gap: '6px',
  margin: '0 0 8px',
});

globalStyle(`${classes.resultsList} > div`, { minWidth: '0' });

globalStyle(`${classes.resultsList} dt`, {
  color: vars.muted,
  fontSize: vars.textMicro,
  fontWeight: '800',
});

globalStyle(`${classes.resultsList} dd`, {
  margin: '0',
  color: vars.navy,
  font: `800 0.85rem / 1.35 ${vars.fontData}`,
  overflowWrap: 'anywhere',
});

globalStyle(`${classes.resultsListTime} dd`, { whiteSpace: 'nowrap' });

globalStyle(`${classes.resultsListPrecise}`, {
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 7rem), 1fr))',
});

globalStyle(`${classes.resultDetails} > ${classes.leagueProgress}`, {
  margin: '1rem auto 0',
});

globalStyle(`${classes.answerTrail}`, {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '6px',
  margin: '0',
  padding: '0',
  listStyle: 'none',
});

globalStyle(`${classes.answerTrail} li`, {
  display: 'grid',
  flex: '0 0 25px',
  aspectRatio: '1',
  color: 'white',
  background: vars.wrong,
  border: `2px solid ${vars.navy}`,
  borderRadius: '0.2rem',
  placeItems: 'center',
});

globalStyle(`${classes.answerTrail} li > span:first-child`, {
  display: 'flex',
});

globalStyle(`${classes.answerTrail} svg`, { width: '100%', height: '100%' });

globalStyle(`${classes.answerTrail} ${classes.answerTrailCorrect}`, {
  background: vars.blue,
});

globalStyle(`${classes.rewardCase}`, { marginBottom: '12px' });

globalStyle(`${classes.results}`, {
  '@media': {
    '(max-width: 350px)': { vars: { '--results-padding': '0.75rem' } },
  },
});

globalStyle(`${classes.results} ${classes.resultsHeader} h1`, {
  '@media': { '(max-width: 350px)': { fontSize: '1.2rem' } },
});

globalStyle(`${classes.resultsList}`, {
  '@media': {
    '(max-width: 350px)': {
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 7rem), 1fr))',
    },
  },
});

globalStyle(`${classes.answerTrail}`, {
  '@media': { '(max-width: 350px)': { gap: '4px' } },
});

globalStyle(`${classes.answerTrail} li`, {
  '@media': { '(max-width: 350px)': { flexBasis: '22px' } },
});

globalStyle(`${classes.dailyReminderOffer}`, { margin: '0 0 1.2rem' });

globalStyle(`${classes.resultsOffer}`, {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.7rem',
  margin: '0 calc(-1 * var(--results-padding)) 12px',
  padding: '0.8rem var(--results-padding)',
  color: vars.navy,
  background: vars.metalGold,
  borderBottom: `2px solid ${vars.navy}`,
  textAlign: 'left',
});

globalStyle(`${classes.levelAdvancementOffer}`, { marginTop: '-12px' });

globalStyle(`${classes.resultsOffer} > strong`, {
  fontSize: vars.textControl,
});

globalStyle(`${classes.levelAdvancementOfferActions}`, {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.45rem',
});

globalStyle(`${classes.levelAdvancementOfferActions} .game-button`, {
  '@container': {
    '(max-width: 20rem)': {
      paddingInline: '0.45rem',
      fontSize: vars.textCompactControl,
    },
  },
});

globalStyle(`${classes.resultsActions}`, {
  display: 'flex',
  justifyContent: 'center',
  gap: '0.7rem',
  marginBottom: '12px',
});

globalStyle(`${classes.resultsActionsPaired}`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 7rem), 1fr))',
});

globalStyle(
  `${classes.shareResultButton}.game-button:not(${classes.dailyAction})`,
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
  },
);

globalStyle(`${classes.shareResultButtonIcon}`, {
  width: '1.2rem',
  height: '1.2rem',
  flex: 'none',
});

globalStyle(`${classes.resultsActions} .game-button`, {
  minHeight: '44px',
  padding: '8px',
});

globalStyle(`${classes.score} strong`, {
  '@container': { '(max-width: 15rem)': { fontSize: 'min(2.35rem, 12cqw)' } },
});

globalStyle(`${classes.rewardBody}`, {
  '@container': { '(max-width: 15rem)': { display: 'contents' } },
});

globalStyle(`${classes.rewardName}`, {
  '@container': { '(max-width: 15rem)': { gridColumn: '2 / -1' } },
});

globalStyle(`${classes.rewardArt}`, {
  '@container': { '(max-width: 15rem)': { gridRow: '1 / 3' } },
});

globalStyle(`${classes.rewardProgress}`, {
  '@container': { '(max-width: 15rem)': { gridColumn: '2' } },
});

globalStyle(`${classes.rewardGain}`, {
  '@container': { '(max-width: 15rem)': { gridColumn: '3', gridRow: '2' } },
});
