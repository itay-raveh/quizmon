import { vars } from '../styles/theme.css.ts';
import { globalStyle } from '@vanilla-extract/css';
import * as classes from '../styles/classes.css.ts';

globalStyle(`.player-name__honor ${classes.trophy}`, {
  display: 'inline-block',
  width: '1em',
  height: '1em',
  marginInlineStart: '0.2em',
  verticalAlign: '-0.15em',
});

globalStyle(`${classes.toast}[popover]`, {
  position: 'fixed',
  inset: 'auto 1rem max(1rem, env(safe-area-inset-bottom))',
  width: 'min(28rem, calc(100% - 2rem))',
  margin: '0 auto',
  padding: '0.65rem 0.75rem 0.65rem 1rem',
  color: vars.paper,
  background: vars.navy,
  border: `2px solid ${vars.paper}`,
  borderRadius: vars.buttonRadius,
  boxShadow: `0 0.35rem 0.8rem ${vars.modalScrim}`,
  fontSize: vars.textControl,
  fontWeight: '700',
});

globalStyle(`${classes.toast}:popover-open`, {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

globalStyle(`${classes.toastMessage}`, {
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
  flex: '1',
});

globalStyle(`${classes.toast} svg`, {
  width: '1.35rem',
  height: '1.35rem',
  flex: 'none',
});

globalStyle(`${classes.toastDismiss}`, {
  display: 'grid',
  width: '2.75rem',
  height: '2.75rem',
  padding: '0',
  color: 'inherit',
  background: 'transparent',
  border: '0',
  borderRadius: '0.25rem',
  cursor: 'pointer',
  flex: 'none',
  placeItems: 'center',
});

globalStyle(
  `${classes.toastDismiss}:hover,
${classes.toastDismiss}:focus-visible`,
  { outline: '2px solid currentColor', outlineOffset: '-2px' },
);

globalStyle(`${classes.appWithNavigation} ${classes.toast}[popover]`, {
  '@media': {
    '(max-width: 50rem)': { bottom: 'var(--app-navigation-clearance)' },
  },
});

globalStyle(`${classes.settingsDialog} ${classes.toast}[popover]`, {
  '@media': {
    '(max-width: 42rem)': {
      bottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
    },
  },
});

globalStyle(`${classes.shareStatus}`, {
  minHeight: '1.25rem',
  margin: '0.65rem 0 0',
  color: vars.muted,
  fontSize: vars.textLabel,
  fontWeight: '700',
});

globalStyle(
  `${classes.settingsDialog},
${classes.confirmDialog},
${classes.shareDialog}`,
  {
    width: 'min(42rem, calc(100% - 1rem))',
    maxWidth: 'none',
    maxHeight: 'min(48rem, calc(100svh - 1rem))',
    padding: '0',
    overflow: 'hidden',
    color: vars.ink,
    background: vars.paper,
    border: `3px solid ${vars.navy}`,
    borderRadius: vars.surfaceRadius,
    overscrollBehavior: 'contain',
    boxShadow: `0 0.3rem 0 ${vars.yellow},
    0 0.7rem 0 ${vars.navyShadow}`,
  },
);

globalStyle(`${classes.shareDialog}`, {
  width: 'min(32rem, calc(100% - 1rem))',
});

globalStyle(`${classes.confirmDialog}`, {
  width: 'min(26rem, calc(100% - 1rem))',
});

globalStyle(
  `${classes.settingsDialog}[open],
${classes.confirmDialog}[open],
${classes.shareDialog}[open],
${classes.trainerBadgeDialog}[open],
${classes.trainerTitleDialog}[open]`,
  {
    display: 'flex',
    flexDirection: 'column',
    animation: 'surface-in 160ms ease-out both',
  },
);

globalStyle(
  `${classes.settingsDialog}::backdrop,
${classes.confirmDialog}::backdrop,
${classes.shareDialog}::backdrop,
${classes.trainerBadgeDialog}::backdrop,
${classes.trainerTitleDialog}::backdrop`,
  { background: vars.modalScrim },
);

globalStyle(
  `${classes.settingsDialogHeader},
${classes.shareDialogHeader}`,
  {
    display: 'flex',
    padding: '1rem 1.15rem 0.85rem',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: vars.cream,
    borderBottom: `2px solid ${vars.navy}`,
  },
);

globalStyle(
  `${classes.settingsDialog} h2,
${classes.shareDialog} h2`,
  {
    margin: '0',
    color: vars.navy,
    fontSize: vars.textHeadline,
    fontWeight: '800',
  },
);

globalStyle(`${classes.confirmDialogBody}`, {
  display: 'grid',
  padding: '1.25rem',
  gap: '0.8rem',
  textAlign: 'center',
});

globalStyle(
  `${classes.confirmDialog} h2,
${classes.confirmDialog} p`,
  { margin: '0' },
);

globalStyle(`${classes.confirmDialog} h2`, {
  color: vars.navy,
  fontSize: vars.textHeadline,
});

globalStyle(`${classes.confirmDialog} p`, {
  color: vars.muted,
  fontWeight: '700',
});

globalStyle(`${classes.confirmDialogActions}`, {
  display: 'grid',
  marginTop: '0.35rem',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0.7rem',
});

globalStyle(`${classes.confirmDialogConfirm}.game-button`, {
  color: 'white',
  background: vars.wrong,
});

globalStyle(`${classes.settingsNote}`, {
  padding: '0.55rem 0.7rem',
  margin: '0 0 1rem',
  color: vars.navy,
  background: vars.cream,
  borderLeft: `0.3rem solid ${vars.yellow}`,
  fontSize: vars.textLabel,
  fontWeight: '700',
});

globalStyle(`${classes.shareDialogBody}`, {
  display: 'grid',
  padding: '1.1rem 1.2rem 1.2rem',
  gap: '1rem',
});

globalStyle(`${classes.shareDialogBody} > p`, {
  margin: '0',
  color: vars.muted,
  fontWeight: '700',
});

globalStyle(`${classes.shareTargets}`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
  gap: '0.7rem',
});

globalStyle(`${classes.shareTarget}`, {
  display: 'flex',
  minHeight: '3rem',
  padding: '0.5rem 0.65rem',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: '0.45rem',
  color: vars.navy,
  background: vars.paper,
  border: `2px solid ${vars.navy}`,
  borderRadius: vars.buttonRadius,
  boxShadow: `0 0.16rem 0 ${vars.yellow},
    0 0.24rem 0 ${vars.navyShadow}`,
  font: 'inherit',
  fontWeight: '700',
  cursor: 'pointer',
  transition:
    'transform 100ms ease,\n    box-shadow 100ms ease,\n    filter 100ms ease',
  gridColumn: 'span 2',
});

globalStyle(`${classes.shareTarget}:nth-last-child(-n + 2)`, {
  gridColumn: 'span 3',
});

globalStyle(`${classes.shareTarget}:hover`, {
  filter: 'brightness(1.03)',
  transform: 'translateY(-1px)',
});

globalStyle(`${classes.shareTarget}:active`, {
  boxShadow: `0 0.08rem 0 ${vars.navyShadow}`,
  transform: 'translateY(0.16rem)',
});

globalStyle(`${classes.shareCopy}`, { width: '100%' });

globalStyle(`${classes.shareDialog} ${classes.shareStatus}`, {
  margin: '-0.35rem 0 0',
  textAlign: 'center',
});

globalStyle(`${classes.dialogClose}`, {
  display: 'grid',
  width: '2.75rem',
  minWidth: '2.75rem',
  height: '2.75rem',
  padding: '0',
  color: vars.primaryText,
  background: vars.blue,
  border: `2px solid ${vars.navy}`,
  borderRadius: vars.iconControlRadius,
  boxShadow: `0 0.15rem 0 ${vars.yellow}`,
  cursor: 'pointer',
  flex: 'none',
  placeItems: 'center',
});

globalStyle(`${classes.dialogClose}:hover`, { filter: 'brightness(1.08)' });

globalStyle(`${classes.dialogClose} svg`, {
  width: '1.25rem',
  height: '1.25rem',
});
