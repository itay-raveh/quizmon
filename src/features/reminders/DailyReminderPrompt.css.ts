import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css.ts';
import {
  installAction,
  installActionButtons,
} from '../installation/classes.css.ts';

export const root = style({
  display: 'grid',
  padding: '0.8rem 0',
  alignItems: 'center',
  color: vars.navy,
  borderBlock: `2px solid ${vars.navy}`,
  gridTemplateColumns: '2.3rem minmax(0, 1fr) auto',
  gap: '0.7rem',
  textAlign: 'left',
  '@container': {
    '(max-width: 19rem)': {
      gridTemplateColumns: '2rem minmax(0, 1fr)',
    },
  },
});

export const dailyInstallOffer = style({});

globalStyle(`${dailyInstallOffer} ${installAction}`, {
  '@container': { '(max-width: 28rem)': { width: '100%' } },
});

globalStyle(`${dailyInstallOffer} ${installActionButtons}`, {
  '@container': { '(max-width: 28rem)': { justifyContent: 'space-between' } },
});

export const icon = style({
  width: '2rem',
  height: '2rem',
  color: vars.blue,
  '@container': {
    '(max-width: 19rem)': {
      width: '1.75rem',
      height: '1.75rem',
    },
  },
});

export const copy = style({
  display: 'grid',
  minWidth: 0,
  gap: '0.12rem',
});

export const title = style({ fontSize: vars.textControl });

export const detail = style({
  color: vars.muted,
  fontSize: vars.textSmall,
  lineHeight: 1.25,
});

export const error = style({ color: vars.errorInk });

export const actions = style({
  display: 'flex',
  gap: '0.45rem',
  '@container': {
    '(max-width: 19rem)': { gridColumn: '1 / -1' },
  },
});

export const actionButton = style({
  minHeight: '2.5rem',
  padding: '0.45rem 0.7rem',
  fontSize: vars.textCompactControl,
  '@container': {
    '(max-width: 19rem)': { flex: 1 },
  },
});
