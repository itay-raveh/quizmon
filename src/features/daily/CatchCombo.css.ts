import { keyframes, style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css.ts';

const lock = keyframes({
  from: {
    filter: 'brightness(1.18)',
    transform: 'scale(0.78) rotate(-10deg)',
  },
  '72%': { transform: 'scale(1.08) rotate(2deg)' },
  to: { filter: 'brightness(1)', transform: 'scale(1) rotate(0)' },
});

const pulse = keyframes({
  from: { opacity: 0.9, transform: 'scale(0.68)' },
  to: { opacity: 0, transform: 'scale(1.24)' },
});

export const root = style({
  display: 'grid',
  width: '4.1rem',
  flex: 'none',
  justifyItems: 'center',
  color: vars.paper,
  pointerEvents: 'none',
});

export const dailyAction = style({
  position: 'absolute',
  top: '-1rem',
  right: '-0.4rem',
});

export const trainerCard = style({
  position: 'relative',
  zIndex: 5,
  width: '10.56cqw',
});

export const ball = style({
  position: 'relative',
  display: 'grid',
  width: '3.8rem',
  aspectRatio: '1',
  background: `linear-gradient(to bottom, ${vars.blue} 0 43%, ${vars.navy} 43% 57%, ${vars.paper} 57% 100%)`,
  border: `3px solid ${vars.navy}`,
  borderRadius: '50%',
  placeItems: 'center',
  '::before': {
    position: 'absolute',
    width: '2.05rem',
    aspectRatio: '1',
    background: vars.yellow,
    border: `3px solid ${vars.navy}`,
    borderRadius: '50%',
    content: "''",
  },
});

export const trainerBall = style({
  width: '8.36cqw',
  borderWidth: '0.44cqw',
  '::before': {
    width: '4.576cqw',
    borderWidth: '0.44cqw',
  },
});

export const ballCelebrate = style({
  animation: `${lock} 420ms cubic-bezier(0.16, 1, 0.3, 1) both`,
  '@media': {
    '(prefers-reduced-motion: reduce)': { animation: 'none' },
  },
});

export const ring = style({
  position: 'absolute',
  inset: '-0.45rem',
  border: `0.22rem solid ${vars.yellow}`,
  borderRadius: '50%',
  opacity: 0,
});

export const ringCelebrate = style({
  animation: `${pulse} 520ms 80ms cubic-bezier(0.16, 1, 0.3, 1) both`,
  '@media': {
    '(prefers-reduced-motion: reduce)': { animation: 'none' },
  },
});

export const count = style({
  position: 'relative',
  zIndex: 1,
  color: vars.navy,
  fontFamily: vars.fontData,
  fontSize: '1rem',
  fontWeight: 800,
  letterSpacing: '-0.04em',
  lineHeight: 1,
  selectors: {
    '&[data-digits="3"]': { fontSize: '0.78rem' },
    '&[data-digits="4"]': { fontSize: vars.textMini },
  },
});

export const trainerCount = style({
  fontSize: '2.2cqw',
  selectors: {
    '&[data-digits="3"]': { fontSize: '1.76cqw' },
    '&[data-digits="4"]': { fontSize: '1.408cqw' },
  },
});

export const label = style({
  position: 'relative',
  zIndex: 1,
  padding: '0.08rem 0.34rem 0.12rem',
  marginTop: '-0.18rem',
  color: vars.paper,
  background: vars.navy,
  border: `2px solid ${vars.yellow}`,
  borderRadius: '0.22rem',
  fontSize: vars.textMini,
  fontWeight: 800,
  letterSpacing: '0.04em',
  lineHeight: 1,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
});

export const trainerLabel = style({
  padding: '0.176cqw 0.616cqw',
  marginTop: '-0.44cqw',
  borderWidth: '0.264cqw',
  borderRadius: '0.44cqw',
  fontSize: '1.408cqw',
});
