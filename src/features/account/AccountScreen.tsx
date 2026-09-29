import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type SubmitEvent,
} from 'react';
import { useNavigate } from 'react-router';
import { GameButton } from '../../components/GameButton';
import { PencilSimpleIcon } from '../../components/icons';
import { friendInvitePath } from '../../domain/social/friends';
import { TRAINER_NAME_MAX_LENGTH } from '../../domain/player/trainer-profile';
import { FriendsPanel } from '../friends/FriendsPanel';
import { useModalDialog } from '../../hooks/useModalDialog';
import {
  readStoredValue,
  removeStoredValue,
} from '../../lib/storage/browser-storage';
import { AccountSettings } from './AccountSettings';
import { accountReturnPath } from './account-navigation';
import {
  accountSnapshot,
  accountWelcomeKey,
  subscribeAccount,
} from './account';

const WelcomeTrainerDialog = ({
  onContinue,
  onEditCard,
}: {
  onContinue: () => void;
  onEditCard: () => void;
}) => {
  const { dialog, dialogProps, closeDialog } = useModalDialog(onContinue);

  return (
    <dialog
      {...dialogProps}
      aria-describedby="welcome-trainer-description"
      aria-labelledby="welcome-trainer-title"
      className="confirm-dialog"
    >
      <div className="confirm-dialog__body">
        <h2 id="welcome-trainer-title">Welcome, Trainer!</h2>
        <p id="welcome-trainer-description">
          Other players can see your Trainer Card. Give it a name.
        </p>
        <div className="confirm-dialog__actions">
          <GameButton
            autoFocus
            onClick={() => {
              dialog.current?.close();
              onEditCard();
            }}
          >
            Edit card
          </GameButton>
          <GameButton tone="quiet" onClick={closeDialog}>
            Continue
          </GameButton>
        </div>
      </div>
    </dialog>
  );
};

export function AccountScreen({
  trainerName,
  onRename,
  onEditCard,
  onViewPlayer,
  friendId = '',
}: {
  trainerName: string;
  onRename: (name: string) => Promise<boolean>;
  onEditCard: () => void;
  onViewPlayer: (id: string) => void;
  friendId?: string;
}) {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const navigate = useNavigate();
  const signingIn = !account.owner && !account.mergeRequired;
  const hasTrainerName = Boolean(trainerName.trim());
  const [editingOwner, setEditingOwner] = useState<string | null>(null);
  const editingName = Boolean(account.owner && editingOwner === account.owner);
  const [nameDraft, setNameDraft] = useState(trainerName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const editNameButton = useRef<HTMLButtonElement>(null);
  const returnPath = friendId
    ? friendInvitePath(friendId)
    : accountReturnPath(window.location.href);
  const friendInvitation = returnPath.startsWith('/account/friends?id=');
  const heading = useRef<HTMLHeadingElement>(null);
  const [welcomeFor] = useState(() =>
    readStoredValue('sessionStorage', accountWelcomeKey),
  );
  const showWelcome =
    Boolean(account.owner) && welcomeFor === account.owner && !hasTrainerName;
  useEffect(() => {
    if (!showWelcome) heading.current?.focus();
  }, [showWelcome]);
  useEffect(() => {
    if (!account.owner || welcomeFor !== account.owner) return;
    removeStoredValue('sessionStorage', accountWelcomeKey);
    if (hasTrainerName) {
      void navigate(returnPath, { replace: true });
    }
  }, [account.owner, hasTrainerName, navigate, returnPath, welcomeFor]);
  const closeNameEditor = () => {
    editNameButton.current?.focus();
    setEditingOwner(null);
    setNameError('');
  };
  const saveName = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingName) return;
    setSavingName(true);
    setNameError('');
    try {
      if (await onRename(nameDraft)) closeNameEditor();
      else setNameError('Trainer name could not be saved. Try again.');
    } catch {
      setNameError('Trainer name could not be saved. Try again.');
    } finally {
      setSavingName(false);
    }
  };
  return (
    <>
      <section
        className="game-panel account-screen"
        aria-labelledby="account-title"
      >
        <header className="game-panel__header">
          <div className="account-screen__name-row">
            <h1
              className="game-panel__title"
              id="account-title"
              tabIndex={-1}
              ref={heading}
            >
              {signingIn ? 'Sign in' : trainerName.trim() || 'Account'}
            </h1>
            {!signingIn && !account.mergeRequired && (
              <GameButton
                aria-label={
                  editingName
                    ? 'Cancel editing trainer name'
                    : 'Edit trainer name'
                }
                className="game-button--icon-edit"
                disabled={savingName}
                onClick={() => {
                  if (editingName) {
                    closeNameEditor();
                    return;
                  }
                  setNameDraft(trainerName);
                  setNameError('');
                  setEditingOwner(account.owner);
                }}
                ref={editNameButton}
                tone="quiet"
              >
                <PencilSimpleIcon aria-hidden="true" weight="bold" />
              </GameButton>
            )}
          </div>
          {editingName && !signingIn && !account.mergeRequired && (
            <form
              className="account-screen__name-form"
              onKeyDown={(event) => {
                if (event.key === 'Escape' && !savingName) {
                  event.preventDefault();
                  closeNameEditor();
                }
              }}
              onSubmit={(event) => {
                void saveName(event);
              }}
            >
              <label htmlFor="account-trainer-name">Trainer name</label>
              <input
                autoComplete="nickname"
                autoFocus
                id="account-trainer-name"
                maxLength={TRAINER_NAME_MAX_LENGTH}
                onChange={(event) => setNameDraft(event.target.value)}
                type="text"
                value={nameDraft}
              />
              <div className="account-screen__name-actions">
                <GameButton disabled={savingName} type="submit">
                  Save
                </GameButton>
                <GameButton
                  disabled={savingName}
                  onClick={closeNameEditor}
                  tone="quiet"
                >
                  Cancel
                </GameButton>
              </div>
              {nameError && <p role="alert">{nameError}</p>}
            </form>
          )}
        </header>
        {signingIn && friendInvitation && (
          <p>
            A Trainer invited you to connect. Sign in or create an account to
            see their profile and choose whether to send a friend request.
          </p>
        )}
        {signingIn || account.mergeRequired ? (
          <AccountSettings />
        ) : (
          <div className="account-screen__sections">
            <details
              className="account-screen__section"
              open={Boolean(account.error)}
            >
              <summary>
                Settings, backup & sign out
                {(account.error || account.offline) && (
                  <small className="account-screen__sync-status">
                    {account.error
                      ? 'Sync needs attention'
                      : 'Waiting for connection'}
                  </small>
                )}
              </summary>
              <AccountSettings />
            </details>
            <details className="account-screen__section" open>
              <summary>Friends</summary>
              <FriendsPanel
                key={`${account.owner}:${friendId}`}
                owner={account.owner}
                initialInput={friendId}
                adding={Boolean(friendId)}
                onToggleAdding={() =>
                  void navigate('/account', { replace: true })
                }
                onViewPlayer={onViewPlayer}
              />
            </details>
          </div>
        )}
      </section>
      {showWelcome ? (
        <WelcomeTrainerDialog
          onEditCard={onEditCard}
          onContinue={() => {
            void navigate(returnPath, {
              replace: true,
            });
          }}
        />
      ) : null}
    </>
  );
}
