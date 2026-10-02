import { vars } from '../../../styles/theme.css.ts';
import { globalStyle } from '@vanilla-extract/css';
import * as classes from '../../../styles/classes.css.ts';

globalStyle(`${classes.trainerCustomizer}`, {
  display: 'grid',
  padding: '1rem',
  alignItems: 'end',
  background: vars.cream,
  border: `3px solid ${vars.navy}`,
  borderRadius: vars.surfaceRadius,
  boxShadow: `0 0.2rem 0 ${vars.yellow}`,
  gridTemplateAreas: "'name partner'\n    'avatar avatar'\n    'save save'",
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0.8rem',
});

globalStyle(
  `${classes.trainerCustomizerName},
${classes.pokemonPicker}`,
  { display: 'grid', minWidth: '0', gap: '0.3rem' },
);

globalStyle(`${classes.trainerCustomizerName}`, { gridArea: 'name' });

globalStyle(`${classes.trainerCustomizer} > ${classes.pokemonPicker}`, {
  gridArea: 'partner',
});

globalStyle(`${classes.trainerAvatarPicker}`, {
  display: 'grid',
  minWidth: '0',
  padding: '0',
  gridArea: 'avatar',
  border: '0',
  gap: '0.4rem',
});

globalStyle(`${classes.trainerAvatarPicker} legend`, { padding: '0' });

globalStyle(`${classes.trainerAvatarPickerOptions}`, {
  display: 'grid',
  maxHeight: '17rem',
  padding: '0.4rem',
  overflowY: 'auto',
  gridTemplateColumns: 'repeat(auto-fill, minmax(5.5rem, 1fr))',
  gap: '0.35rem',
  background: vars.paper,
  border: `3px solid ${vars.navy}`,
  borderRadius: vars.buttonRadius,
});

globalStyle(`${classes.trainerAvatarPickerOptions} button`, {
  display: 'grid',
  minWidth: '0',
  padding: '0.3rem',
  placeItems: 'center',
  color: vars.navy,
  background: 'transparent',
  border: '2px solid transparent',
  borderRadius: vars.buttonRadius,
  font: 'inherit',
  fontSize: vars.textMini,
  fontWeight: '700',
  cursor: 'pointer',
});

globalStyle(
  `${classes.trainerAvatarPickerOptions} button[aria-pressed='true']`,
  { background: vars.sky, borderColor: vars.blue },
);

globalStyle(`${classes.trainerAvatarPickerOptions} button:focus-visible`, {
  outline: `3px solid ${vars.blue}`,
});

globalStyle(`${classes.trainerAvatarPickerOptions} img`, {
  width: '4rem',
  height: '4rem',
  objectFit: 'contain',
  imageRendering: 'pixelated',
});

globalStyle(`${classes.trainerAvatarPickerOptions} p`, {
  margin: '0',
  padding: '0.5rem',
  gridColumn: '1 / -1',
});

globalStyle(`${classes.trainerCustomizer} > .game-button`, {
  gridArea: 'save',
});

globalStyle(
  `${classes.trainerCustomizer} label,
${classes.pokemonPicker} > label,
${classes.trainerAvatarPicker} legend`,
  { color: vars.navy, fontSize: vars.textLabel, fontWeight: '800' },
);

globalStyle(
  `${classes.trainerAvatarPicker} input,
${classes.trainerCustomizerName} input,
${classes.pokemonPicker} input`,
  {
    width: '100%',
    minHeight: '3rem',
    padding: '0.6rem 0.7rem',
    color: vars.ink,
    background: vars.paper,
    border: `3px solid ${vars.navy}`,
    borderRadius: vars.buttonRadius,
    fontWeight: '700',
  },
);

globalStyle(`${classes.pokemonPickerField}`, { position: 'relative' });

globalStyle(
  `${classes.pokemonPicker} ul,
${classes.pokemonPickerEmpty}`,
  {
    position: 'absolute',
    zIndex: '4',
    top: 'calc(100% + 0.35rem)',
    right: '0',
    left: '0',
    padding: '0.25rem',
    margin: '0',
    color: vars.ink,
    background: vars.paper,
    border: `3px solid ${vars.navy}`,
    borderRadius: vars.buttonRadius,
    boxShadow: `0 0.2rem 0 ${vars.yellow},
    0 0.4rem 0 ${vars.navyShadow}`,
  },
);

globalStyle(`${classes.pokemonPicker} ul`, {
  maxHeight: '13rem',
  overflowY: 'auto',
  listStyle: 'none',
});

globalStyle(`${classes.pokemonPicker} li`, {
  display: 'flex',
  minHeight: '2.5rem',
  padding: '0.3rem 0.5rem',
  alignItems: 'center',
  borderRadius: '0.25rem',
  fontWeight: '750',
  gap: '0.5rem',
  cursor: 'pointer',
});

globalStyle(`${classes.pokemonPickerSprite}`, {
  display: 'grid',
  width: '2rem',
  height: '2rem',
  flex: 'none',
  background: vars.sky,
  borderRadius: vars.iconControlRadius,
  placeItems: 'center',
});

globalStyle(`${classes.pokemonPickerSprite} img`, {
  width: '2rem',
  height: '2rem',
  objectFit: 'contain',
  imageRendering: 'pixelated',
});

globalStyle(
  `${classes.pokemonPicker} li:hover,
${classes.pokemonPicker} li[aria-selected='true']`,
  { color: vars.paper, background: vars.blue },
);

globalStyle(`${classes.pokemonPickerEmpty}`, {
  fontSize: vars.textLabel,
  fontWeight: '700',
  textAlign: 'center',
});
