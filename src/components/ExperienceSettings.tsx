import type { Dispatch, SetStateAction } from 'react';
import type { Modifiers } from '@/game/types';
import { Checkbox } from './Checkbox';

interface ExperienceSettingsProps {
  draft: Modifiers;
  onChange: Dispatch<SetStateAction<Modifiers>>;
}

export const ExperienceSettings = ({
  draft,
  onChange,
}: ExperienceSettingsProps) => (
  <fieldset>
    <legend>Play experience</legend>
    <div className="modifier-list">
      <Checkbox
        checked={draft.speedrunMode}
        description="Shorten the answer reveal before the next question."
        label="Quick transitions"
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            speedrunMode: event.target.checked,
          }))
        }
      />
      <Checkbox
        checked={draft.soundEnabled}
        description="Play button and results sounds."
        label="Sound effects"
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            soundEnabled: event.target.checked,
          }))
        }
      />
    </div>
  </fieldset>
);
