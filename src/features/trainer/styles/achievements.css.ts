import { vars } from '../../../styles/theme.css.ts';
import { globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalStyle(`${classes.trainerBadgeCaseBadges}`, {
  position: 'relative',
  display: 'grid',
  minHeight: '0',
  padding: '0.9rem 1rem',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, auto)',
  alignContent: 'center',
  background: 'var(--case-inset)',
  border: '0.55rem solid var(--case-metal)',
  boxShadow: `inset 0 0 0 3px ${vars.navy},
    inset 0.35rem 0.35rem 0 ${vars.navyShadow}`,
  gap: '0.55rem',
});

globalStyle(
  `${classes.trainerBadgeCaseRivet},
${classes.trainerTitlesFastener}`,
  {
    position: 'absolute',
    zIndex: '2',
    display: 'block',
    width: '0.55rem',
    aspectRatio: '1',
    background: vars.yellow,
    border: `2px solid ${vars.navy}`,
    borderRadius: '50%',
    boxShadow: `0 0.08rem 0 ${vars.navyShadow}`,
    pointerEvents: 'none',
  },
);

globalStyle(
  `${classes.trainerBadgeCaseRivetTopLeft},
${classes.trainerTitlesFastenerTopLeft}`,
  { top: '0.2rem', left: '0.2rem' },
);

globalStyle(
  `${classes.trainerBadgeCaseRivetTopRight},
${classes.trainerTitlesFastenerTopRight}`,
  { top: '0.2rem', right: '0.2rem' },
);

globalStyle(
  `${classes.trainerBadgeCaseRivetBottomLeft},
${classes.trainerTitlesFastenerBottomLeft}`,
  { bottom: '0.2rem', left: '0.2rem' },
);

globalStyle(
  `${classes.trainerBadgeCaseRivetBottomRight},
${classes.trainerTitlesFastenerBottomRight}`,
  { right: '0.2rem', bottom: '0.2rem' },
);

globalStyle(`[data-tier='1']`, {
  vars: {
    '--tier-metal': vars.metalBronze,
    '--tier-edge': vars.metalBronzeEdge,
    '--tier-light': vars.metalBronzeLight,
  },
});

globalStyle(`[data-tier='2']`, {
  vars: {
    '--tier-metal': vars.metalSilver,
    '--tier-edge': vars.metalSilverEdge,
    '--tier-light': vars.metalSilverLight,
  },
});

globalStyle(`[data-tier='3']`, {
  vars: {
    '--tier-metal': vars.metalGold,
    '--tier-edge': vars.metalGoldEdge,
    '--tier-light': vars.metalGoldLight,
  },
});

globalStyle(`${classes.trainerBadge}`, {
  width: '100%',
  aspectRatio: '1',
  display: 'grid',
  minWidth: '0',
  minHeight: '0',
  padding: '0.25rem',
  appearance: 'none',
  color: vars.paper,
  background: 'var(--case-tile)',
  border: '3px solid var(--case-metal-dark)',
  borderRadius: '0.38rem',
  boxShadow: `inset 0 0 0 2px ${vars.navy},
    0 0.16rem 0 #091f34`,
  cursor: 'pointer',
  placeItems: 'center',
});

globalStyle(`button${classes.trainerBadge}:hover`, {
  background: 'var(--case-tile-hover)',
  borderColor: '#dfe9ea',
});

globalStyle(`${classes.trainerBadge}[data-earned='true']`, {
  background: 'var(--tier-metal)',
  borderColor: 'var(--tier-edge)',
  boxShadow:
    'inset 0.22rem 0.22rem 0 var(--tier-light),\n    inset -0.22rem -0.22rem 0 var(--tier-edge),\n    0 0.16rem 0 #091f34',
});

globalStyle(`${classes.trainerBadge}[data-tier='2']`, { borderWidth: '4px' });

globalStyle(`${classes.trainerBadge}[data-tier='3']`, { borderWidth: '5px' });

globalStyle(`button${classes.trainerBadge}[data-earned='true']:hover`, {
  borderColor: 'var(--tier-light)',
});

globalStyle(`button${classes.trainerBadge}:active`, {
  boxShadow: `inset 0 0 0 2px ${vars.navy}`,
  transform: 'translateY(0.12rem)',
});

globalStyle(
  `button${classes.trainerBadge}:hover ${classes.trainerBadgeMark} img`,
  {
    transform: 'translate(-0.06rem, -0.12rem) scale(1.025)',
    vars: {
      '--trainer-badge-depth': `drop-shadow(0.23rem 0.3rem 0 ${vars.navyShadow})`,
    },
  },
);

globalStyle(
  `button${classes.trainerBadge}:active ${classes.trainerBadgeMark} img`,
  {
    transform: 'translate(0.08rem, 0.1rem) scale(0.99)',
    vars: {
      '--trainer-badge-depth': `drop-shadow(0.05rem 0.1rem 0 ${vars.navyShadow})`,
    },
  },
);

globalStyle(`button${classes.trainerBadge}:focus-visible`, {
  outline: `3px solid ${vars.paper}`,
  outlineOffset: '2px',
});

globalStyle(`${classes.trainerBadgeMark}`, {
  display: 'grid',
  width: '4.4rem',
  aspectRatio: '1',
  placeItems: 'center',
});

globalStyle(`${classes.trainerBadgeMark} img`, {
  display: 'block',
  width: '100%',
  height: '100%',
  filter: 'var(--trainer-badge-tone) var(--trainer-badge-depth)',
  imageRendering: 'pixelated',
  transform: 'translate(-0.03rem, -0.04rem)',
  transition: 'filter 100ms ease,\n    transform 100ms ease',
  vars: {
    '--trainer-badge-tone': 'saturate(1)',
    '--trainer-badge-depth': `drop-shadow(0.16rem 0.22rem 0 ${vars.navyShadow})`,
  },
});

globalStyle(`${classes.trainerBadgeMark}[data-earned='false'] img`, {
  opacity: '0.48',
  vars: { '--trainer-badge-tone': 'brightness(0)' },
});

globalStyle(`${classes.trainerBadgeCaseBadges} ${classes.trainerBadgeMark}`, {
  width: 'min(7.4rem, 88%)',
  maxWidth: '100%',
});

globalStyle(
  `${classes.trainerArtifactFrame}${classes.trainerBadgeCaseCompact}`,
  {
    width: '5.8rem',
    height: '3rem',
    aspectRatio: 'auto',
    borderWidth: '2px',
    borderRadius: '0.3rem',
  },
);

globalStyle(
  `${classes.trainerBadgeCaseCompact} ${classes.trainerBadgeCaseBadges}`,
  {
    padding: '0.12rem',
    borderWidth: '0.15rem',
    gap: '0.1rem',
  },
);

globalStyle(`${classes.trainerBadgeCaseCompact} ${classes.trainerBadge}`, {
  padding: 0,
  borderWidth: '1px',
  borderRadius: '0.12rem',
  boxShadow: `inset 0 0 0 1px ${vars.navy}`,
  cursor: 'inherit',
});

globalStyle(
  `${classes.trainerBadgeCaseCompact} ${classes.trainerBadge}[data-earned='true']`,
  {
    boxShadow: 'inset 0.06rem 0.06rem 0 var(--tier-light)',
  },
);

globalStyle(
  `${classes.trainerBadgeCaseCompact} ${classes.trainerBadgeCaseBadges} ${classes.trainerBadgeMark}`,
  {
    width: '75%',
  },
);

globalStyle(
  `${classes.trainerBadgeCaseCompact} ${classes.trainerBadgeCaseRivet}`,
  {
    display: 'none',
  },
);

globalStyle(
  `${classes.trainerBadgeCaseCompact} ${classes.trainerBadgeMark} img`,
  {
    filter: 'var(--trainer-badge-tone)',
    transform: 'none',
  },
);

globalStyle(`${classes.trainerTitles}`, {
  position: 'relative',
  display: 'grid',
  overflow: 'hidden',
  minWidth: '0',
  padding: '0.65rem',
  color: vars.navy,
  background: 'var(--title-wood)',
  border: `4px solid ${vars.navy}`,
  borderRadius: vars.surfaceRadius,
  boxShadow: `inset 0 0 0 0.25rem var(--title-wood-dark),
    0 0.3rem 0 ${vars.yellow},
    0 0.52rem 0 ${vars.navyShadow}`,
  gap: '0.55rem',
  vars: { '--title-wood': '#bd7438', '--title-wood-dark': '#78411f' },
});

globalStyle(`${classes.trainerTitleCopy} small`, {
  color: vars.muted,
  fontFamily: vars.fontData,
  fontSize: vars.textMini,
  fontWeight: '800',
});

globalStyle(`${classes.trainerTitlesCollection}`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0.55rem',
});

globalStyle(`${classes.trainerTitle}`, {
  display: 'grid',
  minWidth: '0',
  minHeight: '4.75rem',
  padding: '0.55rem 0.65rem',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  alignItems: 'center',
  appearance: 'none',
  color: vars.navy,
  background: vars.paper,
  border: '3px solid var(--title-wood-dark)',
  borderRadius: '0.3rem',
  boxShadow: '0 0.18rem 0 var(--title-wood-dark)',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  gap: '0.55rem',
});

globalStyle(`${classes.trainerTitle}[data-equipped='true']`, {
  background: vars.cream,
});

globalStyle(`${classes.trainerTitle}[data-tier]:not([data-tier='0'])`, {
  borderColor: 'var(--tier-metal)',
  boxShadow:
    'inset 0 0 0 1px var(--tier-edge),\n    0 0.18rem 0 var(--title-wood-dark)',
});

globalStyle(`${classes.trainerTitle}[data-equipped='true']`, {
  boxShadow: `inset 0 0 0 2px ${vars.navy},
    0 0.18rem 0 var(--title-wood-dark)`,
});

globalStyle(`${classes.trainerTitleEquipped}`, {
  width: '1em',
  height: '1em',
  marginInlineStart: '0.3em',
  verticalAlign: '-0.1em',
});

globalStyle(`${classes.trainerTitle}:hover`, {
  background: vars.cream,
  transform: 'translateY(-1px)',
});

globalStyle(`${classes.trainerTitle}:active`, {
  boxShadow: 'none',
  transform: 'translateY(0.15rem)',
});

globalStyle(`${classes.trainerTitle}:focus-visible`, {
  position: 'relative',
  zIndex: '1',
  outline: `3px solid ${vars.focus}`,
  outlineOffset: '-3px',
});

globalStyle(`${classes.trainerTitleMark}`, {
  position: 'relative',
  display: 'grid',
  width: '3.25rem',
  aspectRatio: '1',
  color: vars.paper,
  background: vars.blue,
  border: `3px solid ${vars.navy}`,
  borderRadius: '0.35rem',
  boxShadow: `0 0.18rem 0 ${vars.yellow}`,
  placeItems: 'center',
});

globalStyle(`${classes.trainerTitleMark}[data-earned='true']`, {
  borderColor: 'var(--tier-metal)',
  boxShadow: '0 0.18rem 0 var(--tier-edge)',
});

globalStyle(`${classes.trainerTitleMark} svg`, {
  width: '1.85rem',
  height: '1.85rem',
});

globalStyle(`${classes.trainerTitleMark}[data-earned='false']`, {
  color: 'var(--title-wood-dark)',
  background: vars.cream,
  borderColor: vars.muted,
  boxShadow: 'none',
});

globalStyle(`${classes.trainerTitleCopy}`, {
  display: 'grid',
  minWidth: '0',
  alignContent: 'center',
  gap: '0.25rem',
});

globalStyle(`${classes.trainerTitleCopy} > strong`, {
  fontSize: vars.textLabel,
  lineHeight: '1.05',
});

globalStyle(`${classes.trainerPassportStatus}`, {
  color: vars.muted,
  fontSize: vars.textSmall,
  fontWeight: '700',
  textAlign: 'center',
});

globalStyle(`${classes.trainerProgress}`, { display: 'grid', gap: '0.4rem' });

globalStyle(`${classes.trainerProgressNumbers}`, {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  gap: '0.4rem',
  color: vars.muted,
  fontFamily: vars.fontData,
  fontSize: vars.textSmall,
});

globalStyle(`${classes.trainerProgressNumbers} strong`, {
  color: vars.navy,
});

globalStyle(`${classes.trainerProgressTotal}`, {
  color: vars.navy,
  fontFamily: vars.fontData,
  fontSize: 'clamp(1.75rem, 7vw, 2.5rem)',
  textAlign: 'center',
  overflowWrap: 'anywhere',
});

globalStyle(
  `${classes.trainerBadgeDialogBody} > ${classes.trainerBadgeMark}[data-earned='true']`,
  {
    padding: '0.5rem',
    background: 'var(--case-tile)',
    border: '4px solid var(--tier-metal)',
    borderRadius: '0.38rem',
    boxShadow:
      'inset 2px 2px 0 var(--tier-light),\n    inset -2px -2px 0 var(--tier-edge)',
  },
);

globalStyle(
  `${classes.trainerBadgeDialog},
${classes.trainerTitleDialog}`,
  {
    width: 'min(31rem, calc(100% - 1rem))',
    maxWidth: 'none',
    maxHeight: 'calc(100dvh - 1rem)',
    padding: '0',
    overflow: 'hidden',
    color: vars.ink,
    background: vars.paper,
    border: `3px solid ${vars.navy}`,
    borderRadius: vars.surfaceRadius,
    boxShadow: `0 0.3rem 0 ${vars.yellow},
    0 0.7rem 0 ${vars.navyShadow}`,
  },
);

globalStyle(
  `${classes.trainerBadgeDialog} > header,
${classes.trainerTitleDialog} > header`,
  {
    display: 'flex',
    padding: '0.85rem 1rem',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    background: `var(--trainer-rank-surface, ${vars.cream})`,
    borderBottom: `3px solid ${vars.navy}`,
  },
);

globalStyle(
  `${classes.trainerBadgeDialog} h2,
${classes.trainerTitleDialog} h2`,
  { margin: '0', color: vars.navy, fontSize: vars.textHeadline },
);

globalStyle(
  `${classes.trainerBadgeDialogBody},
${classes.trainerTitleDialogBody}`,
  {
    display: 'grid',
    minWidth: '0',
    minHeight: '0',
    padding: '1.1rem',
    overflowX: 'hidden',
    overflowY: 'auto',
    alignItems: 'center',
    gap: '1.15rem',
  },
);

globalStyle(`${classes.trainerBadgeDialogBody}`, {
  gridTemplateColumns: 'minmax(8rem, 0.8fr) minmax(0, 1.2fr)',
});

globalStyle(`${classes.trainerBadgeDialogBody} > ${classes.trainerBadgeMark}`, {
  width: 'min(10rem, 100%)',
  justifySelf: 'center',
});

globalStyle(`${classes.trainerBadgeDialogDetails}`, {
  display: 'grid',
  minWidth: '0',
  gap: '0.7rem',
});

globalStyle(
  `${classes.trainerBadgeDialogDetails} p,
${classes.trainerTitleDialogDetails} p`,
  { margin: '0', color: vars.muted, fontWeight: '700' },
);

globalStyle(
  `:is(${classes.trainerBadgeDialog}, ${classes.trainerTitleDialog}) progress`,
  {
    width: '100%',
    height: '0.75rem',
    overflow: 'hidden',
    appearance: 'none',
    background: vars.sky,
    border: `2px solid ${vars.navy}`,
    borderRadius: '0',
  },
);

globalStyle(
  `:is(${classes.trainerBadgeDialog}, ${classes.trainerTitleDialog})
  progress::-webkit-progress-bar`,
  { background: vars.sky },
);

globalStyle(
  `:is(${classes.trainerBadgeDialog}, ${classes.trainerTitleDialog})
  progress::-webkit-progress-value`,
  { background: vars.blue },
);

globalStyle(
  `:is(${classes.trainerBadgeDialog}, ${classes.trainerTitleDialog}) progress::-moz-progress-bar`,
  { background: vars.blue },
);

globalStyle(`${classes.trainerTitleDialogBody}`, {
  gridTemplateColumns: '7.5rem minmax(0, 1fr)',
});

globalStyle(`${classes.trainerTitleDialogBody} > ${classes.trainerTitleMark}`, {
  position: 'relative',
  width: '7.5rem',
  justifySelf: 'center',
  borderWidth: '4px',
  borderRadius: '0.55rem',
  boxShadow: `0 0.28rem 0 var(--tier-edge, ${vars.yellow})`,
});

globalStyle(
  `${classes.trainerTitleDialogBody} > ${classes.trainerTitleMark} svg`,
  { width: '4rem', height: '4rem' },
);

globalStyle(`${classes.trainerTitleDialogDetails}`, {
  display: 'grid',
  minWidth: '0',
  gap: '0.65rem',
});

globalStyle(`${classes.trainerTitleDialogDetails} p`, { lineHeight: '1.35' });

globalStyle(`${classes.trainerTitleDialogDetails} .game-button`, {
  width: '100%',
  marginTop: '0.1rem',
});
