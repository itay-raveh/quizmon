import { vars } from '../../../styles/theme.css.ts';
import { globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalStyle(`${classes.spriteFrame}`, {
  display: 'grid',
  width: 'var(--question-stimulus-size)',
  aspectRatio: '1',
  margin: '0',
  overflow: 'hidden',
  background: vars.paper,
  isolation: 'isolate',
  placeItems: 'center',
});

globalStyle(`${classes.sprite}`, {
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  imageRendering: 'pixelated',
  filter: 'drop-shadow(0 0.45rem 0.45rem rgba(8, 59, 126, 0.42))',
});

globalStyle(`${classes.spriteSmooth}`, { imageRendering: 'auto' });

globalStyle(`${classes.spriteOpaqueCanvas}`, {
  mixBlendMode: 'multiply',
  filter: 'none',
});

globalStyle(`${classes.spriteSilhouette}`, {
  filter: 'brightness(0) drop-shadow(0 0.45rem 0.45rem rgba(8, 59, 126, 0.35))',
});

globalStyle(
  `${classes.pixelSprite},
${classes.trophy}`,
  { display: 'block', objectFit: 'contain', imageRendering: 'pixelated' },
);

globalStyle(`${classes.pixelPeek}`, {
  width: 'var(--question-stimulus-size)',
  aspectRatio: '1',
  margin: '0',
  overflow: 'hidden',
  background: vars.cream,
  border: `3px solid ${vars.navy}`,
  borderRadius: '0.55rem',
  boxShadow: `0 0.28rem 0 ${vars.yellow}`,
});

globalStyle(`${classes.pixelPeekImage}`, {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  transform: 'var(--pixel-peek-transform, scale(3))',
  transition: 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
});

globalStyle(`${classes.pixelPeekRevealed} ${classes.pixelPeekImage}`, {
  transform: 'scale(1)',
});

globalStyle(`${classes.clueBoard}`, {
  display: 'grid',
  width: '100%',
  margin: '0',
  padding: '0.5rem 0',
  gap: '0.7rem',
  background: vars.cream,
  borderBlock: `2px solid ${vars.navy}`,
});

globalStyle(`${classes.clueBoard} ol`, {
  display: 'grid',
  padding: '0 0.5rem 0 1.5rem',
  margin: '0',
  gap: '0.35rem',
  lineHeight: '1.4',
  textAlign: 'left',
});

globalStyle(`${classes.clueBoard} li::marker`, {
  color: vars.blue,
  fontWeight: '800',
});

globalStyle(`${classes.clueButton}`, { justifySelf: 'center' });
