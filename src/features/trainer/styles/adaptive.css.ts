import { vars } from '../../../styles/theme.css.ts';
import { globalKeyframes, globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalKeyframes('trainer-card-polish', {
  '0%,\n  12%': { opacity: '0', transform: 'translateX(-110%)' },
  '16%': { opacity: '1' },
  '52%': { opacity: '1' },
  '56%,\n  100%': { opacity: '0', transform: 'translateX(110%)' },
});

globalStyle(`${classes.trainerPassportHeader}`, {
  '@media': { '(max-width: 42rem)': { flexWrap: 'nowrap' } },
});

globalStyle(`${classes.trainerPassportView}`, {
  '@media': {
    '(max-width: 42rem)': {
      minHeight: '2.55rem',
      paddingInline: '0.35rem',
      fontSize: vars.textSmall,
    },
  },
});

globalStyle(`${classes.trainerBadgeCaseBadges}`, {
  '@media': {
    '(max-width: 42rem)': {
      minHeight: '0',
      padding: '0.5rem 0.6rem',
      borderWidth: '0.38rem',
      gap: '0.3rem',
    },
  },
});

globalStyle(`${classes.trainerBadge}`, {
  '@media': {
    '(max-width: 42rem)': { padding: '0.12rem', borderWidth: '2px' },
  },
});

globalStyle(`${classes.trainerBadgeCaseBadges} ${classes.trainerBadgeMark}`, {
  '@media': { '(max-width: 42rem)': { width: 'min(4.15rem, 86%)' } },
});

globalStyle(`${classes.trainerTitles}`, {
  '@media': { '(max-width: 42rem)': { padding: '0.45rem', gap: '0.4rem' } },
});

globalStyle(`${classes.trainerTitlesCollection}`, {
  '@media': { '(max-width: 42rem)': { gap: '0.4rem' } },
});

globalStyle(`${classes.trainerTitle}`, {
  '@media': {
    '(max-width: 42rem)': {
      minHeight: '4.5rem',
      padding: '0.4rem',
      gridTemplateColumns: 'auto minmax(0, 1fr)',
      alignContent: 'center',
      gap: '0.35rem 0.45rem',
    },
  },
});

globalStyle(`${classes.trainerTitleMark}`, {
  '@media': {
    '(max-width: 42rem)': {
      position: 'relative',
      width: '2.6rem',
      borderWidth: '2px',
    },
  },
});

globalStyle(`${classes.trainerTitleMark} svg`, {
  '@media': { '(max-width: 42rem)': { width: '1.45rem', height: '1.45rem' } },
});

globalStyle(`${classes.trainerTitleCopy} > strong`, {
  '@media': { '(max-width: 42rem)': { fontSize: vars.textSmall } },
});

globalStyle(`${classes.trainerTitleCopy} small`, {
  '@media': { '(max-width: 42rem)': { fontSize: vars.textMini } },
});

globalStyle(
  `${classes.trainerBadgeDialog},
  ${classes.trainerTitleDialog}`,
  { '@media': { '(max-width: 42rem)': { margin: 'auto auto 0.5rem' } } },
);

globalStyle(`${classes.trainerBadgeDialogBody}`, {
  '@media': {
    '(max-width: 42rem)': {
      padding: '0.85rem',
      gridTemplateColumns: '6.75rem minmax(0, 1fr)',
      gap: '0.8rem',
    },
  },
});

globalStyle(`${classes.trainerTitleDialogBody}`, {
  '@media': {
    '(max-width: 42rem)': {
      padding: '0.85rem',
      gridTemplateColumns: '5.5rem minmax(0, 1fr)',
      gap: '0.8rem',
    },
  },
});

globalStyle(`${classes.trainerTitleDialogBody} > ${classes.trainerTitleMark}`, {
  '@media': { '(max-width: 42rem)': { position: 'relative', width: '5.5rem' } },
});

globalStyle(
  `${classes.trainerTitleDialogBody} > ${classes.trainerTitleMark} svg`,
  { '@media': { '(max-width: 42rem)': { width: '3rem', height: '3rem' } } },
);

globalStyle(`${classes.trainerCustomizer}`, {
  '@media': {
    '(max-width: 42rem)': {
      gridTemplateAreas:
        "'name'\n      'partner'\n      'avatar'\n      'save'",
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
});

globalStyle(`${classes.trainerCustomizer} > .game-button`, {
  '@media': { '(max-width: 42rem)': { width: '100%' } },
});

globalStyle(`${classes.trainerPassportView}`, {
  '@media': {
    '(max-width: 42rem) and (pointer: coarse)': { minHeight: '2.75rem' },
  },
});

globalStyle(
  `${classes.trainerBadgeDialog} > header,
  ${classes.trainerTitleDialog} > header`,
  {
    '@container': {
      '(max-width: 24rem)': {
        display: 'grid',
        padding: '0.55rem 0.65rem',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: '0.5rem',
      },
    },
  },
);

globalStyle(
  `${classes.trainerBadgeDialog} h2,
  ${classes.trainerTitleDialog} h2`,
  {
    '@container': {
      '(max-width: 24rem)': { minWidth: '0', overflowWrap: 'anywhere' },
    },
  },
);

globalStyle(
  `${classes.trainerBadgeDialogBody},
  ${classes.trainerTitleDialogBody}`,
  {
    '@container': {
      '(max-width: 24rem)': {
        padding: '0.75rem',
        gridTemplateColumns: 'minmax(0, 1fr)',
        alignItems: 'start',
        gap: '0.75rem',
      },
    },
  },
);

globalStyle(
  `${classes.trainerBadgeDialogBody} > ${classes.trainerBadgeMark},
  ${classes.trainerTitleDialogBody} > ${classes.trainerTitleMark}`,
  {
    '@container': {
      '(max-width: 24rem)': { position: 'relative', width: 'min(5rem, 100%)' },
    },
  },
);

globalStyle(`${classes.trainerPassportView}`, {
  '@container': {
    '(max-width: 19.5rem)': {
      minHeight: '3.25rem',
      padding: '0.3rem',
      flexDirection: 'column',
      gap: '0.15rem',
    },
  },
});

globalStyle(`${classes.trainerTitlesCollection}`, {
  '@container': {
    '(max-width: 19.5rem)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
});

globalStyle(`${classes.trainerArtifactFrame}`, {
  '@container': {
    '(max-width: 12rem)': { height: '13rem', aspectRatio: 'auto' },
  },
});

globalStyle(`${classes.trainerCardFront}`, {
  '@container': {
    '(max-width: 12rem)': {
      gridTemplateAreas: "'rank' 'identity' 'partner'",
      gridTemplateColumns: 'minmax(0, 1fr)',
      gridTemplateRows: 'auto auto minmax(0, 1fr)',
    },
  },
});

globalStyle(`${classes.trainerCardRecord} > div`, {
  '@container': { '(max-width: 12rem)': { flexDirection: 'column' } },
});
