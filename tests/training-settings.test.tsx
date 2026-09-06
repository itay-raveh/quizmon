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

    expect(
      generationsPicker.closest('.settings-section')?.nextElementSibling,
    ).toBe(trainingMode);
    expect(screen.queryByText(/10 questions/)).not.toBeInTheDocument();
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

  it('disables Generation roundup below two generations and restores its selection when available', () => {
    render(
      <TrainingSettingsHarness
        initial={{
          ...defaultModifiers,
          generations: ['I', 'II'],
          trainingMode: 'custom',
          questionTypes: ['generation-roundup'],
        }}
      />,
    );

    const roundup = screen.getByRole('checkbox', {
      name: 'Generation roundup',
    });
    expect(roundup).toBeEnabled();
    expect(roundup).toBeChecked();

    fireEvent.click(screen.getByRole('checkbox', { name: 'II' }));
    expect(roundup).toBeDisabled();
    expect(roundup).not.toBeChecked();
    expect(
      screen.getByRole('button', {
        name: /General knowledge\s*0 \/ 9\s*selected/,
      }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('checkbox', { name: 'I' }));
    expect(roundup).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'I' }));
    expect(roundup).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'II' }));
    expect(roundup).toBeEnabled();
    expect(roundup).toBeChecked();
  });

  it('selects only available question types with Select all', () => {
    render(
      <TrainingSettingsHarness
        initial={{
          ...defaultModifiers,
          generations: ['I'],
          trainingMode: 'custom',
          questionTypes: [],
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Select all question types' }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /General knowledge\s*8 \/ 9\s*selected/,
      }),
    );
    const roundup = screen.getByRole('checkbox', {
      name: 'Generation roundup',
    });
    expect(roundup).toBeDisabled();
    expect(roundup).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Evolution link' }),
    ).toBeChecked();

    fireEvent.click(
      screen.getByRole('button', { name: 'Deselect all question types' }),
    );
    expect(
      screen.getByRole('checkbox', { name: 'Evolution link' }),
    ).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'II' }));
    expect(roundup).toBeEnabled();
    expect(roundup).not.toBeChecked();
    fireEvent.click(
      screen.getByRole('button', { name: 'Select all question types' }),
    );
    expect(roundup).toBeChecked();
  });
});
