import { vars } from '../../styles/theme.css.ts';
import { globalStyle } from '@vanilla-extract/css';
import * as classes from '../../styles/classes.css.ts';

globalStyle(`${classes.settingsForm}`, {
  display: 'flex',
  minHeight: '0',
  flex: '1',
  flexDirection: 'column',
});

globalStyle(`${classes.settingsFormBody}`, {
  minHeight: '0',
  padding: '1.05rem 1.2rem 0.45rem',
  flex: '1',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
});

globalStyle(`${classes.settingsForm} fieldset`, {
  padding: '0',
  margin: '0 0 1.25rem',
  border: '0',
});

globalStyle(
  `${classes.settingsForm} legend,
${classes.settingsSectionHeading} h3`,
  { margin: '0', color: vars.navy, fontSize: 'inherit', fontWeight: '800' },
);

globalStyle(
  `${classes.settingsSection},
${classes.questionTypeSettings}`,
  { marginBottom: '1.25rem' },
);

globalStyle(`${classes.settingsSection} > ${classes.settingsNote}`, {
  marginTop: '0.75rem',
});

globalStyle(`${classes.settingsSectionHeading}`, {
  display: 'flex',
  marginBottom: '0.75rem',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '0.75rem',
});

globalStyle(`${classes.questionTypeGroup}`, {
  borderTop: `2px solid color-mix(in srgb, ${vars.navy} 18%, transparent)`,
});

globalStyle(`${classes.questionTypeGroup} h4`, { margin: '0' });

globalStyle(`${classes.questionTypeGroupDisclosure}`, {
  display: 'grid',
  width: '100%',
  minHeight: '3.4rem',
  padding: '0.65rem 0.2rem',
  alignItems: 'center',
  color: vars.navy,
  background: 'transparent',
  border: '0',
  font: 'inherit',
  fontWeight: '800',
  textAlign: 'left',
  cursor: 'pointer',
  gridTemplateColumns: 'minmax(0, 1fr) auto 1.25rem',
  gap: '0.55rem',
});

globalStyle(`${classes.questionTypeGroupDisclosure}:hover`, {
  color: vars.blue,
});

globalStyle(`${classes.questionTypeGroupDisclosure} svg`, {
  width: '1.25rem',
  height: '1.25rem',
  transition: 'transform 120ms ease',
});

globalStyle(
  `${classes.questionTypeGroup}[open] ${classes.questionTypeGroupDisclosure} svg`,
  { transform: 'rotate(180deg)' },
);

globalStyle(`${classes.questionTypeGroupCount}`, {
  color: vars.muted,
  fontFamily: vars.fontData,
  fontSize: vars.textSmall,
  letterSpacing: '0.02em',
});

globalStyle(`${classes.questionTypeGroupPanel}`, { padding: '0.1rem 0 1rem' });

globalStyle(`${classes.selectionToggle}`, {
  minHeight: '2.75rem',
  padding: '0.35rem 0.65rem',
  flex: 'none',
  color: vars.navy,
  background: vars.cream,
  border: `2px solid ${vars.navy}`,
  borderRadius: '0.3rem',
  boxShadow: `0 0.12rem 0 ${vars.yellow}`,
  font: 'inherit',
  fontSize: vars.textLabel,
  fontWeight: '800',
  cursor: 'pointer',
});

globalStyle(`${classes.selectionToggle}:hover`, { filter: 'brightness(1.03)' });

globalStyle(`${classes.selectionToggle}:active`, {
  boxShadow: 'none',
  transform: 'translateY(0.12rem)',
});

globalStyle(`${classes.selectionGrid}`, { display: 'grid', gap: '0.65rem' });

globalStyle(`${classes.selectionGridGenerations}`, {
  width: '100%',
  gridTemplateColumns: 'repeat(9, minmax(0, 1fr))',
});

globalStyle(`${classes.selectionGridQuestionTypes}`, {
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: '0.5rem',
});

globalStyle(`.selection-tile`, {
  position: 'relative',
  display: 'block',
  minWidth: '0',
  cursor: 'pointer',
});

globalStyle(
  `.selection-tile input,
.checkbox input`,
  { position: 'absolute', width: '1px', height: '1px', opacity: '0' },
);

globalStyle(`${classes.selectionTileSurface}`, {
  position: 'relative',
  display: 'grid',
  minHeight: '3.15rem',
  padding: '0.6rem 1.75rem 0.6rem 0.7rem',
  alignContent: 'center',
  color: vars.navy,
  background: vars.paper,
  border: `2px solid ${vars.navy}`,
  borderRadius: '0.38rem',
  boxShadow: `0 0.14rem 0 ${vars.navyShadow}`,
  transition:
    'transform 100ms ease,\n    box-shadow 100ms ease,\n    filter 100ms ease',
});

globalStyle(
  `${classes.selectionTileGeneration} ${classes.selectionTileSurface}`,
  { minHeight: '3rem', padding: '0.55rem 0.35rem', justifyItems: 'center' },
);

globalStyle(`${classes.selectionTileLabel}`, {
  minWidth: '0',
  fontWeight: '800',
  lineHeight: '1.15',
});

globalStyle(`${classes.selectionTileDescription}`, {
  marginTop: '0.22rem',
  color: vars.muted,
  fontSize: vars.textSmall,
  fontWeight: '700',
  lineHeight: '1.25',
});

globalStyle(
  `.selection-tile
  input:checked
  + ${classes.selectionTileSurface}
  ${classes.selectionTileDescription}`,
  { color: vars.primaryText },
);

globalStyle(
  `${classes.selectionGridQuestionTypes} ${classes.selectionTileLabel}`,
  { fontSize: vars.textCompactControl, gridColumn: '2', gridRow: '1' },
);

globalStyle(
  `${classes.selectionGridQuestionTypes} ${classes.selectionTileSurface}`,
  {
    minHeight: '3.15rem',
    padding: '0.65rem 3.25rem 0.65rem 0.75rem',
    alignItems: 'center',
    gridTemplateColumns: '1.1rem minmax(0, 1fr) auto',
    gap: '0.75rem',
  },
);

globalStyle(
  `${classes.selectionGridQuestionTypes} ${classes.selectionTileDescription}`,
  {
    margin: '0',
    gridColumn: '3',
    gridRow: '1',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
  },
);

globalStyle(
  `${classes.selectionGridQuestionTypes} ${classes.selectionTileLabel}`,
  { overflowWrap: 'anywhere' },
);

globalStyle(
  `${classes.selectionGridQuestionTypes} ${classes.selectionTileCheck}`,
  {
    position: 'relative',
    top: 'auto',
    right: 'auto',
    width: '1rem',
    height: '1rem',
    gridColumn: '1',
    gridRow: '1',
    transform: 'none',
  },
);

globalStyle(
  `${classes.selectionTileGeneration} ${classes.selectionTileLabel}`,
  { fontSize: vars.textLabel },
);

globalStyle(
  `${classes.selectionTileGeneration} ${classes.selectionTileCheck}`,
  {
    top: 'auto',
    right: '0.42rem',
    bottom: '0.38rem',
    width: '0.8rem',
    height: '0.8rem',
  },
);

globalStyle(`${classes.selectionTileCheck}`, {
  position: 'absolute',
  top: '0.52rem',
  right: '0.55rem',
  display: 'grid',
  width: '1rem',
  height: '1rem',
  opacity: '0',
  color: vars.yellow,
  placeItems: 'center',
});

globalStyle(`${classes.selectionTileCheck} svg`, {
  width: '100%',
  height: '100%',
});

globalStyle(`.selection-tile input:checked + ${classes.selectionTileSurface}`, {
  color: vars.primaryText,
  background: vars.blue,
  boxShadow: `0 0.16rem 0 ${vars.yellow},
    0 0.28rem 0 ${vars.navyShadow}`,
});

globalStyle(
  `.selection-tile
  input:checked
  + ${classes.selectionTileSurface}
  ${classes.selectionTileCheck}`,
  { opacity: '1' },
);

globalStyle(
  `.selection-tile input:focus-visible + ${classes.selectionTileSurface}`,
  { outline: `0.2rem solid ${vars.focus}`, outlineOffset: '0.16rem' },
);

globalStyle(`.selection-tile:hover ${classes.selectionTileSurface}`, {
  filter: 'brightness(1.03)',
});

globalStyle(`.selection-tile:active ${classes.selectionTileSurface}`, {
  boxShadow: `0 0.08rem 0 ${vars.navyShadow}`,
  transform: 'translateY(0.12rem)',
});

globalStyle(
  `.selection-tile input:disabled + ${classes.selectionTileSurface}`,
  { cursor: 'not-allowed', filter: 'grayscale(0.4)', opacity: '0.6' },
);

globalStyle(
  `${classes.selectionTileTrainingMode} ${classes.selectionTileSurface}`,
  {
    minHeight: '3rem',
    padding: '0.55rem 0.7rem',
    justifyItems: 'center',
    textAlign: 'center',
  },
);

globalStyle(
  `${classes.selectionTileTrainingMode} ${classes.selectionTileCheck}`,
  { display: 'none' },
);

globalStyle(`${classes.experienceSettings}`, { display: 'grid' });

globalStyle(`${classes.settingsForm} ${classes.experienceSetting}`, {
  marginBottom: '1rem',
});

globalStyle(
  `${classes.settingsForm} ${classes.experienceSetting}:first-child`,
  {
    paddingBottom: '1rem',
    borderBottom: `2px solid color-mix(in srgb, ${vars.navy} 18%, transparent)`,
  },
);

globalStyle(`${classes.settingsForm} ${classes.experienceSettingInstall}`, {
  paddingTop: '1rem',
  borderTop: `2px solid color-mix(in srgb, ${vars.navy} 18%, transparent)`,
});

globalStyle(
  `${classes.settingsForm} ${classes.experienceSetting}:first-child + ${classes.experienceSettingInstall}`,
  { paddingTop: '0', borderTop: '0' },
);

globalStyle(`${classes.experienceOptions}`, {
  display: 'grid',
  marginTop: '0.7rem',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '0.55rem',
});

globalStyle(
  `${classes.selectionTileExperience} ${classes.selectionTileSurface}`,
  {
    minHeight: '4.5rem',
    padding: '0.55rem 0.4rem',
    alignContent: 'center',
    justifyItems: 'center',
    gap: '0.2rem',
    textAlign: 'center',
  },
);

globalStyle(
  `${classes.selectionTileExperience} ${classes.selectionTileCheck}`,
  { display: 'none' },
);

globalStyle(
  `${classes.selectionTileExperience} ${classes.selectionTileLabel}`,
  { fontSize: vars.textCompactControl },
);

globalStyle(
  `${classes.selectionTileExperience} ${classes.selectionTileDescription}`,
  { margin: '0', fontSize: vars.textMini, lineHeight: '1.2' },
);

globalStyle(
  `${classes.experienceOptionsTimer} ${classes.selectionTileSurface}`,
  { minHeight: '3rem', paddingInline: '0.2rem' },
);

globalStyle(`${classes.experienceOptionsTimer} ${classes.selectionTileLabel}`, {
  fontSize: vars.textSmall,
});

globalStyle(`${classes.volumeControl}`, {
  display: 'grid',
  minHeight: '3.75rem',
  marginTop: '0.55rem',
  alignItems: 'center',
  color: vars.ink,
  fontWeight: '700',
  cursor: 'pointer',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  columnGap: '0.75rem',
});

globalStyle(`${classes.volumeControl} output`, {
  color: vars.navy,
  fontFamily: vars.fontData,
  fontSize: vars.textLabel,
  fontWeight: '800',
});

globalStyle(`${classes.volumeControl} input`, {
  width: '100%',
  height: '2rem',
  margin: '0',
  accentColor: vars.blue,
  cursor: 'pointer',
  gridColumn: '1 / -1',
});

globalStyle(`${classes.volumeControl} input:focus-visible`, {
  outline: `0.2rem solid ${vars.focus}`,
  outlineOffset: '0.1rem',
});

globalStyle(`${classes.reminderTimeControl}`, {
  display: 'grid',
  width: 'max-content',
  maxWidth: '100%',
  marginTop: '0.55rem',
  justifyItems: 'start',
  gap: '0.25rem',
  color: vars.ink,
  fontWeight: '700',
});

globalStyle(`${classes.reminderTimeControl} > span`, {
  fontSize: vars.textLabel,
  lineHeight: '1.35',
});

globalStyle(`${classes.reminderTimeControl} input`, {
  boxSizing: 'border-box',
  maxWidth: '100%',
  minHeight: '2.8rem',
  padding: '0.45rem 0.6rem',
  border: `2px solid ${vars.navy}`,
  borderRadius: '0.3rem',
  background: vars.paper,
  color: vars.ink,
  font: 'inherit',
  fontVariantNumeric: 'tabular-nums',
});

globalStyle(`${classes.reminderTimeControl} input:focus-visible`, {
  outline: `0.2rem solid ${vars.focus}`,
  outlineOffset: '0.1rem',
});

globalStyle(`${classes.experienceStatus}`, {
  margin: '0.55rem 0 0',
  color: vars.muted,
  fontSize: vars.textLabel,
  lineHeight: '1.35',
});

globalStyle(`${classes.experienceStatusError}`, { color: vars.errorInk });

globalStyle(`${classes.questionTypeTile}`, {
  position: 'relative',
  minWidth: '0',
});

globalStyle(`${classes.questionTypeTileHelp}`, {
  position: 'absolute',
  zIndex: '1',
  top: '50%',
  right: '0.2rem',
  transform: 'translateY(-50%)',
  display: 'grid',
  width: '2.75rem',
  height: '2.75rem',
  padding: '0',
  color: vars.navy,
  background: 'transparent',
  border: '0',
  font: 'inherit',
  fontWeight: '800',
  cursor: 'help',
  placeItems: 'center',
});

globalStyle(`${classes.questionTypeTileHelp} > span`, {
  display: 'grid',
  width: '1.8rem',
  height: '1.8rem',
  placeItems: 'center',
});

globalStyle(
  `${classes.questionTypeTileHelp} svg,
${classes.questionTypeHelpClose} svg`,
  { width: '1.25rem', height: '1.25rem' },
);

globalStyle(
  `${classes.questionTypeTileSelected} ${classes.questionTypeTileHelp} > span`,
  { color: vars.primaryText },
);

globalStyle(
  `${classes.questionTypeTileUnavailable} ${classes.questionTypeTileHelp} > span`,
  { color: vars.muted },
);

globalStyle(`${classes.questionTypeTileHelp}:hover`, {
  filter: 'brightness(1.08)',
});

globalStyle(`${classes.questionTypeTileHelp}:focus-visible`, {
  outline: `0.2rem solid ${vars.focus}`,
  outlineOffset: '0.14rem',
});

globalStyle(`${classes.questionTypeHelp}[popover]`, {
  width: 'min(22rem, calc(100vw - 2rem))',
  padding: '1rem 3.25rem 1rem 1rem',
  color: vars.ink,
  background: vars.paper,
  border: `3px solid ${vars.navy}`,
  borderRadius: '0.55rem',
  boxShadow: `0 0.22rem 0 ${vars.yellow},
    0 0.48rem 0 ${vars.navyShadow}`,
});

globalStyle(`${classes.questionTypeHelp} strong`, {
  color: vars.navy,
  fontSize: vars.textBody,
});

globalStyle(`${classes.questionTypeHelp} p`, {
  margin: '0.3rem 0 0',
  color: vars.muted,
  fontSize: vars.textLabel,
  lineHeight: '1.4',
});

globalStyle(`${classes.questionTypeHelpClose}`, {
  position: 'absolute',
  top: '0.25rem',
  right: '0.25rem',
  display: 'grid',
  width: '2.75rem',
  height: '2.75rem',
  padding: '0',
  color: vars.navy,
  background: 'transparent',
  border: '0',
  cursor: 'pointer',
  placeItems: 'center',
});

globalStyle(`.checkbox`, {
  position: 'relative',
  display: 'grid',
  minWidth: '0',
  minHeight: '2.75rem',
  paddingBlock: '0.35rem',
  gridTemplateColumns: '1.35rem 1fr',
  gap: '0.55rem',
  alignItems: 'start',
  cursor: 'pointer',
});

globalStyle(`${classes.checkboxControl}`, {
  display: 'grid',
  width: '1.35rem',
  height: '1.35rem',
  marginTop: '0.05rem',
  background: 'white',
  border: `2px solid ${vars.navy}`,
  borderRadius: '0.2rem',
  placeItems: 'center',
});

globalStyle(`.checkbox input:checked + ${classes.checkboxControl}`, {
  background: vars.blue,
});

globalStyle(`${classes.checkboxControl} svg`, {
  width: '0.9rem',
  height: '0.9rem',
  color: 'white',
  opacity: '0',
});

globalStyle(`.checkbox input:checked + ${classes.checkboxControl} svg`, {
  opacity: '1',
});

globalStyle(`.checkbox input:focus-visible + ${classes.checkboxControl}`, {
  outline: `0.2rem solid ${vars.focus}`,
  outlineOffset: '0.15rem',
});

globalStyle(`${classes.checkboxCopy}`, {
  display: 'grid',
  minWidth: '0',
  gap: '0.12rem',
});

globalStyle(`${classes.checkboxLabel}`, {
  color: vars.ink,
  fontWeight: '700',
});

globalStyle(`${classes.checkboxDescription}`, {
  color: vars.muted,
  fontSize: vars.textSmall,
  lineHeight: '1.3',
});

globalStyle(`${classes.formError}`, {
  padding: '0.65rem 0.75rem',
  margin: '0.7rem 0 0',
  color: vars.errorInk,
  background: vars.errorSurface,
  border: `2px solid ${vars.wrong}`,
  borderRadius: '0.3rem',
  fontSize: vars.textStatus,
  fontWeight: '700',
});

globalStyle(`${classes.settingsFormActions}`, {
  display: 'flex',
  padding: '0.85rem 1.2rem 1rem',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  gap: '0.65rem',
  background: vars.cream,
  borderTop: `2px solid ${vars.navy}`,
});

globalStyle(`${classes.backupSettings} p`, {
  margin: '0.6rem 0 0.85rem',
  color: vars.muted,
  lineHeight: '1.45',
});

globalStyle(`${classes.backupSettingsActions}`, {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.7rem',
});

globalStyle(`${classes.backupSettingsActions} > button`, { flex: '1 1 12rem' });

globalStyle(`${classes.backupSettingsPreview}`, {
  marginTop: '1.25rem',
  paddingTop: '1rem',
  borderTop: `2px solid ${vars.navy}`,
});

globalStyle(`${classes.backupSettingsPreview} h3`, {
  margin: '0',
  fontSize: vars.textBody,
});

globalStyle(`${classes.backupSettings} table`, {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: vars.textStatus,
});

globalStyle(
  `${classes.backupSettings} th,
${classes.backupSettings} td`,
  {
    padding: '0.5rem 0.25rem',
    borderBottom: `1px solid ${vars.muted}`,
    overflowWrap: 'anywhere',
    textAlign: 'start',
    verticalAlign: 'top',
  },
);

globalStyle(`${classes.backupSettings} p[role='alert']`, {
  color: vars.errorInk,
});

globalStyle(`${classes.installAction}`, {
  display: 'grid',
  minWidth: '0',
  gap: '0.7rem',
});

globalStyle(`${classes.installActionButtons}`, {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.45rem',
});

globalStyle(`${classes.installActionSteps}`, {
  display: 'grid',
  margin: '0',
  paddingInlineStart: '1.3rem',
  color: vars.navy,
  fontSize: vars.textSmall,
  lineHeight: '1.5',
  gap: '0.45rem',
});

globalStyle(`${classes.installDismiss}`, {
  minHeight: '2.75rem',
  padding: '0',
  color: vars.navy,
  background: 'transparent',
  border: '0',
  borderRadius: '0.25rem',
  font: 'inherit',
  cursor: 'pointer',
});

globalStyle(`${classes.installDismiss}`, {
  display: 'grid',
  width: '2.75rem',
  flex: 'none',
  placeItems: 'center',
});

globalStyle(`${classes.installDismiss}:hover`, { background: vars.sky });

globalStyle(`${classes.installDismiss} svg`, { width: '1rem', height: '1rem' });

globalStyle(`${classes.installDialog} ${classes.shareDialogHeader}`, {
  flex: 'none',
});

globalStyle(`${classes.installDialogBody}`, {
  overflowY: 'auto',
  overscrollBehavior: 'contain',
});

globalStyle(`${classes.installDialogBody} > p`, {
  color: vars.ink,
  fontSize: vars.textSmall,
  fontWeight: '400',
  lineHeight: '1.5',
});

globalStyle(`${classes.installDialog}`, {
  '@media': {
    '(max-width: 42rem)': {
      position: 'fixed',
      inset: 'auto 0 0',
      width: '100%',
      maxHeight: 'calc(100dvh - 1rem)',
      margin: '0',
      borderBottom: '0',
      borderRadius: '0.75rem 0.75rem 0 0',
      boxShadow: 'none',
    },
  },
});

globalStyle(`${classes.installDialogBody}`, {
  '@media': {
    '(max-width: 42rem)': {
      paddingBottom: 'max(1.2rem, env(safe-area-inset-bottom))',
    },
  },
});

globalStyle(`${classes.selectionGridForms}`, {
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
});

globalStyle(`${classes.selectionTileForm} ${classes.selectionTileSurface}`, {
  height: '100%',
  overflowWrap: 'anywhere',
});

globalStyle(
  `${classes.selectionTileForm} input:disabled + ${classes.selectionTileSurface},
${classes.selectionTileQuestionType} input:disabled + ${classes.selectionTileSurface}`,
  {
    color: vars.muted,
    background: vars.disabledSurface,
    opacity: '1',
    filter: 'none',
  },
);

globalStyle(`${classes.levelSettings}`, {
  border: '0',
  padding: '0',
  margin: '0 0 1.5rem',
});

globalStyle(`${classes.levelSettings} legend`, {
  fontWeight: '700',
  marginBottom: '0.75rem',
});

globalStyle(`${classes.levelControl}`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: '0.5rem',
});

globalStyle(`${classes.levelControl} .selection-tile`, { minWidth: '0' });

globalStyle(`${classes.trainingMultiplier}`, {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '1rem',
  margin: '0 0 1.25rem',
  paddingBlock: '0.5rem',
  borderBottom: `2px solid ${vars.navy}`,
  color: vars.navy,
  fontWeight: '800',
});

globalStyle(`${classes.trainingMultiplier} strong`, {
  font: `800 1.25rem / 1.2 ${vars.fontData}`,
});

globalStyle(`${classes.saveRecovery}`, {
  width: 'min(34rem, calc(100vw - 2rem))',
  maxHeight: 'calc(100dvh - 2rem)',
  padding: '1.5rem',
  overflowY: 'auto',
  color: vars.navy,
  background: vars.cream,
  border: `3px solid ${vars.navy}`,
  borderRadius: '0.5rem',
});

globalStyle(`${classes.saveRecovery}::backdrop`, {
  background: vars.modalScrim,
});

globalStyle(`${classes.saveRecovery} h1`, {
  margin: '0 0 1rem',
  fontSize: vars.textHeadline,
  outline: 'none',
});

globalStyle(`${classes.saveRecovery} h2`, { fontSize: vars.textBody });

globalStyle(`${classes.saveRecovery} p`, {
  fontSize: vars.textBody,
  lineHeight: '1.5',
});

globalStyle(`${classes.saveRecovery} a`, {
  color: vars.navy,
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
});

globalStyle(`${classes.saveRecoveryActions}`, {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
});

globalStyle(`${classes.saveRecoveryConfirmation}`, { marginTop: '1.5rem' });

globalStyle(`${classes.saveRecovery} details`, { marginTop: '1.5rem' });

globalStyle(`${classes.saveRecovery} summary`, { cursor: 'pointer' });

globalStyle(`${classes.settingsBackup}`, {
  marginBlock: '0.5rem 1rem',
  borderTop: `2px solid color-mix(in srgb, ${vars.navy} 18%, transparent)`,
});

globalStyle(`${classes.settingsBackup} > summary`, {
  paddingBlock: '0.85rem',
  color: vars.navy,
  fontWeight: '800',
  cursor: 'pointer',
});

globalStyle(`${classes.settingsBackup} > summary:focus-visible`, {
  outline: `3px solid ${vars.focus}`,
  outlineOffset: '2px',
});

globalStyle(`${classes.settingsBackup} ${classes.backupSettings} > legend`, {
  display: 'none',
});
