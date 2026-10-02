import { vars } from '../../styles/theme.css.ts';
import { globalKeyframes, globalStyle } from '@vanilla-extract/css';
import * as classes from '../../styles/classes.css.ts';

globalKeyframes('league-radiance', {
  from: { transform: 'scale(0.75) rotate(-10deg)', opacity: '0.5' },
  to: { transform: 'scale(1) rotate(0)', opacity: '1' },
});

globalStyle(
  `${classes.leagueHall},
${classes.hallRecord}`,
  {
    vars: { '--hall-gold': vars.metalGold, '--focus': 'var(--hall-gold)' },
  },
);

globalStyle(`${classes.leagueHall}`, {
  width: 'min(48rem, 100%)',
  padding: 'clamp(0.8rem, 3vw, 1.5rem)',
  color: vars.hallInk,
  background: vars.hallNight,
  border: `3px solid ${vars.navy}`,
  borderRadius: vars.surfaceRadius,
  boxShadow: `inset 0 0 0 2px var(--hall-gold),
    0 0.3rem 0 ${vars.navyShadow}`,
  containerType: 'inline-size',
});

globalStyle(`${classes.leagueHallHeader}`, {
  display: 'flex',
  alignItems: 'stretch',
  gap: '0.7rem',
  marginBottom: '1.3rem',
});

globalStyle(`${classes.leagueHallHeader} > .game-button`, {
  flex: 'none',
  minHeight: '2.8rem',
});

globalStyle(`${classes.leagueHallNavigation}`, {
  display: 'grid',
  flex: '1',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.5rem',
});

globalStyle(`${classes.leagueHallNavigation} .game-button`, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.5rem 0.35rem',
  fontSize: vars.textSmall,
  textAlign: 'center',
  textDecoration: 'none',
});

globalStyle(`${classes.leagueHallNavigation} [aria-pressed='true']`, {
  color: vars.navy,
  background: 'var(--hall-gold)',
});

globalStyle(
  `${classes.leagueHall} h1,
${classes.hallRecord} h1`,
  {
    margin: '0',
    color: 'var(--hall-gold)',
    fontSize: 'clamp(1.9rem, 6cqi, 2.8rem)',
    fontWeight: '800',
    lineHeight: '1.1',
    textAlign: 'center',
    textWrap: 'balance',
  },
);

globalStyle(`${classes.leagueHall} h1:focus`, { outline: 'none' });

globalStyle(`${classes.leagueTrophy}`, {
  position: 'relative',
  display: 'grid',
  width: 'min(100%, 24rem)',
  height: '15rem',
  marginInline: 'auto',
  isolation: 'isolate',
  placeItems: 'center',
});

globalStyle(`${classes.leagueTrophyRays}`, {
  position: 'absolute',
  zIndex: '-1',
  inset: '0',
  width: '100%',
  height: '100%',
  color: 'var(--hall-gold)',
  maskImage: 'radial-gradient(ellipse, black 25%, transparent 70%)',
});

globalStyle(`${classes.leagueTrophy} ${classes.leagueTrophyImage}`, {
  width: '12rem',
  height: '12rem',
  filter: 'drop-shadow(0 0.4rem 0 #061c35)',
});

globalStyle(`${classes.leagueTrophyLocked} ${classes.leagueTrophyImage}`, {
  filter: 'brightness(0) saturate(100%) drop-shadow(0 2px 0 #7c94ab)',
});

globalStyle(`${classes.leagueTrophyLocked} ${classes.leagueTrophyRays}`, {
  color: '#8ba7c2',
});

globalStyle(
  `${classes.leagueChallenge},
${classes.leagueHallEmpty}`,
  {
    display: 'grid',
    justifyItems: 'center',
    textAlign: 'center',
    padding: '1rem 0 0.5rem',
  },
);

globalStyle(
  `${classes.leagueChallenge} > p,
${classes.leagueHallEmpty} > p`,
  {
    maxWidth: '35ch',
    margin: '0.6rem 0 1.5rem',
    color: vars.hallMuted,
    fontSize: vars.textBody,
    lineHeight: '1.5',
    textWrap: 'pretty',
  },
);

globalStyle(`${classes.leagueHallEmpty} h2`, {
  margin: '0',
  fontSize: vars.textHeadline,
  textWrap: 'balance',
});

globalStyle(`${classes.leagueChallenge} > ${classes.leagueProgress}`, {
  margin: '0 0 2rem',
});

globalStyle(`${classes.leagueGoldButton}.game-button`, {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  color: vars.navy,
  background: 'var(--hall-gold)',
  fontWeight: '800',
});

globalStyle(`${classes.hallRecord}`, {
  padding: 'clamp(0.8rem, 3cqi, 1.5rem)',
  color: vars.hallInk,
  background: vars.hallNight,
  border: '1px solid #6e6845',
});

globalStyle(`${classes.hallRecordPortrait}`, {
  position: 'relative',
  aspectRatio: '1.12',
  marginTop: '0.5rem',
  isolation: 'isolate',
});

globalStyle(`${classes.hallRecordPortrait}::before`, {
  position: 'absolute',
  inset: '33% 1% 1%',
  borderRadius: '50%',
  background:
    'radial-gradient(\n    ellipse at 50% 45%,\n    #385b73,\n    #1c405e 65%,\n    transparent 66%\n  )',
  content: "''",
});

globalStyle(`${classes.hallRecordPortrait} > ${classes.leagueTrophy}`, {
  position: 'absolute',
  top: '-5%',
  left: '20%',
  width: '60%',
  height: '65%',
});

globalStyle(`${classes.hallRecordPortrait} ${classes.leagueTrophyImage}`, {
  width: '65%',
  height: 'auto',
});

globalStyle(`${classes.hallRecordGroup}`, {
  position: 'absolute',
  inset: '0',
  padding: '0',
  margin: '0',
  listStyle: 'none',
});

globalStyle(`${classes.hallRecordGroup} li`, {
  position: 'absolute',
  aspectRatio: '1',
  transform: 'translate(-50%, -65%)',
});

globalStyle(
  `${classes.hallRecordGroup} img,
${classes.hallRecordMissing}`,
  {
    display: 'block',
    width: '100%',
    height: 'auto',
    aspectRatio: '1',
    objectFit: 'contain',
    imageRendering: 'pixelated',
    filter: 'drop-shadow(0 2px 1px #091f35)',
  },
);

globalStyle(`${classes.hallRecordSpriteFlipped}`, { transform: 'scaleX(-1)' });

globalStyle(`${classes.hallRecordMissing}`, {
  display: 'grid',
  fontSize: vars.textHeadline,
  placeItems: 'center',
});

globalStyle(`${classes.hallRecordHonors}`, {
  textAlign: 'center',
  marginTop: '1rem',
});

globalStyle(`${classes.hallRecordHonors} h2`, {
  margin: '0 0 0.7rem',
  fontSize: 'clamp(1.4rem, 4cqi, 2rem)',
  fontWeight: '800',
  lineHeight: '1.1',
  overflowWrap: 'anywhere',
});

globalStyle(`${classes.hallRecordScore}`, {
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  gap: '0.4rem',
  margin: '0',
  color: 'var(--hall-gold)',
  fontSize: vars.textSmall,
});

globalStyle(`${classes.hallRecordScore} strong`, {
  fontFamily: vars.fontData,
  fontSize: 'clamp(1.2rem, 4cqi, 1.8rem)',
});

globalStyle(`${classes.hallRecordSignature}`, {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  gap: '0.6rem',
  marginTop: '1.4rem',
  paddingTop: '0.8rem',
  borderTop: '1px solid #55748d',
  color: vars.hallMuted,
  fontSize: vars.textMicro,
});

globalStyle(`${classes.leagueHallHistory}`, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.8rem',
  marginBottom: '1rem',
  fontSize: vars.textSmall,
});

globalStyle(`${classes.leagueHallHistory} .game-button`, {
  width: '2.75rem',
  minHeight: '2.75rem',
  padding: '0.3rem',
});

globalStyle(`${classes.leagueHallActions}`, {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.8rem',
  marginBlock: '1.3rem 0.4rem',
});

globalStyle(`${classes.leagueHallNotice}`, {
  color: vars.hallInk,
  textAlign: 'center',
});

globalStyle(`${classes.leagueHallInduction} ${classes.leagueTrophyRays}`, {
  animation: 'league-radiance 650ms cubic-bezier(0.16, 1, 0.3, 1)',
});

globalStyle(`${classes.leagueTrophy} ${classes.leagueTrophyImage}`, {
  '@container': { '(max-width: 32rem)': { width: '10rem', height: '10rem' } },
});

globalStyle(`${classes.hallRecordPortrait} ${classes.leagueTrophyImage}`, {
  '@container': { '(max-width: 32rem)': { width: '65%', height: 'auto' } },
});

globalStyle(`${classes.hallRecordHonors} h2`, {
  '@container': { '(max-width: 32rem)': { marginBottom: '0.5rem' } },
});

globalStyle(`${classes.hallRecordSignature}`, {
  '@container': { '(max-width: 32rem)': { justifyContent: 'center' } },
});

globalStyle(`${classes.leagueHallInduction} ${classes.leagueTrophyRays}`, {
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
});
