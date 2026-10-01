import { vars } from '../styles/theme.css.ts';
import { globalKeyframes, globalStyle } from '@vanilla-extract/css';
import * as classes from '../styles/classes.css.ts';

globalKeyframes('landing-spin', { to: { transform: 'rotate(360deg)' } });

globalStyle(`${classes.landing}`, {
  display: 'flex',
  width: '100%',
  minHeight: '0',
  alignSelf: 'stretch',
  paddingBlock: '1.5rem 0',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'clamp(0.8rem, 2svh, 1.4rem)',
});

globalStyle(`${classes.logoPicture}`, {
  display: 'block',
  width: 'min(90vw, clamp(20rem, 34vw, 31rem))',
  aspectRatio: '992 / 456',
});

globalStyle(`${classes.logo}`, {
  display: 'block',
  width: '100%',
  height: 'auto',
  objectFit: 'contain',
});

globalStyle(
  `${classes.landingPrimary},
${classes.landingControlStack}`,
  {
    display: 'grid',
    width: 'min(90vw, 26rem)',
    justifyItems: 'stretch',
    gap: '0.8rem',
  },
);

globalStyle(`${classes.landingControlStack}`, {
  width: 'min(90vw, 24rem)',
  minHeight: 'calc(3.25rem + 0.8rem + 4.7rem)',
  alignContent: 'start',
  justifyItems: 'center',
});

globalStyle(`${classes.dailyAction}`, {
  position: 'relative',
  display: 'flex',
  width: '100%',
  minHeight: 'clamp(4.8rem, 9svh, 5.7rem)',
  padding: '0.65rem 1rem',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.18rem',
  color: vars.paper,
  textAlign: 'center',
});

globalStyle(`${classes.dailyActionCopy}`, {
  display: 'flex',
  minWidth: '0',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.18rem',
});

globalStyle(`${classes.dailyActionComplete}`, {
  display: 'grid',
  color: vars.navy,
  background: vars.cream,
  gridTemplateColumns: '3.5rem minmax(0, 1fr) 3.5rem',
  alignContent: 'center',
});

globalStyle(`${classes.dailyActionComplete}::after`, {
  width: '100%',
  content: "''",
  gridColumn: '3',
  gridRow: '1',
});

globalStyle(
  `${classes.dailyActionComplete} > ${classes.shareResultButtonIcon}`,
  {
    width: '2.25rem',
    height: '2.25rem',
    gridColumn: '1',
    gridRow: '1',
    alignSelf: 'center',
    justifySelf: 'center',
  },
);

globalStyle(`${classes.dailyActionComplete} ${classes.dailyActionCopy}`, {
  gridColumn: '2',
  gridRow: '1',
  justifySelf: 'center',
});

globalStyle(`${classes.dailyActionTitle}`, {
  color: 'inherit',
  fontSize: vars.textHeadline,
  fontWeight: '800',
  lineHeight: '1.15',
});

globalStyle(`${classes.dailyActionDetail}`, {
  color: 'inherit',
  fontFamily: vars.fontData,
  fontSize: vars.textBrandDetail,
  fontWeight: '800',
  lineHeight: '1.2',
});

globalStyle(`${classes.landingSpinner}`, {
  display: 'inline-block',
  width: '0.65rem',
  height: '0.65rem',
  marginRight: '0.4rem',
  border: '2px solid currentColor',
  borderRightColor: 'transparent',
  borderRadius: '50%',
  animation: 'landing-spin 800ms linear infinite',
  verticalAlign: '-0.05rem',
});

globalStyle(`${classes.landingSpinner}`, {
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
});

globalStyle(`${classes.landingActions}`, {
  display: 'grid',
  width: '100%',
  minHeight: '3.25rem',
  gridTemplateColumns: '3.25rem minmax(0, 1fr)',
  gap: '0.55rem',
});

globalStyle(`${classes.landingActions} .game-button`, {
  width: '100%',
  minWidth: '0',
  minHeight: '3.25rem',
  padding: '0.25rem 0.5rem',
  fontSize: vars.textBrandControl,
  overflowWrap: 'anywhere',
});

globalStyle(`${classes.landingActions} .game-button > span`, {
  display: 'inline-flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.25em',
  color: 'inherit',
  font: 'inherit',
  letterSpacing: 'normal',
});

globalStyle(`${classes.landingLeagueButton}.game-button`, {
  display: 'grid',
  width: '100%',
  minHeight: '4.7rem',
  padding: '0.4rem 0.75rem',
  gridTemplateColumns: '5.8rem minmax(0, 1fr) 1.2rem',
  alignItems: 'center',
  gap: '0.55rem',
  color: vars.hallInk,
  background: vars.hallNight,
  boxShadow: `inset 0 0 0 2px ${vars.metalGold},
    0 0.2rem 0 ${vars.navyShadow}`,
  textAlign: 'left',
  vars: { '--hall-gold': vars.metalGold },
});

globalStyle(`${classes.landingLeagueButtonLocked}.game-button`, {
  minHeight: '3.8rem',
  color: vars.muted,
  background: vars.disabledSurface,
  borderColor: vars.muted,
  boxShadow: 'none',
  textDecoration: 'none',
});

globalStyle(
  `${classes.landingLeagueButtonLocked} ${classes.landingLeagueCopy} strong,
${classes.landingLeagueButtonLocked} ${classes.landingLeagueCopy} > span`,
  { color: vars.muted },
);

globalStyle(
  `${classes.landingLeagueButtonLocked}.game-button:is(:hover, :active)`,
  { transform: 'none', boxShadow: 'none' },
);

globalStyle(
  `${classes.landingLeagueButtonLocked}:hover ${classes.landingLeagueCopy} > span`,
  {
    textDecoration: 'underline',
    textUnderlineOffset: '0.15em',
  },
);

globalStyle(`${classes.landingStatus}`, {
  width: '100%',
  margin: '0',
  color: vars.navy,
  fontWeight: '800',
  textAlign: 'center',
});

globalStyle(`${classes.landingStatusError}`, {
  display: 'grid',
  justifyItems: 'center',
  gap: '0.7rem',
});

globalStyle(`${classes.landingLeagueButton} ${classes.leagueTrophy}`, {
  width: '5.2rem',
  height: '4.4rem',
  margin: '0',
});

globalStyle(
  `${classes.landingLeagueButton} ${classes.leagueTrophy} ${classes.leagueTrophyImage}`,
  { width: '3.8rem', height: '3.8rem' },
);

globalStyle(`${classes.landingLeagueButton} ${classes.leagueTrophyRays}`, {
  width: '5.2rem',
  height: '5.2rem',
  inset: '-0.4rem 0',
});

globalStyle(`${classes.landingLeagueCopy}`, {
  display: 'grid',
  gap: '0.12rem',
});

globalStyle(`${classes.landingLeagueCopy} strong`, {
  color: vars.metalGold,
  fontSize: vars.textControl,
  lineHeight: '1.1',
});

globalStyle(`${classes.landingLeagueCopy} > span`, {
  fontSize: vars.textSmall,
  color: vars.hallMuted,
});

globalStyle(`${classes.landing}`, {
  '@media': { '(max-height: 40rem)': { gap: '1rem' } },
});

globalStyle(`${classes.logoPicture}`, {
  '@media': { '(max-height: 40rem)': { width: 'min(80vw, 37svh, 26rem)' } },
});

globalStyle(`${classes.landing}`, {
  '@media': {
    '(max-width: 50rem)': {
      justifyContent: 'flex-end',
      paddingTop: 'clamp(0.5rem, 2svh, 1.5rem)',
      gap: 'clamp(0.65rem, 1.5svh, 1.4rem)',
    },
  },
});

globalStyle(`${classes.logoPicture}`, {
  '@media': {
    '(max-width: 50rem)': { width: 'min(90vw, clamp(17rem, 42svh, 20rem))' },
  },
});

globalStyle(`${classes.landingCustomize} svg`, {
  width: '1.5rem',
  height: '1.5rem',
});
