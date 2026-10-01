import { vars } from '../../../styles/theme.css.ts';
import { globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalStyle(`${classes.trainerPassportPublicHeader}`, {
  justifyContent: 'flex-start',
});

globalStyle(`${classes.trainerPassportPublicHeading}`, { minWidth: '0' });

globalStyle(`${classes.trainerPassportPublicHeading} h1`, {
  overflowWrap: 'anywhere',
});

globalStyle(`${classes.trainerPassportPublicHeading} p`, {
  margin: '0.15rem 0 0',
  color: vars.muted,
  fontSize: vars.textSmall,
});

globalStyle(`${classes.publicTrainerLoading}`, {
  display: 'grid',
  gap: '1.1rem',
});

globalStyle(`${classes.publicTrainerLoading} ${classes.trainerPassportView}`, {
  cursor: 'default',
});

globalStyle(
  `${classes.publicTrainerLoading} ${classes.trainerPassportView} ${classes.socialSkeleton}`,
  { width: '60%' },
);

globalStyle(`${classes.publicTrainerLoading} ${classes.trainerArtifactFrame}`, {
  alignContent: 'center',
  justifyItems: 'center',
  gap: '1.5rem',
});

globalStyle(
  `${classes.publicTrainerLoading} ${classes.trainerArtifactFrame} ${classes.socialSkeleton}:first-child`,
  { width: '55%', height: '12%' },
);

globalStyle(
  `${classes.publicTrainerLoading} ${classes.trainerArtifactFrame} ${classes.socialSkeleton}:last-child`,
  { width: '30%', height: '35%' },
);

globalStyle(`${classes.trainerPassportPublicHeader}`, {
  '@media': { '(max-width: 42rem)': { flexWrap: 'nowrap' } },
});
