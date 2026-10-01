import { vars } from '../../styles/theme.css.ts';
import { globalKeyframes, globalStyle } from '@vanilla-extract/css';
import * as classes from '../../styles/classes.css.ts';

globalKeyframes('leaderboard-pulse', { to: { opacity: '0.45' } });

globalStyle(`${classes.socialScreen}`, { textAlign: 'left' });

globalStyle(
  `${classes.socialScreenIntro},
${classes.friendsAdd}`,
  { display: 'grid', gap: '1rem' },
);

globalStyle(
  `${classes.socialScreenIntro} h2,
${classes.socialScreenIntro} p,
${classes.friendsAdd} h2,
${classes.friendsAdd} h3`,
  { margin: '0' },
);

globalStyle(`${classes.socialScreenIntro} > .game-button`, {
  justifySelf: 'start',
});

globalStyle(`${classes.socialScreenNote}`, {
  color: vars.muted,
  fontSize: vars.textSmall,
});

globalStyle(`${classes.friendsPlayerName}`, {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

globalStyle(`${classes.friendsIconButton}.game-button`, {
  display: 'inline-grid',
  flex: 'none',
  width: '2.75rem',
  minWidth: '2.75rem',
  minHeight: '2.75rem',
  padding: '0.55rem',
  placeItems: 'center',
  background: 'transparent',
  border: '1px solid transparent',
  boxShadow: 'none',
});

globalStyle(`${classes.friendsIconButton}.game-button:not(button)`, {
  cursor: 'default',
});

globalStyle(
  `button${classes.friendsIconButton}.game-button:hover:not(:disabled)`,
  {
    background: vars.cream,
    transform: 'none',
  },
);

globalStyle(
  `button${classes.friendsIconButton}.game-button:active:not(:disabled)`,
  {
    background: vars.sky,
    boxShadow: 'none',
    transform: 'none',
  },
);

globalStyle(`${classes.friendsIconButton}.game-button:focus-visible`, {
  outline: `3px solid ${vars.blue}`,
  outlineOffset: '2px',
});

globalStyle(`${classes.friendsIconButton} svg`, {
  width: '1.3rem',
  height: '1.3rem',
});

globalStyle(`${classes.friendsActions} ${classes.friendsIconButton}`, {
  color: vars.errorInk,
});

globalStyle(`${classes.leaderboardPlayer}`, {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
});

globalStyle(`${classes.leaderboardViewer}`, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  padding: '0.35rem 0.7rem',
  color: vars.navy,
  background: vars.yellow,
  border: `2px solid ${vars.navy}`,
  borderRadius: vars.buttonRadius,
});

globalStyle(`${classes.leaderboardViewer} strong`, {
  fontFamily: vars.fontData,
});

globalStyle(`${classes.leaderboardViewer} span`, {
  minWidth: '0',
  overflowWrap: 'anywhere',
  fontWeight: '800',
});

globalStyle(`${classes.leaderboardHeader}`, {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
});

globalStyle(`${classes.socialErrorBanner}`, {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: '0.15rem 0.65rem',
  padding: '0.55rem 0.75rem',
  color: vars.errorInk,
  background: vars.errorSurface,
  border: `1px solid ${vars.errorInk}`,
  borderRadius: vars.buttonRadius,
  fontSize: vars.textStatus,
});

globalStyle(`${classes.socialErrorBanner} .game-button`, {
  gridColumn: '2',
  gridRow: '1 / 3',
  margin: '0',
});

globalStyle(`${classes.socialErrorBanner} ${classes.friendsField}`, {
  gridColumn: '1 / -1',
});

globalStyle(`${classes.friendsPanel}`, {
  alignContent: 'start',
  display: 'grid',
  gap: '0.75rem',
});

globalStyle(
  `${classes.friendsPanel} p,
${classes.friendsPanel} h2,
${classes.friendsPanel} h3`,
  { margin: '0' },
);

globalStyle(`${classes.friendsPanelHeading}`, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  paddingBottom: '0.8rem',
  borderBottom: `1px solid ${vars.navy}`,
});

globalStyle(`${classes.friendsPanelHeading} h2`, {
  fontSize: vars.textHeadline,
  lineHeight: '1.15',
});

globalStyle(`${classes.friendsPanelHeading} .game-button`, {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  width: 'auto',
});

globalStyle(`${classes.friendsPanelHeading} svg`, {
  width: '1.3rem',
  height: '1.3rem',
});

globalStyle(`${classes.friendsPlayerCode}`, {
  color: vars.muted,
  fontFamily: vars.fontData,
  fontSize: vars.textMini,
  overflowWrap: 'anywhere',
});

globalStyle(`${classes.friendsFound}`, {
  display: 'grid',
  justifyItems: 'start',
  gap: '0.55rem',
  width: '100%',
  padding: '0.85rem 0.9rem',
  borderBlock: `1px solid ${vars.navy}`,
});

globalStyle(`${classes.friendsFound} ${classes.friendsPlayer} strong`, {
  fontSize: vars.textBody,
});

globalStyle(`${classes.friendsFound} > p`, { color: vars.muted });

globalStyle(
  `${classes.friendsFound} ${classes.friendsActions} .game-button:not(${classes.friendsIconButton})`,
  {
    minHeight: '2.5rem',
    padding: '0.45rem 0.7rem',
    fontSize: vars.textLabel,
  },
);

globalStyle(`${classes.friendsPanel} .react-loading-skeleton`, {
  vars: {
    '--base-color': vars.disabledSurface,
    '--highlight-color': vars.paper,
  },
});

globalStyle(`${classes.friendsSection}`, { display: 'grid', gap: '0.55rem' });

globalStyle(`${classes.friendsSection} + ${classes.friendsSection}`, {
  paddingTop: '1rem',
  borderTop: `1px solid ${vars.navy}`,
});

globalStyle(`${classes.friendsEmpty}`, { color: vars.muted });

globalStyle(`${classes.friendsPlayer}`, {
  display: 'grid',
  gap: '0.25rem',
  overflowWrap: 'anywhere',
});

globalStyle(`${classes.friendsActions}`, {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginTop: '0.2rem',
});

globalStyle(`${classes.friendsList}`, {
  listStyle: 'none',
  padding: '0',
  margin: '0',
});

globalStyle(`${classes.friendsList} li`, {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
  paddingBlock: '0.75rem',
  borderTop: `1px solid ${vars.navy}`,
});

globalStyle(`${classes.friendsList} li ${classes.friendsActions}`, {
  marginTop: '0',
});

globalStyle(`${classes.leaderboardToolbar}`, {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: '0.5rem 1rem',
});

globalStyle(`${classes.leaderboardModes}`, {
  display: 'flex',
  width: 'max-content',
  maxWidth: '100%',
  padding: '2px',
  background: vars.navy,
  borderRadius: vars.buttonRadius,
});

globalStyle(`${classes.leaderboardModes} button`, {
  flex: '1',
  minWidth: '7rem',
  minHeight: '2.5rem',
  padding: '0.35rem 0.75rem',
  color: vars.navy,
  background: vars.paper,
  border: '0',
  borderRadius: vars.iconControlRadius,
  font: 'inherit',
  fontWeight: '700',
  cursor: 'pointer',
});

globalStyle(`${classes.leaderboardModes} button + button`, {
  marginLeft: '2px',
});

globalStyle(`${classes.leaderboardModes} button[aria-pressed='true']`, {
  color: vars.primaryText,
  background: vars.blue,
  fontWeight: '800',
});

globalStyle(`${classes.leaderboardFilter}`, {
  display: 'grid',
  gap: '0.35rem',
  color: vars.muted,
  fontSize: vars.textLabel,
  fontWeight: '700',
});

globalStyle(`${classes.leaderboardScopes}`, {
  display: 'flex',
  width: 'max-content',
  gap: '0.75rem',
});

globalStyle(`${classes.leaderboardScopes} button`, {
  minHeight: '2.75rem',
  padding: '0.4rem 0.2rem',
  color: vars.muted,
  background: 'none',
  border: '0',
  borderBottom: '2px solid transparent',
  font: 'inherit',
  fontSize: vars.textLabel,
  fontWeight: '700',
  cursor: 'pointer',
});

globalStyle(`${classes.leaderboardScopes} button[aria-pressed='true']`, {
  color: vars.blue,
  borderBottomColor: vars.blue,
  fontWeight: '800',
});

globalStyle(
  `${classes.leaderboardModes} button:hover:not([aria-pressed='true']),
${classes.leaderboardScopes} button:hover:not([aria-pressed='true'])`,
  { color: vars.blue },
);

globalStyle(
  `${classes.leaderboardModes} button:focus-visible,
${classes.leaderboardScopes} button:focus-visible,
${classes.leaderboardDate} input:focus-visible`,
  { outline: `3px solid ${vars.blue}`, outlineOffset: '2px' },
);

globalStyle(`${classes.leaderboardDate}`, {
  display: 'grid',
  gridTemplateColumns: '2.75rem minmax(0, 1fr) 2.75rem',
  alignItems: 'center',
  gap: '0.35rem',
  minWidth: '0',
  overflowWrap: 'anywhere',
  gridColumn: '1 / -1',
  width: '100%',
});

globalStyle(`${classes.leaderboardDate} .game-button`, {
  display: 'grid',
  minWidth: '2.75rem',
  minHeight: '2.75rem',
  padding: '0.35rem',
  placeItems: 'center',
});

globalStyle(
  `${classes.leaderboardDate} svg,
${classes.leaderboardInvite} svg`,
  { width: '1.3rem', height: '1.3rem' },
);

globalStyle(`${classes.leaderboardInvite}`, {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.5rem',
});

globalStyle(`${classes.leaderboardHeader} ${classes.leaderboardInvite}`, {
  justifyContent: 'flex-end',
});

globalStyle(`${classes.leaderboardInvite} .game-button`, {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  width: 'auto',
});

globalStyle(`${classes.leaderboardInvite} p`, {
  margin: '0',
  fontSize: vars.textSmall,
});

globalStyle(`${classes.leaderboardInvite} ${classes.friendsField}`, {
  flexBasis: '100%',
  minWidth: '0',
  maxWidth: '100%',
});

globalStyle(`${classes.leaderboardDate} input`, {
  width: '100%',
  minWidth: '0',
  minHeight: '2.75rem',
  padding: '0.4rem 0.6rem',
  border: `1px solid ${vars.navy}`,
  borderRadius: vars.iconControlRadius,
  background: vars.paper,
  color: vars.ink,
  font: 'inherit',
  fontSize: vars.textLabel,
});

globalStyle(`${classes.leaderboardToolbar}`, {
  '@container': {
    'app-shell (max-width: 36rem)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
      gap: '0.6rem',
    },
  },
});

globalStyle(
  `${classes.leaderboardModes},
  ${classes.leaderboardScopes}`,
  { '@container': { 'app-shell (max-width: 36rem)': { width: '100%' } } },
);

globalStyle(`${classes.leaderboardModes} button`, {
  '@container': { 'app-shell (max-width: 36rem)': { minWidth: '0' } },
});

globalStyle(`${classes.leaderboardScopes}`, {
  '@container': {
    'app-shell (max-width: 36rem)': {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
  },
});

globalStyle(`${classes.socialErrorBanner}`, {
  '@container': {
    'app-shell (max-width: 36rem)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
});

globalStyle(`${classes.socialErrorBanner} .game-button`, {
  '@container': {
    'app-shell (max-width: 36rem)': {
      gridColumn: '1',
      gridRow: 'auto',
      justifySelf: 'start',
    },
  },
});

globalStyle(`${classes.leaderboardDate} input`, {
  '@container': {
    'app-shell (max-width: 22.5rem)': {
      paddingInline: '0.25rem',
      fontSize: vars.textSmall,
    },
  },
});

globalStyle(`${classes.leaderboardTable} th[scope='row']`, {
  overflowWrap: 'anywhere',
});

globalStyle(
  `${classes.leaderboardControls} .game-button,
${classes.leaderboardStandings} .game-button`,
  { width: 'auto' },
);

globalStyle(`${classes.leaderboardStandings}`, {
  display: 'grid',
  alignContent: 'start',
  gap: '0.75rem',
});

globalStyle(`${classes.leaderboardSwipe}`, {
  display: 'flex',
  gap: '0.75rem',
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollSnapType: 'x mandatory',
  scrollBehavior: 'smooth',
  scrollbarWidth: 'none',
});

globalStyle(`${classes.leaderboardSwipe}::-webkit-scrollbar`, {
  display: 'none',
});

globalStyle(`${classes.leaderboardSwipe} > ${classes.leaderboardStandings}`, {
  flex: '0 0 100%',
  minWidth: '0',
  scrollSnapAlign: 'start',
});

globalStyle(`${classes.socialSkeleton}`, {
  display: 'block',
  height: '0.85em',
  background: vars.cream,
  borderRadius: '0.25rem',
  animation: 'leaderboard-pulse 1.2s ease-in-out infinite alternate',
});

globalStyle(`${classes.leaderboardSwipe}`, {
  '@media': { '(prefers-reduced-motion: reduce)': { scrollBehavior: 'auto' } },
});

globalStyle(`${classes.socialSkeleton}`, {
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
});

globalStyle(`${classes.leaderboardEmpty}`, {
  display: 'grid',
  gap: '0.4rem',
  justifyItems: 'center',
  padding: '1.25rem 1rem',
  color: vars.navy,
  background: vars.sky,
  border: `2px solid ${vars.navy}`,
  borderRadius: vars.buttonRadius,
  textAlign: 'center',
});

globalStyle(`${classes.leaderboardEmpty} p`, { margin: '0' });

globalStyle(`${classes.leaderboardEmptyAction}.game-button`, {
  display: 'inline-flex',
  width: 'auto',
  alignItems: 'center',
  marginTop: '0.25rem',
  textDecoration: 'none',
});

globalStyle(`${classes.leaderboardTable}`, {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: vars.textStatus,
});

globalStyle(`${classes.leaderboardTable} thead`, {
  color: vars.navy,
  background: vars.sky,
});

globalStyle(
  `${classes.leaderboardTable} th:first-child,
${classes.leaderboardTable} td:first-child`,
  { paddingLeft: '0.7rem' },
);

globalStyle(
  `${classes.leaderboardTable} th:last-child,
${classes.leaderboardTable} td:last-child`,
  { paddingRight: '0.7rem', textAlign: 'right' },
);

globalStyle(
  `${classes.leaderboardTable} th,
${classes.leaderboardTable} td`,
  {
    padding: '0.45rem 0.25rem',
    borderBottom: `1px solid ${vars.navy}`,
    textAlign: 'left',
  },
);

globalStyle(`${classes.leaderboardTable} tbody tr`, { height: '3rem' });

globalStyle(
  `${classes.leaderboardTable} tbody th,
${classes.leaderboardTable} tbody td`,
  { paddingBlock: '0.1rem' },
);

globalStyle(`${classes.leaderboardTable} td`, {
  fontFamily: vars.fontData,
  fontSize: vars.textLabel,
  whiteSpace: 'nowrap',
});

globalStyle(`${classes.leaderboardTable} small`, {
  display: 'block',
  fontWeight: 'normal',
});

globalStyle(`${classes.leaderboardPagination}`, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: '0.65rem',
  color: vars.muted,
  fontSize: vars.textSmall,
});

globalStyle(`${classes.leaderboardPagination} span`, { whiteSpace: 'nowrap' });

globalStyle(`${classes.leaderboardTable} tr[aria-current='true']`, {
  background: vars.cream,
});

globalStyle(`${classes.leaderboardTable} tr[data-comparable='false']`, {
  color: vars.muted,
  background: vars.disabledSurface,
});

globalStyle(
  `${classes.leaderboardVersionButton},
${classes.leaderboardVersionHelpClose}`,
  {
    display: 'inline-grid',
    width: '2.75rem',
    height: '2.75rem',
    padding: '0',
    color: vars.navy,
    background: 'transparent',
    border: '0',
    cursor: 'help',
    placeItems: 'center',
  },
);

globalStyle(
  `${classes.leaderboardVersionButton} svg,
${classes.leaderboardVersionHelpClose} svg`,
  { width: '1.25rem', height: '1.25rem' },
);

globalStyle(
  `${classes.leaderboardVersionButton}:focus-visible,
${classes.leaderboardVersionHelpClose}:focus-visible`,
  { outline: `0.2rem solid ${vars.focus}`, outlineOffset: '0.14rem' },
);

globalStyle(`${classes.leaderboardVersionHelp}[popover]`, {
  width: 'min(22rem, calc(100vw - 2rem))',
  padding: '1rem 3.25rem 1rem 1rem',
  color: vars.ink,
  background: vars.paper,
  border: `3px solid ${vars.navy}`,
  borderRadius: '0.55rem',
  boxShadow: `0 0.22rem 0 ${vars.yellow},
    0 0.48rem 0 ${vars.navyShadow}`,
});

globalStyle(`${classes.leaderboardVersionHelp} strong`, {
  color: vars.navy,
});

globalStyle(`${classes.leaderboardVersionHelp} p`, {
  margin: '0.3rem 0 0',
  color: vars.muted,
  fontSize: vars.textLabel,
  lineHeight: '1.4',
});

globalStyle(`${classes.leaderboardVersionHelpClose}`, {
  position: 'absolute',
  top: '0.25rem',
  right: '0.25rem',
  cursor: 'pointer',
});

globalStyle(
  `${classes.leaderboardTable} tbody tr[aria-current='true'] th,
${classes.leaderboardTable} tbody tr[aria-current='true'] td:first-child`,
  { color: vars.blue, fontWeight: '800' },
);

globalStyle(`${classes.friendsField}`, {
  display: 'grid',
  gap: '0.35rem',
  marginBlock: '0.7rem',
});

globalStyle(`${classes.friendsField} input`, {
  minWidth: '0',
  width: '100%',
  padding: '0.65rem 0.8rem',
  color: vars.ink,
  background: 'white',
  border: `2px solid ${vars.navy}`,
  borderRadius: vars.buttonRadius,
  font: 'inherit',
});
