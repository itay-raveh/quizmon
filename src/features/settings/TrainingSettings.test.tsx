import { defaultGameSettings } from '@/domain/settings/game-settings';
import { generations } from '@/domain/pokemon/types';
import type { GameSettings } from '@/domain/settings/types';
import { QuestionTypeSettings } from '@/features/settings/QuestionTypeSettings';
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

describe('Training settings', { timeout: 15_000 }, () => {
  it.each([true, false])(
    'restores question selection %s after an unavailable difficulty',
    (selected) => {
      const initial: GameSettings = {
        ...defaultGameSettings,
        difficulty: 4,
        generations: [...generations],
        questionSelection: 'custom',
        questionTypes: selected
          ? ['hidden-abilities', 'move-types']
          : ['move-types'],
      };
      const onChange = vi.fn();
      const picker = (difficulty: GameSettings['difficulty']) => (
        <QuestionTypeSettings
          availableQuestionTypes={
            getTrainingSettingsValidation(catalog, { ...initial, difficulty })
              .availableQuestionTypes
          }
          draft={{ ...initial, difficulty }}
          heading={{ current: null }}
          matchingCount={10}
          questionTypesAreValid
          submitted={false}
          onChange={onChange}
        />
      );
      const { rerender } = render(picker(4));
      const hiddenAbilities = screen.getByLabelText('Hidden abilities', {
        selector: 'input',
      });
      expect(hiddenAbilities).toBeEnabled();
      expect(hiddenAbilities).toHaveProperty('checked', selected);
      expect(hiddenAbilities).toHaveAccessibleDescription('×1.25');

      rerender(picker(3));
      expect(hiddenAbilities).toBeDisabled();
      expect(hiddenAbilities).not.toBeChecked();
      expect(hiddenAbilities).toHaveAccessibleDescription('Unavailable');
      expect(
        screen.getByLabelText('Move types', { selector: 'input' }),
      ).toHaveAccessibleDescription('×1');

      rerender(picker(4));
      expect(hiddenAbilities).toBeEnabled();
      expect(hiddenAbilities).toHaveProperty('checked', selected);
      expect(hiddenAbilities).toHaveAccessibleDescription('×1.25');
      expect(onChange).not.toHaveBeenCalled();
    },
  );

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
          difficulty: 5,
          questionTypes: ['evolution-shift'],
        }}
      />,
    );

    fireEvent.click(
      screen.getByLabelText('Customize questions', { selector: 'input' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Question types' }),
    ).toBeVisible();
    expect(
      screen.getByLabelText('Evolution shift', { selector: 'input' }),
    ).toBeChecked();

    fireEvent.click(
      screen.getByLabelText('Customize questions', { selector: 'input' }),
    );
    expect(
      screen.queryByRole('heading', { name: 'Question types' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText('Customize questions', { selector: 'input' }),
    );
    expect(
      screen.getByLabelText('Evolution shift', { selector: 'input' }),
    ).toBeChecked();
  });

  it('disables Generation roundup with one generation and restores its saved selection', () => {
    render(
      <TrainingSettingsHarness
        initial={{
          ...defaultGameSettings,
          difficulty: 3,
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
    expect(roundup).toBeDisabled();
    expect(roundup).not.toBeChecked();
    expect(
      screen.queryByText(/Some selected questions are unavailable/),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'II' }));
    expect(roundup).toBeEnabled();
    expect(roundup).toBeChecked();
  });

  it('selects only available question types with Select all', () => {
    render(
      <TrainingSettingsHarness
        initial={{
          ...defaultGameSettings,
          difficulty: 3,
          questionSelection: 'custom',
          questionTypes: ['pokedex-scan'],
        }}
      />,
    );
    const roundup = screen.getByLabelText('Generation roundup', {
      selector: 'input',
    });
    expect(roundup).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Select all question types' }),
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'II' }));
    expect(roundup).toBeEnabled();
    expect(roundup).not.toBeChecked();
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
