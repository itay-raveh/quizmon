import { vars } from '../../../styles/theme.css.ts';
import { globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalStyle(`${classes.questionTopline}`, {
  '@container': {
    '(max-width: 19rem)': {
      display: 'grid',
      gridTemplateColumns: 'auto minmax(0, 1fr) auto',
      gap: '0 0.3rem',
    },
  },
});

globalStyle(`${classes.questionTopline} ${classes.questionLeave}`, {
  '@container': { '(max-width: 19rem)': { gridColumn: '1', gridRow: '1 / 3' } },
});

globalStyle(`${classes.questionTopline} ${classes.progress}`, {
  '@container': { '(max-width: 19rem)': { gridColumn: '2', gridRow: '1' } },
});

globalStyle(`${classes.questionTopline} ${classes.timer}`, {
  '@container': {
    '(max-width: 19rem)': { gridColumn: '2', gridRow: '2', marginLeft: '0' },
  },
});

globalStyle(`${classes.questionTopline} ${classes.feedbackButton}`, {
  '@container': { '(max-width: 19rem)': { gridColumn: '3', gridRow: '1 / 3' } },
});

globalStyle(
  `${classes.questionTopline} ${classes.progress},
  ${classes.questionTopline} ${classes.timer}`,
  { '@container': { '(max-width: 19rem)': { fontSize: vars.textMicro } } },
);

globalStyle(`${classes.answerTrail}`, {
  '@container': { '(max-width: 12rem)': { flexWrap: 'wrap' } },
});

globalStyle(`${classes.resultsHeader}`, {
  '@container': {
    '(max-width: 12rem)': { gridTemplateColumns: 'auto minmax(0, 1fr)' },
  },
});

globalStyle(`${classes.resultsHeader} > :first-child`, {
  '@container': { '(max-width: 12rem)': { gridColumn: '1', gridRow: '1' } },
});

globalStyle(`${classes.resultsHeading}`, {
  '@container': {
    '(max-width: 12rem)': { gridColumn: '1 / -1', gridRow: '2' },
  },
});

globalStyle(`${classes.resultsCombo}`, {
  '@container': {
    '(max-width: 12rem)': { gridColumn: '2', gridRow: '1', justifySelf: 'end' },
  },
});

globalStyle(
  `${classes.natureEffect},
  ${classes.questionChampion} ${classes.questionStimulus}`,
  {
    '@container': {
      '(max-width: 24rem)': { gridTemplateColumns: 'minmax(0, 1fr)' },
    },
  },
);

globalStyle(
  `${classes.natureEffect}:not(${classes.natureEffectCompact}) ${classes.statDirection}`,
  { '@container': { '(max-width: 24rem)': { minHeight: '3.5rem' } } },
);

globalStyle(
  `${classes.natureEffect}:not(${classes.natureEffectCompact}) ${classes.statDirection} > strong`,
  { '@container': { '(max-width: 24rem)': { fontSize: '1rem' } } },
);

globalStyle(
  `${classes.answerNameplateStat},
  ${classes.answerIdentityStat}`,
  {
    '@container': {
      '(max-width: 24rem)': {
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateAreas: "'number' 'name' 'stat'",
      },
    },
  },
);

globalStyle(`${classes.answerStat}`, {
  '@container': {
    '(max-width: 24rem)': { marginTop: '0.3rem', textAlign: 'center' },
  },
});

globalStyle(
  `${classes.questionEvolutionChain},
  ${classes.questionEvolutionEndpoints},
  ${classes.questionRelation},
  ${classes.questionResponse} ${classes.answersPokemon},
  ${classes.championSearchControls}`,
  {
    '@container': {
      '(max-width: 16rem)': { gridTemplateColumns: 'minmax(0, 1fr)' },
    },
  },
);

globalStyle(
  `${classes.questionEvolutionChain} ${classes.questionRelationArrow}`,
  {
    '@container': {
      '(max-width: 16rem)': { margin: '0.5rem 0', width: '2.9rem' },
    },
  },
);

globalStyle(
  `${classes.questionEvolutionChain} ${classes.questionRelationArrow} svg,
  ${classes.questionEvolutionEndpoints} ${classes.questionRelationArrow} svg,
  ${classes.questionRelation} ${classes.questionRelationArrow} svg`,
  { '@container': { '(max-width: 16rem)': { transform: 'rotate(90deg)' } } },
);

globalStyle(
  `${classes.questionRelationEvolution} ${classes.questionRelationArrow}`,
  { '@container': { '(max-width: 16rem)': { height: '3.375rem' } } },
);

globalStyle(`${classes.questionVisualSubjectName}`, {
  '@container': { '(max-width: 16rem)': { maxWidth: '100%' } },
});

globalStyle(`${classes.championSearchControls} > .game-button`, {
  '@container': { '(max-width: 16rem)': { justifySelf: 'stretch' } },
});

globalStyle(
  `${classes.answersTypeOptions} ${classes.answerMatchup} > ${classes.answer}`,
  {
    '@container': {
      '(max-width: 16rem)': {
        padding: '0.65rem',
        gridTemplateColumns: '1.45rem minmax(0, 1fr)',
      },
    },
  },
);

globalStyle(
  `${classes.answersTypeOptions} ${classes.answerMatchup} ${classes.answerTypeChoice}`,
  { '@container': { '(max-width: 16rem)': { gridColumn: '1 / -1' } } },
);

globalStyle(`${classes.answersTypeOptions} ${classes.answerMatchupHelp}`, {
  '@container': {
    '(max-width: 16rem)': {
      top: '0.4rem',
      right: '0.4rem',
      minHeight: '1.8rem',
      paddingBlock: '0.1rem',
      transform: 'none',
    },
  },
});

globalStyle(`${classes.answerItem}`, {
  '@container': {
    '(max-width: 16rem)': { gridTemplateColumns: 'auto minmax(0, 1fr)' },
  },
});

globalStyle(`${classes.answerItem} ${classes.answerText}`, {
  '@container': {
    '(max-width: 16rem)': {
      gridColumn: '1 / -1',
      justifyItems: 'center',
      textAlign: 'center',
    },
  },
});

globalStyle(`${classes.answerItem} ${classes.answerItemSlot}`, {
  '@container': { '(max-width: 16rem)': { justifySelf: 'center' } },
});

globalStyle(`${classes.answerIdentityStat}`, {
  '@container': { '(max-width: 16rem)': { justifyItems: 'start' } },
});
