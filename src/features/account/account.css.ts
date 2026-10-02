import { vars } from '../../styles/theme.css.ts';
import { globalKeyframes, globalStyle } from '@vanilla-extract/css';
import * as classes from '../../styles/classes.css.ts';

globalKeyframes('account-code-caret', { '50%': { opacity: '0' } });

globalStyle(`${classes.accountScreen}`, { textAlign: 'left' });

globalStyle(`${classes.accountScreen} .game-panel__header`, {
  display: 'grid',
  gap: '0.2rem',
});

globalStyle(`${classes.accountScreenNameRow}`, {
  display: 'flex',
  alignItems: 'center',
  gap: '0.55rem',
  minWidth: '0',
});

globalStyle(`${classes.accountScreenNameRow} .game-panel__title`, {
  overflowWrap: 'anywhere',
});

globalStyle(`${classes.accountScreenNameForm}`, {
  display: 'grid',
  gap: '0.55rem',
  maxWidth: '24rem',
  paddingTop: '0.5rem',
});

globalStyle(`${classes.accountScreenNameForm} label`, {
  fontSize: vars.textLabel,
  fontWeight: '800',
});

globalStyle(`${classes.accountScreenNameForm} input`, {
  minHeight: '3rem',
  padding: '0.6rem 0.7rem',
  color: vars.ink,
  background: vars.paper,
  border: `3px solid ${vars.navy}`,
  borderRadius: vars.buttonRadius,
  fontWeight: '700',
});

globalStyle(`${classes.accountScreenNameActions}`, {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
});

globalStyle(`${classes.accountScreenNameForm} p`, {
  margin: '0',
  color: vars.errorInk,
});

globalStyle(`${classes.accountScreenCode}`, {
  color: vars.muted,
  font: `700 ${vars.textMini} ${vars.fontData}`,
  letterSpacing: '0.04em',
});

globalStyle(`${classes.accountScreenSections}`, {
  display: 'grid',
  gap: '0.55rem',
});

globalStyle(`${classes.accountScreenSection}`, {
  minWidth: '0',
  borderTop: `1px solid ${vars.navy}`,
});

globalStyle(`${classes.accountScreenSection} summary`, {
  padding: '0.8rem 0.2rem',
  color: vars.navy,
  fontSize: vars.textHeadline,
  fontWeight: '800',
  cursor: 'pointer',
});

globalStyle(`${classes.accountScreenSyncStatus}`, {
  display: 'block',
  color: vars.errorInk,
  fontSize: vars.textStatus,
  fontWeight: '700',
});

globalStyle(`${classes.accountScreenSection} summary:focus-visible`, {
  outline: `3px solid ${vars.blue}`,
  outlineOffset: '2px',
});

globalStyle(
  `${classes.accountScreenSection} > ${classes.accountSettings},
${classes.accountScreenSection} > ${classes.friendsPanel}`,
  { padding: '0.3rem 0.2rem 1rem' },
);

globalStyle(
  `${classes.accountSettings},
${classes.accountSettingsSection}`,
  { display: 'grid', gap: '0.85rem', minWidth: '0' },
);

globalStyle(`${classes.accountSettings}`, {
  gap: '1rem',
  overflowWrap: 'anywhere',
});

globalStyle(
  `${classes.accountSettings} p,
${classes.accountSettings} h2`,
  { margin: '0' },
);

globalStyle(`${classes.accountSettings} h2`, {
  fontSize: vars.textHeadline,
});

globalStyle(
  `${classes.accountSettingsSection} + ${classes.accountSettingsSection}`,
  { paddingTop: '1.25rem', borderTop: `1px solid ${vars.navy}` },
);

globalStyle(`${classes.accountSettingsSync}`, {
  display: 'grid',
  justifyItems: 'start',
  gap: '0.15rem',
  paddingTop: '0.75rem',
  borderTop: `1px solid ${vars.sky}`,
  fontSize: vars.textStatus,
});

globalStyle(`${classes.accountSettingsSync} strong`, {
  color: vars.errorInk,
});

globalStyle(
  `${classes.accountSettingsSync} p,
${classes.accountSettingsPrimaryAction} p`,
  { color: vars.muted, fontSize: vars.textStatus },
);

globalStyle(`${classes.accountSettingsPrimaryAction}`, {
  display: 'grid',
  gap: '0.55rem',
  justifyItems: 'start',
});

globalStyle(`${classes.accountSettingsBenefits}`, {
  display: 'grid',
  gap: '0.6rem',
  margin: '0',
  padding: '0',
  color: vars.navy,
  listStyle: 'none',
});

globalStyle(`${classes.accountSettingsBenefits} li`, {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: vars.textStatus,
});

globalStyle(`${classes.accountSettingsBenefits} svg`, {
  flex: 'none',
  width: '1.35rem',
  height: '1.35rem',
});

globalStyle(`${classes.accountSettingsTesting}`, {
  display: 'grid',
  gap: '0.65rem',
  color: vars.muted,
  fontSize: vars.textBody,
});

globalStyle(`${classes.accountSettingsActions}`, {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
});

globalStyle(`${classes.accountSettingsField}`, {
  display: 'grid',
  gap: '0.4rem',
  fontWeight: '700',
});

globalStyle(`${classes.accountSettingsField} input`, {
  minWidth: '0',
  width: '100%',
  padding: '0.65rem 0.8rem',
  color: vars.ink,
  background: 'white',
  border: `2px solid ${vars.navy}`,
  borderRadius: vars.buttonRadius,
  font: 'inherit',
});

globalStyle(`${classes.accountSettingsField} input[aria-invalid='true']`, {
  borderColor: vars.errorInk,
  background: vars.errorSurface,
});

globalStyle(`${classes.accountSettingsError}`, {
  color: vars.errorInk,
  fontSize: vars.textStatus,
  fontWeight: '700',
});

globalStyle(`${classes.accountSettingsVerification}`, { gap: '1.15rem' });

globalStyle(`${classes.accountSettingsVerifyIntro}`, {
  display: 'grid',
  gap: '0.35rem',
});

globalStyle(`${classes.accountSettingsVerifyIntro} h2`, {
  color: vars.navy,
});

globalStyle(`${classes.accountSettingsDestination}`, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '0.25rem 0.7rem',
  paddingBottom: '0.5rem',
  borderBottom: `1px solid ${vars.sky}`,
});

globalStyle(`${classes.accountSettingsDestination} strong`, {
  minWidth: '0',
  overflowWrap: 'anywhere',
  color: vars.navy,
});

globalStyle(`${classes.accountSettingsTextAction}`, {
  minHeight: '2.75rem',
  padding: '0.25rem 0',
  color: vars.blue,
  background: 'none',
  border: '0',
  font: 'inherit',
  fontWeight: '700',
  textDecoration: 'underline',
  textUnderlineOffset: '0.18em',
  cursor: 'pointer',
});

globalStyle(`${classes.accountSettingsTextAction}:hover:not(:disabled)`, {
  color: vars.navy,
});

globalStyle(`${classes.accountSettingsTextAction}:disabled`, {
  color: vars.muted,
  cursor: 'default',
});

globalStyle(`${classes.accountSettingsCodeField}`, {
  display: 'grid',
  gap: '0.55rem',
  fontWeight: '700',
});

globalStyle(`${classes.accountSettingsOtp}`, {
  width: '100%',
  maxWidth: '24rem',
});

globalStyle(`${classes.accountSettingsOtpInput}:focus-visible`, {
  outline: 'none',
});

globalStyle(`${classes.accountSettingsCodeSlots}`, {
  display: 'flex',
  gap: 'clamp(0.25rem, 1.5vw, 0.5rem)',
  width: '100%',
});

globalStyle(`${classes.accountSettingsCodeSlot}`, {
  position: 'relative',
  display: 'grid',
  placeItems: 'center',
  flex: '1 1 0',
  minWidth: '0',
  height: 'clamp(2.75rem, 11vw, 3.25rem)',
  color: vars.navy,
  background: 'white',
  border: `2px solid ${vars.navy}`,
  borderRadius: vars.buttonRadius,
  fontFamily: vars.fontData,
  fontSize: vars.textHeadline,
  boxShadow: `0 0.16rem 0 ${vars.yellow}`,
});

globalStyle(`${classes.accountSettingsCodeSlotActive}`, {
  background: vars.cream,
  outline: `2px solid ${vars.blue}`,
  outlineOffset: '2px',
});

globalStyle(
  `${classes.accountSettingsOtp}:has(input[aria-invalid='true'])
  ${classes.accountSettingsCodeSlot}`,
  { borderColor: vars.errorInk },
);

globalStyle(`${classes.accountSettingsCodeCaret}`, {
  position: 'absolute',
  width: '2px',
  height: '1.4rem',
  background: vars.navy,
  animation: 'account-code-caret 1s steps(1) infinite',
});

globalStyle(`${classes.accountSettingsCodeCaret}`, {
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
});

globalStyle(`${classes.accountSettingsCodeHint}`, {
  color: vars.muted,
  fontSize: vars.textStatus,
  fontWeight: '400',
});

globalStyle(`${classes.accountSettingsVerifyButton}.game-button`, {
  width: '100%',
});

globalStyle(`${classes.accountSettingsResend}`, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: '0 0.35rem',
  color: vars.muted,
  fontSize: vars.textStatus,
});

globalStyle(`${classes.accountSettingsResend} [role='status']`, {
  flexBasis: '100%',
  color: vars.navy,
  textAlign: 'center',
});

globalStyle(`${classes.accountSettingsDetails} > summary`, {
  width: 'max-content',
  color: vars.navy,
  cursor: 'pointer',
  fontSize: vars.textStatus,
  fontWeight: '700',
});

globalStyle(`${classes.accountSettingsDetails} > summary:focus-visible`, {
  outline: `3px solid ${vars.focus}`,
  outlineOffset: '2px',
});

globalStyle(`${classes.accountSettingsDetails} ${classes.backupSettings}`, {
  marginTop: '0.75rem',
});
