import { vars } from '../../../styles/theme.css.ts';
import { globalKeyframes, globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalKeyframes('reward-gain', {
  from: { opacity: '0.35', transform: 'translateY(4px)' },
  to: { opacity: '1', transform: 'none' },
});

globalKeyframes('reward-highlight', {
  '0%,\n  100%': { opacity: '0' },
  '12%': { opacity: '1' },
});

globalKeyframes('reward-sweep', {
  '0%': { opacity: '0', transform: 'translateX(-100%)' },
  '20%,\n  80%': { opacity: '0.9' },
  '100%': { opacity: '0', transform: 'translateX(100%)' },
});

globalKeyframes('reward-unlock', {
  '0%,\n  100%': { transform: 'scale(1)' },
  '34%': { transform: 'scale(0.86)' },
  '43%': { transform: 'scale(1.28)' },
  '80%': { transform: 'scale(0.98)' },
});

globalKeyframes('reward-ring', {
  '0%': { opacity: '0', transform: 'scale(0.65)' },
  '12%': { opacity: '1' },
  '100%': { opacity: '0', transform: 'scale(1.8)' },
});

globalStyle(`${classes.rewardCase} ul`, {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: '6px',
  margin: '0',
  padding: '0',
  listStyle: 'none',
});

globalStyle(`${classes.reward}`, {
  position: 'relative',
  isolation: 'isolate',
  display: 'grid',
  gridTemplateColumns: '40px minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: '10px',
  minWidth: '0',
  minHeight: '44px',
  width: '100%',
  padding: '0',
  color: vars.navy,
  background: 'none',
  border: '0',
  font: 'inherit',
  textAlign: 'left',
});

globalStyle(`${classes.reward}::before`, {
  content: "''",
  position: 'absolute',
  inset: '-2px -6px',
  background: vars.cream,
  borderRadius: '4px',
  opacity: '0',
  zIndex: '-1',
  pointerEvents: 'none',
});

globalStyle(`${classes.rewardArt}`, {
  position: 'relative',
  display: 'grid',
  placeItems: 'center',
});

globalStyle(`${classes.rewardArt}::after`, {
  content: "''",
  position: 'absolute',
  inset: '0',
  border: '3px solid var(--tier-metal)',
  borderRadius: '5px',
  opacity: '0',
  pointerEvents: 'none',
});

globalStyle(`${classes.rewardArt} ${classes.trainerBadgeMark}`, {
  width: '40px',
  minWidth: '40px',
  height: '40px',
  padding: '2px',
  background: 'var(--tier-metal)',
  border: '2px solid var(--tier-edge)',
  borderRadius: '4px',
  boxShadow:
    'inset 2px 2px 0 var(--tier-light),\n    inset -2px -2px 0 var(--tier-edge)',
});

globalStyle(`${classes.rewardArt} ${classes.trainerTitleMark}`, {
  width: '36px',
  minWidth: '36px',
  height: '36px',
  borderWidth: '2px',
});

globalStyle(`${classes.rewardArt} ${classes.trainerTitleMark} > svg`, {
  width: '70%',
  height: '70%',
});

globalStyle(`${classes.rewardArt} ${classes.trainerTitleMarkTier}`, {
  color: vars.navy,
  fontSize: '10px',
  lineHeight: '1',
});

globalStyle(`${classes.rewardBody}`, {
  display: 'grid',
  minWidth: '0',
  gap: '5px',
});

globalStyle(`${classes.rewardName}`, {
  fontSize: vars.textBody,
  lineHeight: '1.12',
  overflowWrap: 'anywhere',
});

globalStyle(`${classes.rewardProgress}`, {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '8px',
});

globalStyle(
  `${classes.rewardProgress} small,
${classes.rewardVictory} small`,
  {
    color: vars.muted,
    fontSize: vars.textMicro,
    lineHeight: '1.2',
    overflowWrap: 'anywhere',
    fontVariantNumeric: 'tabular-nums',
  },
);

globalStyle(`${classes.reward}[data-tier-unlock='true']`, {
  padding: '10px',
  gridTemplateColumns: '48px minmax(0, 1fr) auto',
  border: '2px solid transparent',
  borderRadius: '0.38rem',
});

globalStyle(`${classes.reward}[data-tier-unlock='true']::before`, {
  inset: '0',
});

globalStyle(`${classes.reward}[data-unlocked='true']`, {
  background: 'var(--tier-light)',
  borderColor: 'var(--tier-edge)',
  boxShadow: 'inset 0 -4px 0 var(--tier-metal)',
});

globalStyle(
  `${classes.reward}[data-tier-unlock='true']
  ${classes.rewardArt}
  > :is(${classes.trainerBadgeMark}, ${classes.trainerTitleMark})`,
  { width: '48px', height: '48px' },
);

globalStyle(
  `${classes.reward}[data-unlocked='true'] ${classes.rewardProgress}`,
  { flexDirection: 'column', alignItems: 'stretch', gap: '6px' },
);

globalStyle(`${classes.reward}[data-unlocked='true'] ${classes.rewardTrack}`, {
  flex: 'none',
  background: 'var(--tier-metal)',
});

globalStyle(`${classes.rewardProgress} ${classes.isUnlocked}`, {
  color: vars.navy,
  fontSize: vars.textControl,
  fontWeight: '800',
});

globalStyle(`${classes.rewardTrack}`, {
  display: 'block',
  flex: '1 1 2.5rem',
  minWidth: '16px',
  height: '5px',
  overflow: 'hidden',
  background: vars.sky,
  borderRadius: '2px',
});

globalStyle(`${classes.rewardTrack} > span`, {
  position: 'relative',
  display: 'block',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: vars.blue,
  transformOrigin: 'left',
});

globalStyle(`${classes.rewardTrack} > span::after`, {
  content: "''",
  position: 'absolute',
  inset: '0',
  background: vars.yellow,
  opacity: '0',
  pointerEvents: 'none',
});

globalStyle(`${classes.reward}[data-tier='3'] ${classes.rewardTrack}`, {
  background: vars.navy,
  border: `1px solid ${vars.navy}`,
  height: '7px',
});

globalStyle(`${classes.reward}[data-tier='3'] ${classes.rewardTrack} > span`, {
  background: vars.metalGold,
});

globalStyle(`${classes.rewardGain}`, {
  minWidth: '2.3rem',
  color: vars.blue,
  font: `800 1.5rem / 1 ${vars.fontData}`,
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
});

globalStyle(`${classes.rewardHallMark}`, { width: '40px', height: '40px' });

globalStyle(`${classes.rewardVictory} > svg`, {
  width: '24px',
  height: '24px',
});

globalStyle(
  `${classes.rewardCase}[data-playing='true'] ${classes.rewardGain}`,
  { animation: 'reward-gain 240ms ease-out var(--reward-delay) backwards' },
);

globalStyle(
  `${classes.rewardCase}[data-playing='true'] ${classes.reward}::before`,
  { animation: 'reward-highlight 330ms linear var(--reward-delay) backwards' },
);

globalStyle(
  `${classes.rewardCase}[data-playing='true'] ${classes.rewardTrack} > span::after`,
  { animation: 'reward-sweep 620ms linear var(--reward-delay) backwards' },
);

globalStyle(
  `${classes.rewardCase}[data-playing='true'] [data-tier-unlock='true'] ${classes.rewardArt}`,
  { animation: 'reward-unlock 520ms linear calc(var(--reward-delay) + 330ms)' },
);

globalStyle(
  `${classes.rewardCase}[data-playing='true']
  [data-tier-unlock='true']
  ${classes.rewardArt}::after`,
  {
    animation:
      'reward-ring 380ms linear calc(var(--reward-delay) + 500ms)\n    backwards',
  },
);

globalStyle(
  `${classes.rewardCase}[data-playing='true'] [data-tier-unlock='true']::before`,
  {
    animation:
      'reward-highlight 500ms linear calc(var(--reward-delay) + 500ms)\n    backwards',
  },
);

globalStyle(
  `${classes.rewardCase} *,
  ${classes.rewardCase} ::before,
  ${classes.rewardCase} ::after`,
  {
    '@media': {
      '(prefers-reduced-motion: reduce)': { animation: 'none !important' },
    },
  },
);

globalStyle(`${classes.reward}`, {
  '@media': { '(max-width: 350px)': { gap: '8px' } },
});

globalStyle(`${classes.rewardName}`, {
  '@media': { '(max-width: 350px)': { fontSize: vars.textStatus } },
});

globalStyle(`${classes.rewardGain}`, {
  '@media': { '(max-width: 350px)': { fontSize: '1.35rem' } },
});
