import { useEffect, useRef, useState } from 'react';
import { GameButton } from '../../components/GameButton';
import {
  trainerSpecialtyDetails,
  type TrainerSpecialty,
} from '../../domain/player/trainer-progression';
import { formatPokemonName } from '../../domain/pokemon/format';
import { trainerAvatarOptions } from '../../domain/player/trainer-avatars';
import { questionDefinitions } from '../../domain/quiz/questions/definitions';
import type { EditUnit, EditValue } from '../../domain/sync/progress';
import type { AccountIssue } from '../../lib/storage/account-issues';
import { isDailyDate, isRecord } from '../../lib/validation';

const labels: Record<EditUnit, string> = {
  avatar: 'Trainer avatar',
  name: 'Trainer name',
  partnerPokemon: 'Partner Pokémon',
  specialty: 'Trainer title',
  answerFlow: 'Answer flow',
  timerDisplay: 'Timer',
  training: 'Training settings',
};

function describeValue(unit: EditUnit, value: EditValue) {
  if (value === null || value === '') return 'None';
  if (typeof value === 'string') {
    if (unit === 'name') return value;
    if (unit === 'avatar')
      return trainerAvatarOptions.find(({ id }) => id === value)?.name ?? value;
    if (unit === 'specialty')
      return trainerSpecialtyDetails[value as TrainerSpecialty].label;
    return formatPokemonName(value);
  }
  return (
    <>
      <span>
        {value.difficulty
          ? `Level ${value.difficulty}`
          : `${formatPokemonName(value.trainingMode)} Training`}
      </span>
      <details>
        <summary>Configuration details</summary>
        <p>Generations: {value.generations.join(', ')}</p>
        <p>
          Forms: {value.formGroups?.map(formatPokemonName).join(', ') ?? 'All'}
        </p>
        <p>
          Questions:{' '}
          {value.questionSelection === 'custom' ||
          (!value.questionSelection && value.trainingMode === 'custom')
            ? 'Custom'
            : 'Automatic'}
        </p>
        <p>
          Question types:{' '}
          {value.questionTypes
            .map((type) => questionDefinitions[type].label)
            .join(', ')}
        </p>
      </details>
    </>
  );
}

export function AccountConflicts({
  issues,
  resolve,
  disabled,
}: {
  issues: AccountIssue[];
  resolve: (issue: AccountIssue, reapply: boolean) => Promise<void>;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const status = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) status.current?.focus();
  }, [message]);
  const choose = async (issue: AccountIssue, reapply: boolean) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await resolve(issue, reapply);
      setMessage(
        reapply
          ? 'Your edit is saved on this device.'
          : 'Your choice is saved on this device.',
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Your choice could not be saved. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="account-conflicts" aria-label="Sync review">
      {issues.length > 0 && <h3>Review changes</h3>}
      <p ref={status} tabIndex={-1} role="status" hidden={!message}>
        {message}
      </p>
      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}
      {issues.map((issue) => {
        const daily = issue.reason === 'daily_already_recorded';
        const date =
          daily &&
          isRecord(issue.payload) &&
          isDailyDate(issue.payload.dailyDate)
            ? issue.payload.dailyDate
            : undefined;
        return (
          <fieldset key={issue.operationId} className="experience-setting">
            <legend>
              {issue.edit
                ? labels[issue.edit.unit]
                : daily
                  ? `Daily result${date ? ` for ${date}` : ''}`
                  : 'Unsynced change'}
            </legend>
            {issue.edit ? (
              <>
                <p>
                  Another edit was accepted first. Choose which value to keep.
                </p>
                <dl className="account-conflicts__values">
                  <dt>Account value</dt>
                  <dd>{describeValue(issue.edit.unit, issue.edit.accepted)}</dd>
                  <dt>Conflicting edit</dt>
                  <dd>
                    {describeValue(issue.edit.unit, issue.edit.requested)}
                  </dd>
                </dl>
              </>
            ) : (
              <p>
                {daily
                  ? 'Your account already has a result for this Daily. The first accepted result counts toward progress. Discoveries from both rounds are kept.'
                  : issue.reason === 'edit_conflict'
                    ? 'This edit conflicted with another change. Sync to download the account value before reviewing it.'
                    : issue.reason === 'needs_review'
                      ? 'This saved edit needs review. You can apply it again to your account.'
                      : issue.reason === 'specialty_not_earned'
                        ? 'This Trainer title has not been earned on your account. Your accepted title is kept.'
                        : 'This change could not be accepted. Your backup includes the affected change.'}
              </p>
            )}
            {issue.resolving ? (
              <p>Resolution waiting to sync.</p>
            ) : (
              <div className="backup-settings__actions">
                <GameButton
                  tone="quiet"
                  disabled={disabled || busy}
                  onClick={() => void choose(issue, false)}
                >
                  {issue.edit ? 'Keep account value' : 'Dismiss'}
                </GameButton>
                {issue.reapplicable && (
                  <GameButton
                    tone="quiet"
                    disabled={disabled || busy}
                    onClick={() => void choose(issue, true)}
                  >
                    Apply this edit
                  </GameButton>
                )}
              </div>
            )}
          </fieldset>
        );
      })}
    </section>
  );
}
