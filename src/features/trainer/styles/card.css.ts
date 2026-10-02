import { vars } from '../../../styles/theme.css.ts';
import { globalKeyframes, globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalKeyframes('trainer-sheen-bronze', {
  '27.2727%,\n  100%': { backgroundPositionX: '111.1111%' },
});

globalKeyframes('trainer-sheen-visible-bronze', {
  '0%,\n  27.26%': { opacity: 'var(--trainer-sheen-opacity)' },
  '27.2727%,\n  100%': { opacity: '0' },
});

globalKeyframes('trainer-sheen-silver', {
  '25.4658%,\n  100%': { backgroundPositionX: '111.1111%' },
});

globalKeyframes('trainer-sheen-visible-silver', {
  '0%,\n  25.45%': { opacity: 'var(--trainer-sheen-opacity)' },
  '25.4658%,\n  100%': { opacity: '0' },
});

globalKeyframes('trainer-sheen-gold', {
  '24.0506%,\n  100%': { backgroundPositionX: '111.1111%' },
});

globalKeyframes('trainer-sheen-visible-gold', {
  '0%,\n  24.04%': { opacity: 'var(--trainer-sheen-opacity)' },
  '24.0506%,\n  100%': { opacity: '0' },
});

globalStyle(`.app--trainer main`, {
  alignItems: 'start',
  containerType: 'inline-size',
});

globalStyle(`.trainer-passport`, {
  display: 'grid',
  containerType: 'inline-size',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: '1.1rem',
  vars: {
    '--trainer-rank-accent': vars.blue,
    '--trainer-rank-accent-strong': vars.navy,
    '--trainer-rank-ink': vars.paper,
    '--trainer-rank-surface': vars.cream,
  },
});

globalStyle(`${classes.trainerPassportHeader}`, {
  justifyContent: 'space-between',
});

globalStyle(`${classes.trainerPassportViews}`, {
  display: 'grid',
  overflow: 'hidden',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  background: vars.navy,
  border: `3px solid ${vars.navy}`,
  borderRadius: vars.buttonRadius,
  boxShadow: `0 0.2rem 0 ${vars.yellow},
    0 0.42rem 0 ${vars.navyShadow}`,
  gap: '2px',
});

globalStyle(`${classes.trainerPassportView}`, {
  display: 'inline-flex',
  minWidth: '0',
  minHeight: '2.8rem',
  padding: '0.45rem 0.6rem',
  alignItems: 'center',
  justifyContent: 'center',
  color: vars.navy,
  background: vars.paper,
  border: '0',
  font: 'inherit',
  fontSize: vars.textLabel,
  fontWeight: '900',
  lineHeight: '1.1',
  overflowWrap: 'anywhere',
  textAlign: 'center',
  textDecoration: 'none',
  cursor: 'pointer',
  gap: '0.35rem',
});

globalStyle(`${classes.trainerPassportView} svg`, {
  width: '1.1rem',
  height: '1.1rem',
  flex: 'none',
});

globalStyle(
  `${classes.trainerPassportView}[aria-current='page'],
${classes.trainerPassportView}[aria-pressed='true']`,
  { color: vars.paper, background: vars.blue },
);

globalStyle(`${classes.trainerPassportView}:disabled`, { cursor: 'wait' });

globalStyle(`${classes.trainerPassportView}:focus-visible`, {
  position: 'relative',
  zIndex: '1',
  outline: `3px solid ${vars.navy}`,
  outlineOffset: '-3px',
});

globalStyle(
  `${classes.trainerPassportView}[aria-current='page']:focus-visible,
${classes.trainerPassportView}[aria-pressed='true']:focus-visible`,
  { outlineColor: vars.paper },
);

globalStyle(`${classes.trainerPassportArtifact}`, { minWidth: '0' });

globalStyle(`${classes.trainerArtifactFrame}`, {
  position: 'relative',
  display: 'grid',
  width: '100%',
  minHeight: '0',
  aspectRatio: '7 / 4',
  containerType: 'inline-size',
  overflow: 'hidden',
  gridTemplateColumns: 'minmax(0, 1fr)',
  background: 'var(--trainer-frame-surface)',
  border: '3px solid var(--trainer-frame-border)',
  borderRadius: vars.surfaceRadius,
  boxShadow: 'inset 0 0 0 2px var(--trainer-frame-highlight)',
  isolation: 'isolate',
  vars: {
    '--trainer-frame-border': vars.navy,
    '--trainer-frame-surface': vars.paper,
    '--trainer-frame-highlight': vars.paper,
  },
});

globalStyle(`${classes.trainerCard}`, {
  gridTemplateRows: 'minmax(0, 1fr) auto',
  textAlign: 'left',
  vars: {
    '--trainer-rank-accent': vars.blue,
    '--trainer-rank-accent-strong': vars.navy,
    '--trainer-rank-ink': vars.paper,
    '--trainer-rank-surface': `color-mix(in srgb, ${vars.blue} 12%, ${vars.paper})`,
    '--trainer-frame-border': 'var(--trainer-rank-accent-strong)',
    '--trainer-frame-surface': 'var(--trainer-rank-surface)',
  },
});

globalStyle(`${classes.trainerBadgeCase}`, {
  gridTemplateRows: 'minmax(0, 1fr)',
  color: vars.navy,
  vars: {
    '--case-metal': '#c7d7dc',
    '--case-metal-dark': '#607b87',
    '--case-inset': '#173a54',
    '--case-tile': '#254d67',
    '--case-tile-hover': '#2c5976',
    '--trainer-frame-surface': 'var(--case-metal)',
    '--trainer-frame-highlight': '#e8f0f1',
  },
});

globalStyle(
  `${classes.trainerPassportBronze},
${classes.trainerCardBronze}`,
  {
    vars: {
      '--trainer-rank-accent': vars.metalBronze,
      '--trainer-rank-accent-strong': vars.metalBronzeEdge,
      '--trainer-rank-ink': vars.navy,
      '--trainer-rank-surface': vars.metalBronzeLight,
      '--trainer-sheen-opacity': '0.2',
    },
  },
);

globalStyle(
  `${classes.trainerPassportSilver},
${classes.trainerCardSilver}`,
  {
    vars: {
      '--trainer-rank-accent': vars.metalSilver,
      '--trainer-rank-accent-strong': vars.metalSilverEdge,
      '--trainer-rank-ink': vars.navy,
      '--trainer-rank-surface': vars.metalSilverLight,
      '--trainer-sheen-opacity': '0.38',
    },
  },
);

globalStyle(
  `${classes.trainerPassportGold},
${classes.trainerCardGold}`,
  {
    vars: {
      '--trainer-rank-accent': vars.metalGold,
      '--trainer-rank-accent-strong': vars.metalGoldEdge,
      '--trainer-rank-ink': vars.navy,
      '--trainer-rank-surface': vars.metalGoldLight,
      '--trainer-sheen-opacity': '0.56',
    },
  },
);

globalStyle(`${classes.trainerCardFinishEffects}`, {
  position: 'absolute',
  zIndex: '4',
  inset: '0',
  overflow: 'hidden',
  pointerEvents: 'none',
});

globalStyle(`${classes.trainerCardSheen}`, {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '100%',
  aspectRatio: '100 / 128',
  transform: 'translate(-50%, -50%) rotate(90deg)',
  opacity: '0',
  background:
    "url('../../../assets/images/trainer-card/sheen-atlas.png') 0 0 /\n    1000% 100% no-repeat",
  imageRendering: 'pixelated',
  mixBlendMode: 'screen',
});

globalStyle(
  `${classes.trainerCardFinishEffects}${classes.isStatic} ${classes.trainerCardSheen}`,
  { backgroundPositionX: '55.5556%', opacity: 'var(--trainer-sheen-opacity)' },
);

globalStyle(`${classes.trainerCardBronze}`, {
  vars: {
    '--trainer-sheen-frames': 'trainer-sheen-bronze',
    '--trainer-sheen-visibility': 'trainer-sheen-visible-bronze',
    '--trainer-sheen-loop': '3300ms',
    '--trainer-sheen-delay': '150ms',
  },
});

globalStyle(`${classes.trainerCardSilver}`, {
  vars: {
    '--trainer-sheen-frames': 'trainer-sheen-silver',
    '--trainer-sheen-visibility': 'trainer-sheen-visible-silver',
    '--trainer-sheen-loop': '3220ms',
    '--trainer-sheen-delay': '430ms',
  },
});

globalStyle(`${classes.trainerCardGold}`, {
  vars: {
    '--trainer-sheen-frames': 'trainer-sheen-gold',
    '--trainer-sheen-visibility': 'trainer-sheen-visible-gold',
    '--trainer-sheen-loop': '3160ms',
    '--trainer-sheen-delay': '710ms',
  },
});

globalStyle(
  `${classes.trainerCardFinishEffects}${classes.isMotionActive} ${classes.trainerCardSheen}`,
  {
    animationName:
      'var(--trainer-sheen-frames), var(--trainer-sheen-visibility)',
    animationDuration: 'var(--trainer-sheen-loop)',
    animationTimingFunction: 'steps(10, end), linear',
    animationDelay: 'var(--trainer-sheen-delay)',
    animationIterationCount: 'infinite',
  },
);

globalStyle(`${classes.trainerCardChampion}`, {
  borderColor: vars.metalGoldEdge,
  boxShadow: `inset 0 0 0 2px ${vars.metalGoldLight},
    inset 0 0 0 5px ${vars.metalGold}`,
  background: `linear-gradient(
    120deg,
    ${vars.metalGoldLight} 0%,
    #ffe27a 46%,
    ${vars.metalGold} 77%,
    ${vars.metalGoldLight} 100%
  )`,
});

globalStyle(`${classes.trainerCardChampion} ${classes.trainerCardWatermark}`, {
  borderColor: vars.metalGoldEdge,
  background: vars.metalGold,
});

globalStyle(`${classes.trainerCardPolish}`, {
  position: 'absolute',
  inset: '0',
  overflow: 'hidden',
  borderRadius: 'inherit',
});

globalStyle(
  `${classes.trainerCardPolish}::before,
${classes.trainerCardPolish}::after`,
  { content: "''", position: 'absolute', inset: '0' },
);

globalStyle(`${classes.trainerCardPolish}::before`, {
  background:
    'linear-gradient(\n    125deg,\n    transparent 34%,\n    #fff4bb14 41%,\n    #fffbed66 48%,\n    #fffefacc 50%,\n    #fffbed88 52%,\n    #fff4bb14 59%,\n    transparent 66%\n  )',
  transform: 'translateX(-4%)',
});

globalStyle(`${classes.trainerCardPolish}::after`, {
  inset: '3px',
  border: '2px solid transparent',
  borderImage:
    'linear-gradient(\n      125deg,\n      #fffbe2,\n      #bc811d 20%,\n      #fffce6 38%,\n      #efc564 62%,\n      #fffbe2 75%,\n      #ad7112\n    )\n    1',
  opacity: '0.95',
});

globalStyle(
  `${classes.trainerCardFinishEffects}${classes.isMotionActive} ${classes.trainerCardPolish}::before`,
  { animation: 'trainer-card-polish 4.8s linear infinite' },
);

globalStyle(`${classes.trainerCardDecoration}`, {
  position: 'absolute',
  zIndex: '0',
  inset: '0',
  overflow: 'hidden',
  pointerEvents: 'none',
});

globalStyle(`${classes.trainerCardWatermark}`, {
  position: 'absolute',
  top: '-10cqw',
  right: '-10cqw',
  width: '45cqw',
  aspectRatio: '1',
  color:
    'color-mix(\n    in srgb,\n    var(--trainer-rank-accent) 65%,\n    var(--trainer-rank-surface)\n  )',
  border: '5cqw solid currentColor',
  borderRadius: '50%',
  pointerEvents: 'none',
});

globalStyle(`${classes.trainerCardWatermark}::after`, {
  position: 'absolute',
  top: '15cqw',
  left: '-5cqw',
  width: '45cqw',
  height: '4cqw',
  background: 'currentColor',
  content: "''",
});

globalStyle(`${classes.trainerCardFront}`, {
  display: 'grid',
  minWidth: '0',
  minHeight: '0',
  padding: '5cqw 5cqw 2cqw 6cqw',
  gridTemplateAreas: "'rank avatar' 'identity avatar'",
  gridTemplateColumns: 'minmax(0, 1fr) 33%',
  gridTemplateRows: 'auto minmax(0, 1fr)',
  alignItems: 'center',
  gap: '2cqw 4cqw',
});

globalStyle(`${classes.trainerCardRank}`, {
  position: 'relative',
  zIndex: '5',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5em',
  gridArea: 'rank',
  color: vars.navy,
  fontFamily: vars.fontData,
  fontSize: 'clamp(0.65rem, 3cqw, 1.125rem)',
  fontWeight: '600',
  lineHeight: '1.25',
  textTransform: 'uppercase',
});

globalStyle(`${classes.trainerCardChampion} ${classes.trainerCardRank}`, {
  width: 'fit-content',
  paddingBottom: '0.5cqw',
  borderBottom: '1px solid var(--trainer-rank-accent-strong)',
  gap: '0.35em',
});

globalStyle(`${classes.trainerCardRank} ${classes.trophy}`, {
  width: 'clamp(1.5rem, 2em, 2rem)',
  height: 'auto',
  flex: 'none',
});

globalStyle(`${classes.trainerCardIdentity}`, {
  position: 'relative',
  zIndex: '5',
  display: 'grid',
  minWidth: '0',
  gridArea: 'identity',
  alignContent: 'center',
  paddingBottom: '3cqw',
  gap: '1.5cqw',
});

globalStyle(`${classes.trainerCardIdentity} h2`, {
  margin: '0',
  overflowWrap: 'anywhere',
  color: vars.navy,
  fontFamily: vars.fontInterface,
  fontSize: 'clamp(1.1rem, 6cqw, 2.4rem)',
  fontWeight: '800',
  lineHeight: '1.1',
});

globalStyle(`${classes.trainerCardTitle}`, {
  display: 'flex',
  margin: '0',
  alignItems: 'center',
  color: vars.navy,
  fontSize: 'clamp(0.65rem, 3.5cqw, 1.3rem)',
  fontWeight: '700',
  lineHeight: '1.3',
  gap: '1cqw',
});

globalStyle(`${classes.trainerTitleMarkTier}`, {
  position: 'absolute',
  right: '-0.35rem',
  bottom: '-0.3rem',
  padding: '0.05rem 0.2rem',
  color: vars.navy,
  background: 'var(--tier-metal)',
  border: `1px solid ${vars.navy}`,
  font: `850 0.65rem / 1 ${vars.fontData}`,
});

globalStyle(`${classes.trainerCardTitle} > svg`, {
  width: '1em',
  height: '1em',
  flex: 'none',
});

globalStyle(`${classes.trainerCardDetails}`, {
  position: 'relative',
  display: 'flex',
  minWidth: '0',
  minHeight: '12cqw',
  padding: '1.5cqw 5cqw 1.5cqw 6cqw',
  alignItems: 'center',
  color: 'var(--trainer-rank-ink)',
  background: 'var(--trainer-rank-accent)',
  borderTop: '1px solid var(--trainer-rank-accent-strong)',
  gap: '4cqw',
});

globalStyle(`${classes.trainerCardRecord}`, {
  position: 'relative',
  zIndex: '5',
  minWidth: '0',
  margin: '0',
  flex: '1',
});

globalStyle(`${classes.trainerCardRecord} > div`, {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '2cqw',
});

globalStyle(`${classes.trainerCardRecord} dt`, {
  fontSize: 'clamp(0.6rem, 3.2cqw, 1.15rem)',
  fontWeight: '600',
  lineHeight: '1.2',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
});

globalStyle(`${classes.trainerCardRecord} dd`, {
  margin: '0',
  fontFamily: vars.fontData,
  fontSize: 'clamp(0.65rem, 3.4cqw, 1.3rem)',
  fontWeight: '600',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});

globalStyle(`${classes.trainerCardRecord} small`, {
  fontSize: '0.82em',
  fontWeight: '400',
});

globalStyle(`${classes.trainerCardAvatar}`, {
  display: 'grid',
  minWidth: '0',
  minHeight: '0',
  height: '100%',
  gridArea: 'avatar',
  gridTemplateRows: 'minmax(0, 1fr) auto',
  justifyItems: 'center',
  gap: '1cqw',
});

globalStyle(`${classes.trainerCardPortrait}`, {
  position: 'relative',
  zIndex: '1',
  display: 'grid',
  width: 'auto',
  height: '100%',
  maxWidth: '100%',
  maxHeight: '29cqw',
  aspectRatio: '1',
  placeItems: 'center',
});

globalStyle(`${classes.trainerCardPortraitImage}`, {
  position: 'relative',
  zIndex: '2',
});

globalStyle(
  `${classes.trainerCardPortraitImage},
${classes.trainerPokedexPortrait} img`,
  {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    imageRendering: 'pixelated',
  },
);

globalStyle(`${classes.trainerCardPartnerSprite}`, {
  position: 'absolute',
  zIndex: '3',
  maxWidth: 'none',
  objectFit: 'contain',
  imageRendering: 'pixelated',
});

globalStyle(`${classes.trainerCardPartnerSpriteBehind}`, { zIndex: '1' });

globalStyle(`${classes.trainerCardPartnerCaption}`, {
  position: 'relative',
  zIndex: '5',
  display: 'grid',
  maxWidth: '100%',
  textAlign: 'center',
});

globalStyle(
  `${classes.trainerCardPartnerCaption} ${classes.pokemonIdentityNumber}`,
  {
    fontFamily: vars.fontData,
    fontSize: 'clamp(0.6rem, 2.8cqw, 1.1rem)',
    fontWeight: '500',
  },
);

globalStyle(
  `${classes.trainerCardPartnerCaption} ${classes.pokemonIdentityName}`,
  {
    maxWidth: '100%',
    fontSize: 'clamp(0.65rem, 3.6cqw, 1.3rem)',
    fontWeight: '800',
    lineHeight: '1.2',
    overflowWrap: 'anywhere',
    whiteSpace: 'normal',
  },
);

globalStyle(`${classes.trainerCardAvatarMark}`, {
  color: vars.navy,
  fontFamily: vars.fontInterface,
  fontSize: '16cqw',
  fontWeight: '800',
});
