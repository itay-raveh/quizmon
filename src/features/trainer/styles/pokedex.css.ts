import { vars } from '../../../styles/theme.css.ts';
import { globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalStyle(`${classes.trainerPokedex}`, { display: 'grid', gap: '0.75rem' });

globalStyle(`${classes.trainerPokedexSummary} strong`, {
  color: vars.navy,
  fontSize: vars.textHeadline,
});

globalStyle(`${classes.trainerPokedexSearch}`, {
  display: 'grid',
  minWidth: '0',
  color: vars.navy,
  fontSize: vars.textLabel,
  fontWeight: '700',
  gap: '0.25rem',
});

globalStyle(`${classes.trainerPokedexSearch} input`, {
  width: '100%',
  minWidth: '0',
  minHeight: '2.8rem',
  padding: '0.5rem',
  color: vars.ink,
  background: vars.paper,
  border: `2px solid ${vars.navy}`,
  borderRadius: vars.buttonRadius,
  font: 'inherit',
  fontSize: vars.textBody,
});

globalStyle(`${classes.trainerPokedexSearch} input::placeholder`, {
  color: vars.muted,
  opacity: '1',
});

globalStyle(`${classes.trainerPokedexSearch} input:focus-visible`, {
  outline: `3px solid ${vars.focus}`,
  outlineOffset: '2px',
});

globalStyle(`${classes.trainerPokedexCount}`, {
  margin: '0',
  color: vars.muted,
  fontSize: vars.textLabel,
});

globalStyle(`${classes.trainerPokedexEntries}`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  margin: '0',
  padding: '0',
  listStyle: 'none',
  gap: '0.5rem',
});

globalStyle(`${classes.trainerPokedexEntry}`, {
  display: 'flex',
  minWidth: '0',
  padding: '0.25rem',
  flexDirection: 'column',
  alignItems: 'center',
  color: vars.muted,
  border: `2px solid ${vars.sky}`,
  borderRadius: vars.buttonRadius,
  textAlign: 'center',
  gap: '0.25rem',
});

globalStyle(`${classes.trainerPokedexEntry}${classes.isFound}`, {
  color: vars.navy,
  borderColor: vars.navy,
});

globalStyle(`${classes.trainerPokedexPortrait}`, {
  display: 'grid',
  width: '4rem',
  maxWidth: '100%',
  height: '4rem',
  placeItems: 'center',
});

globalStyle(`${classes.trainerPokedexPortrait} svg`, {
  width: '2.5rem',
  height: '2.5rem',
});

globalStyle(`${classes.trainerPokedexMissing}`, {
  display: 'grid',
  fontSize: vars.textLabel,
  gap: '0.2rem',
});

globalStyle(
  `${classes.trainerPokedexMissing} small,
${classes.trainerPokedexEntry} ${classes.pokemonIdentityNumber}`,
  { fontFamily: vars.fontData, fontSize: vars.textMini },
);

globalStyle(`${classes.trainerPokedexEntry} ${classes.pokemonIdentity}`, {
  display: 'grid',
  gap: '0.2rem',
});

globalStyle(`${classes.trainerPokedexEntry} ${classes.pokemonIdentityName}`, {
  fontSize: vars.textLabel,
  overflowWrap: 'anywhere',
});

globalStyle(`${classes.trainerPokedexEntry} ${classes.typeBadges}`, {
  maxWidth: '100%',
  marginTop: 'auto',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '0.15rem',
});

globalStyle(`${classes.trainerPokedexEntry} ${classes.typeBadge}`, {
  width: '2.8rem',
  height: 'auto',
});

globalStyle(`${classes.trainerPokedexPages}`, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
});

globalStyle(`${classes.trainerPokedexPages} > span`, {
  color: vars.muted,
  fontFamily: vars.fontData,
  fontSize: vars.textSmall,
});

globalStyle(`${classes.trainerPokedexEntries}`, {
  '@container': {
    '(max-width: 32rem)': { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  },
});

globalStyle(`${classes.trainerPassportView}`, {
  '@container': {
    '(max-width: 32rem)': { flexDirection: 'column', minHeight: '3rem' },
  },
});

globalStyle(`${classes.trainerPokedexEntries}`, {
  '@container': {
    '(max-width: 23rem)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  },
});
