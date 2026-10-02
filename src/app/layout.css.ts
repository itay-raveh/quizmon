import { vars } from '../styles/theme.css.ts';
import { globalKeyframes, globalStyle } from '@vanilla-extract/css';
import * as classes from '../styles/classes.css.ts';

globalKeyframes('surface-in', {
  from: { opacity: '0', transform: 'translateY(0.45rem)' },
  to: { opacity: '1', transform: 'translateY(0)' },
});

globalStyle(`${classes.appWithNavigation} .app__screen`, {
  gridTemplateRows: 'auto 1fr auto',
});

globalStyle(`#root`, { container: 'app-shell / inline-size' });

globalStyle(`${classes.appHeader} ${classes.feedbackButton}`, {
  gridColumn: '3',
  justifySelf: 'end',
  display: 'grid',
  width: '2.8rem',
  height: '2.8rem',
  padding: '0',
  placeItems: 'center',
});

globalStyle(`.app--questions .app__screen`, { gridTemplateRows: '1fr' });

globalStyle(`.app--questions main`, { paddingTop: '0.45rem' });

globalStyle(`${classes.appHeader}`, {
  display: 'grid',
  width: 'min(100%, 74rem)',
  marginInline: 'auto',
  padding:
    'calc(0.6rem + env(safe-area-inset-top))\n    calc(clamp(0.85rem, 2.5vw, 1.75rem) + env(safe-area-inset-right)) 0.6rem\n    calc(clamp(0.85rem, 2.5vw, 1.75rem) + env(safe-area-inset-left))',
  alignItems: 'center',
  gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
});

globalStyle(`${classes.appHeader} > ${classes.settingsLink}`, {
  gridColumn: '1',
});

globalStyle(`${classes.appNavigation}`, {
  gridColumn: '2',
  display: 'grid',
  width: 'min(100%, 42rem)',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '0.55rem',
});

globalStyle(`${classes.appNavigation} .game-button`, {
  display: 'flex',
  minWidth: '0',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.45rem',
  padding: '0.65rem 0.85rem',
  textDecoration: 'none',
});

globalStyle(`${classes.appNavigationAccount}`, { position: 'relative' });

globalStyle(`${classes.appNavigationAlert}`, {
  position: 'absolute',
  top: '-0.4rem',
  right: '-0.35rem',
  display: 'grid',
  width: '1.25rem',
  height: '1.25rem',
  border: `2px solid ${vars.navy}`,
  borderRadius: '50%',
  background: vars.errorInk,
  color: 'white',
  fontSize: '0.8rem',
  fontWeight: '800',
  lineHeight: '1',
  placeItems: 'center',
});

globalStyle(`${classes.appWithNavigation} main`, {
  minHeight: 'max(calc(100svh - 14rem), 33.5rem)',
});

globalStyle(`${classes.appNavigation} svg`, {
  width: '1.2rem',
  height: '1.2rem',
  flex: 'none',
});

globalStyle(`${classes.settingsLink}.game-button`, {
  display: 'inline-flex',
  width: '2.8rem',
  minHeight: '2.8rem',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.4rem',
});

globalStyle(`${classes.settingsLink} svg`, {
  width: '1.2rem',
  height: '1.2rem',
});

globalStyle(`${classes.appDestination} main`, { alignItems: 'start' });

globalStyle(`${classes.destinationRoute}`, { width: '100%' });

globalStyle(`${classes.appWithNavigation}`, {
  '@media': {
    '(max-width: 50rem)': {
      paddingBottom: 'calc(6.25rem + var(--app-safe-bottom-max))',
      vars: {
        '--app-safe-bottom-max': 'env(safe-area-max-inset-bottom, 0px)',
        // Firefox 150+ reports a false bottom inset: https://bugzilla.mozilla.org/show_bug.cgi?id=2057232
        '--app-safe-bottom':
          'min(env(safe-area-inset-bottom, 0px), var(--app-safe-bottom-max))',
        '--app-navigation-clearance': 'calc(6.25rem + var(--app-safe-bottom))',
      },
    },
  },
});

globalStyle(`${classes.appWithNavigation}`, {
  '@supports': {
    '(-webkit-touch-callout: none)': {
      '@media': {
        '(max-width: 50rem)': {
          vars: {
            '--app-safe-bottom-max':
              'env(safe-area-max-inset-bottom, env(safe-area-inset-bottom, 0px))',
          },
        },
      },
    },
  },
});

globalStyle(`${classes.appWithNavigation} .app__screen`, {
  '@media': {
    '(max-width: 50rem)': {
      minHeight: 'calc(100svh - 6.25rem - var(--app-safe-bottom-max))',
    },
  },
});

globalStyle(`${classes.appNavigation}`, {
  '@media': {
    '(max-width: 50rem)': {
      position: 'fixed',
      zIndex: '5',
      right: '0',
      bottom: 'calc(var(--app-safe-bottom) - var(--app-safe-bottom-max))',
      left: '0',
      width: '100%',
      padding: '0.6rem 0.65rem calc(0.8rem + var(--app-safe-bottom-max))',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      background: vars.paper,
      borderTop: `2px solid ${vars.navy}`,
    },
  },
});

globalStyle(`${classes.appNavigation} .game-button`, {
  '@media': {
    '(max-width: 50rem)': {
      flexDirection: 'column',
      gap: '0.2rem',
      padding: '0.35rem 0.2rem',
      fontSize: vars.textSmall,
      whiteSpace: 'nowrap',
    },
  },
});

globalStyle(`${classes.appWithNavigation} main`, {
  '@media': {
    '(max-width: 50rem)': {
      minHeight:
        'max(\n      calc(100svh - 18.25rem - var(--app-safe-bottom-max)),\n      clamp(\n        26.75rem,\n        calc(100svh - 14rem - var(--app-safe-bottom-max)),\n        29.25rem\n      )\n    )',
    },
  },
});

globalStyle(`${classes.appNavigation}`, {
  '@container': {
    'app-shell (max-width: 22.5rem)': {
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: '0.25rem',
    },
  },
});

globalStyle(`${classes.appNavigation} .game-button`, {
  '@container': {
    'app-shell (max-width: 22.5rem)': {
      padding: '0.3rem 0.1rem',
      fontSize: vars.textMini,
      lineHeight: '1.15',
    },
  },
});

globalStyle(`main`, {
  '@media': { '(max-width: 36rem)': { padding: '0.6rem' } },
});

globalStyle(`${classes.settingsDialog}`, {
  '@media': { '(max-width: 36rem)': { maxHeight: 'calc(100svh - 1rem)' } },
});

globalStyle(`${classes.settingsDialogHeader}`, {
  '@media': { '(max-width: 36rem)': { paddingTop: '1rem' } },
});

globalStyle(`${classes.settingsFormActions}`, {
  '@media': { '(max-width: 36rem)': { paddingBottom: '1rem' } },
});

globalStyle(`${classes.questionRelation}`, {
  '@media': { '(max-width: 36rem)': { gap: '0.55rem' } },
});

globalStyle(
  `${classes.questionRelationMatchup} ${classes.questionVisualMysteryType}`,
  {
    '@media': { '(max-width: 36rem)': { width: '5.25rem', height: '2.1rem' } },
  },
);

globalStyle(`${classes.questionRelationArrow}`, {
  '@media': { '(max-width: 36rem)': { width: '2.9rem' } },
});

globalStyle(`${classes.question}`, {
  '@media': {
    '(max-width: 36rem)': {
      borderRadius: '0.55rem',
      vars: { '--question-panel-padding': '0.85rem' },
    },
  },
});

globalStyle(`${classes.question} h1`, {
  '@media': { '(max-width: 36rem)': { marginTop: '0.65rem' } },
});

globalStyle(`${classes.question}`, {
  '@media': {
    '(max-width: 36rem)': { vars: { '--question-response-size': '17.25rem' } },
  },
});

globalStyle(`${classes.answers}`, {
  '@media': {
    '(max-width: 36rem)': { gridTemplateColumns: '1fr', gap: '0.55rem' },
  },
});

globalStyle(`${classes.answersPokemon}`, {
  '@media': {
    '(max-width: 36rem)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  },
});

globalStyle(`${classes.shareTargets}`, {
  '@media': {
    '(max-width: 36rem)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  },
});

globalStyle(
  `${classes.shareTarget},
  ${classes.shareTarget}:nth-last-child(-n + 2)`,
  { '@media': { '(max-width: 36rem)': { gridColumn: 'span 1' } } },
);

globalStyle(`${classes.shareTarget}:last-child`, {
  '@media': { '(max-width: 36rem)': { gridColumn: '1 / -1' } },
});

globalStyle(`${classes.answer}`, {
  '@media': { '(max-width: 36rem)': { minHeight: '2.75rem' } },
});

globalStyle(`${classes.answerPokemon}`, {
  '@media': {
    '(max-width: 36rem)': {
      minHeight: '7rem',
      gridTemplateColumns: '1fr',
      gridTemplateRows: 'var(--answer-sprite-size) minmax(2.75rem, auto)',
      vars: { '--answer-sprite-size': '4.75rem' },
    },
  },
});

globalStyle(`${classes.answerNameplate}`, {
  '@media': {
    '(max-width: 36rem)': {
      padding: '0.3rem 0.35rem 0.4rem',
      alignContent: 'center',
      borderTop: `2px solid ${vars.navy}`,
      borderLeft: '0',
      textAlign: 'center',
    },
  },
});

globalStyle(`${classes.answerNameplate} small`, {
  '@media': { '(max-width: 36rem)': { fontSize: vars.textSmall } },
});

globalStyle(`${classes.answerName}`, {
  '@media': { '(max-width: 36rem)': { fontSize: vars.textLabel } },
});

globalStyle(`${classes.answerTypes}`, {
  '@media': { '(max-width: 36rem)': { justifyContent: 'center' } },
});

globalStyle(`${classes.selectionGridGenerations}`, {
  '@media': {
    '(max-width: 36rem)': { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  },
});

globalStyle(`.app--questions main`, {
  '@media': {
    '(max-width: 36rem) and (max-height: 50rem)': { paddingTop: '0.4rem' },
  },
});

globalStyle(`main`, {
  '@media': {
    '(max-width: 36rem) and (max-height: 50rem)': { padding: '0.4rem' },
  },
});

globalStyle(`${classes.question}`, {
  '@media': {
    '(max-width: 36rem) and (max-height: 50rem)': {
      vars: { '--question-panel-padding': '0.7rem' },
    },
  },
});

globalStyle(`${classes.question} h1`, {
  '@media': {
    '(max-width: 36rem) and (max-height: 50rem)': { marginTop: '0.45rem' },
  },
});

globalStyle(`.app--questions main`, {
  '@media': {
    '(max-height: 43rem) and (min-width: 36.01rem)': { paddingTop: '0.75rem' },
  },
});

globalStyle(`${classes.question}`, {
  '@media': {
    '(max-height: 43rem) and (min-width: 36.01rem)': {
      vars: {
        '--question-stimulus-size': '8rem',
        '--question-response-size': '13.5rem',
      },
    },
  },
});

globalStyle(
  `${classes.questionEnter},
  ${classes.results},
  ${classes.settingsDialog}[open],
  ${classes.confirmDialog}[open],
  ${classes.shareDialog}[open],
  ${classes.trainerBadgeDialog}[open],
  ${classes.trainerTitleDialog}[open],
  ${classes.trainerCardPolish}::before`,
  {
    '@media': {
      '(prefers-reduced-motion: reduce)': { animation: 'none !important' },
    },
  },
);

globalStyle(`${classes.catalogRouteState}`, {
  display: 'grid',
  width: 'min(42rem, 100%)',
  margin: '2rem auto',
  padding: '1.5rem',
  justifyItems: 'start',
  gap: '1rem',
  color: vars.navy,
  background: vars.cream,
  borderRadius: '0.75rem',
});
