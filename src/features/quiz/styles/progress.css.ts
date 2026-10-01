import { vars } from '../../../styles/theme.css.ts';
import { globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalStyle(`${classes.questionTopline}`, {
  display: 'flex',
  width: 'calc(100% + 2 * var(--question-panel-padding))',
  minWidth: '0',
  margin:
    'calc(-1 * var(--question-panel-padding))\n    calc(-1 * var(--question-panel-padding)) 0',
  padding: '0.45rem 0.65rem',
  alignItems: 'center',
  gap: '0.55rem',
  color: vars.navy,
  background: vars.cream,
  borderBottom: `2px solid ${vars.navy}`,
  borderRadius: `${vars.buttonRadius} ${vars.buttonRadius} 0 0`,
});

globalStyle(`${classes.questionTopline} .game-button`, {
  display: 'grid',
  flex: 'none',
  width: '2.75rem',
  minWidth: '2.75rem',
  height: '2.75rem',
  minHeight: '2.75rem',
  padding: '0',
  placeItems: 'center',
  color: vars.navy,
  background: 'transparent',
  border: '0',
  boxShadow: 'none',
});

globalStyle(
  `${classes.questionTopline} .game-button:hover:not(:disabled),
${classes.questionTopline} .game-button:active:not(:disabled)`,
  { background: vars.sky, boxShadow: 'none', transform: 'none' },
);

globalStyle(`${classes.resultsClose}.game-button`, {
  display: 'grid',
  width: '2.8rem',
  minWidth: '2.8rem',
  height: '2.8rem',
  minHeight: '2.8rem',
  padding: '0',
  placeItems: 'center',
});

globalStyle(
  `${classes.questionLeave} svg,
${classes.resultsClose} svg`,
  { width: '1.45rem', height: '1.45rem' },
);

globalStyle(
  `${classes.progress},
${classes.timer}`,
  {
    fontFamily: vars.fontData,
    fontSize: vars.textNumeric,
    fontWeight: '800',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  },
);

globalStyle(`${classes.progress}`, { flex: 'none' });

globalStyle(`${classes.timer}`, { marginLeft: 'auto' });

globalStyle(`${classes.timerHidden}`, { visibility: 'hidden' });

globalStyle(`${classes.leagueProgress}`, {
  position: 'relative',
  display: 'grid',
  width: 'min(20rem, 82%)',
  padding: '0',
  margin: '0.8rem 0 0',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  listStyle: 'none',
});

globalStyle(`${classes.leagueProgress}::before`, {
  position: 'absolute',
  top: 'calc(50% - 1px)',
  right: '8%',
  left: '8%',
  height: '2px',
  background: vars.sky,
  content: "''",
});

globalStyle(`${classes.leagueProgressStage}`, {
  position: 'relative',
  zIndex: '1',
  display: 'grid',
  width: '1.9rem',
  aspectRatio: '1',
  justifySelf: 'center',
  color: vars.muted,
  background: vars.paper,
  border: `2px solid ${vars.sky}`,
  borderRadius: '0.28rem',
  fontFamily: vars.fontData,
  fontSize: vars.textMini,
  fontWeight: '800',
  placeItems: 'center',
});

globalStyle(`${classes.leagueProgressStageComplete}`, {
  color: vars.primaryText,
  background: vars.blue,
  borderColor: vars.navy,
});

globalStyle(`${classes.leagueProgressStageCurrent}`, {
  color: vars.navy,
  background: vars.yellow,
  borderColor: vars.navy,
  boxShadow: `0 0.14rem 0 ${vars.navyShadow}`,
});

globalStyle(`${classes.questionLeague} h1`, { marginTop: '0.55rem' });
