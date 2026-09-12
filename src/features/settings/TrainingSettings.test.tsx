import { defaultGameSettings } from '@/domain/settings/game-settings';
import type { GameSettings } from '@/domain/settings/types';
import { TrainingSettings } from '@/features/settings/TrainingSettings';
import { getTrainingSettingsValidation } from '@/features/settings/settings-validation';
import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { catalog } from '../../../tests/fixtures/catalog';

const TrainingSettingsHarness = ({ initial }: { initial: GameSettings }) => {
  const [draft, setDraft] = useState(initial);
  const generationsHeading = useRef<HTMLHeadingElement>(null);
  const formGroupsHeading = useRef<HTMLHeadingElement>(null);
  const questionTypesHeading = useRef<HTMLHeadingElement>(null);
  const validation = getTrainingSettingsValidation(catalog, draft);

  return (
    <TrainingSettings
      {...validation}
      draft={draft}
      generationsHeading={generationsHeading}
      formGroupsHeading={formGroupsHeading}
      onChange={setDraft}
      questionTypesHeading={questionTypesHeading}
      submitted={false}
      trainingChangesApplyNextGame={false}
    />
  );
};

describe('Training settings', () => {
  it('shows five numbered levels and retains generation and form controls', () => {
    render(<TrainingSettingsHarness initial={defaultGameSettings} />);
    expect(screen.getByRole('group', { name: 'Difficulty' })).toBeVisible();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: 'Level 1' })).toBeChecked();
    expect(screen.getByRole('group', { name: 'Generations' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Forms' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Question types' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('radio', { name: 'League' }),
    ).not.toBeInTheDocument();
  });

  it('shows question types only in Custom and preserves the selection', () => {
    render(
      <TrainingSettingsHarness
        initial={{
          ...defaultGameSettings,
          questionTypes: ['evolution-shift'],
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Customize questions' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Question types' }),
    ).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: 'Evolution shift' }),
    ).toBeChecked();

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Customize questions' }),
    );
    expect(
      screen.queryByRole('heading', { name: 'Question types' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Customize questions' }),
    );
    expect(
      screen.getByRole('checkbox', { name: 'Evolution shift' }),
    ).toBeChecked();
  });

  it('keeps Generation roundup selectable when fewer than two generations are selected', () => {
    render(
      <TrainingSettingsHarness
        initial={{
          ...defaultGameSettings,
          generations: ['I', 'II'],
          questionSelection: 'custom',
          questionTypes: ['generation-roundup'],
        }}
      />,
    );

    const roundup = screen.getByRole('checkbox', {
      name: 'Generation roundup',
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'II' }));
    expect(roundup).toBeEnabled();
    expect(roundup).toBeChecked();
    fireEvent.click(roundup);
    expect(roundup).not.toBeChecked();
    fireEvent.click(
      screen.getByRole('button', { name: 'Select all question types' }),
    );
    expect(roundup).toBeChecked();
  });
});

it('disables unavailable groups and restores both enabled and disabled preferences', () => {
  render(
    <TrainingSettingsHarness
      initial={{ ...defaultGameSettings, generations: ['VI'] }}
    />,
  );
  const mega = screen.getByRole('checkbox', { name: 'Mega' });
  const gmax = screen.getByRole('checkbox', { name: 'Gigantamax' });
  expect(mega).toBeEnabled();
  expect(mega).toBeChecked();
  expect(gmax).toBeDisabled();
  expect(gmax).not.toBeChecked();
  fireEvent.click(mega);
  fireEvent.click(screen.getByRole('checkbox', { name: 'VIII' }));
  expect(gmax).toBeEnabled();
  expect(gmax).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: 'VI' }));
  expect(mega).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: 'VI' }));
  expect(mega).toBeEnabled();
  expect(mega).not.toBeChecked();
});
