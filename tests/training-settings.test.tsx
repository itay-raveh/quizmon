import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import catalogData from '@/game/data/pokemon.json';
import { defaultModifiers } from '@/game/game';
import type { Modifiers, PokemonCatalog } from '@/game/types';
import { TrainingSettings } from '@/components/TrainingSettings';
import { getTrainingSettingsValidation } from '@/components/trainingSettingsModel';

const catalog = catalogData as PokemonCatalog;

const TrainingSettingsHarness = ({ initial }: { initial: Modifiers }) => {
  const [draft, setDraft] = useState(initial);
  const generationsHeading = useRef<HTMLHeadingElement>(null);
  const questionTypesHeading = useRef<HTMLHeadingElement>(null);
  const validation = getTrainingSettingsValidation(catalog, draft);

  return (
    <TrainingSettings
      {...validation}
      draft={draft}
      generationsHeading={generationsHeading}
      onChange={setDraft}
      questionTypesHeading={questionTypesHeading}
      submitted={false}
      trainingChangesApplyNextGame={false}
    />
  );
};

describe('Training settings', () => {
  it('uses a League or Custom control with no round-length setting', () => {
    render(<TrainingSettingsHarness initial={defaultModifiers} />);

    const trainingMode = screen.getByRole('group', { name: 'Training mode' });
    expect(trainingMode).toBeVisible();
    expect(screen.getByRole('radio', { name: 'League' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Custom' })).not.toBeChecked();
    expect(
      screen.queryByRole('group', { name: 'Round length' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Question types' }),
    ).not.toBeInTheDocument();
    const generationsPicker = screen.getByRole('group', {
      name: 'Generations',
    });
    const modeDescription = screen.getByText(
      /10 questions with every question type/,
    );

    expect(modeDescription).toBeVisible();
    expect(generationsPicker.nextElementSibling).toBe(modeDescription);
    expect(
      generationsPicker.closest('.settings-section')?.nextElementSibling,
    ).toBe(trainingMode);
  });

  it('shows question types only in Custom and preserves the selection', () => {
    render(
      <TrainingSettingsHarness
        initial={{
          ...defaultModifiers,
          questionTypes: ['evolution-shift'],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(
      screen.getByRole('heading', { name: 'Question types' }),
    ).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: 'Evolution shift' }),
    ).toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: 'League' }));
    expect(
      screen.queryByRole('heading', { name: 'Question types' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(
      screen.getByRole('checkbox', { name: 'Evolution shift' }),
    ).toBeChecked();
  });
});
