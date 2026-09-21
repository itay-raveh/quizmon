import { formatPokemonName } from '@/domain/pokemon/format';
import { buildQuestions } from '@/domain/quiz/question-generation';
import { buildSpriteMatchQuestion } from '@/domain/quiz/questions/identity';
import type { QuestionType } from '@/domain/quiz/types';
import {
  defaultGameSettings,
  filterPokemon,
} from '@/domain/settings/game-settings';
import { createSeededRandom } from '@/lib/random';
import { fireEvent, screen } from '@testing-library/react';
import { catalog } from '../../../tests/fixtures/catalog';
import { renderQuestion } from '../../../tests/fixtures/question';
const generate = (questionType: QuestionType) => {
  const questions = buildQuestions(
    catalog,
    {
      ...defaultGameSettings,
      difficulty: undefined,
      questionTypes: [questionType],
      generations: ['I'],
    },
    createSeededRandom('reverse-identity'),
    1,
  );
  expect(questions).toHaveLength(1);
  return questions[0]!;
};
for (const questionType of ['sprite-match', 'whos-that-pokemon'] as const) {
  it.each([true, false])(
    `${questionType} conceals and reveals correctly (correct: %s)`,
    (correct) => {
      const question = generate(questionType);
      const onAnswer = vi.fn();
      const { container } = renderQuestion({ question, onAnswer });
      const selected = question.options.findIndex(
        (name) => (name === question.subject.name) === correct,
      );
      if (questionType === 'sprite-match') {
        expect(
          screen.getAllByRole('button', { name: /^Sprite [1-4]$/ }),
        ).toHaveLength(4);
        expect(
          container.querySelectorAll('.answer__sprite--silhouette'),
        ).toHaveLength(0);
        for (const name of question.options) {
          expect(
            screen.queryByRole('button', { name: formatPokemonName(name) }),
          ).not.toBeInTheDocument();
        }
        for (const nameplate of container.querySelectorAll(
          '.answer__nameplate',
        )) {
          expect(nameplate).not.toBeVisible();
          expect(nameplate).toHaveAttribute('aria-hidden', 'true');
        }
      } else {
        expect(
          screen.getByRole('img', { name: 'Mystery Pokémon silhouette' }),
        ).toHaveClass('sprite--silhouette');
        expect(container.querySelectorAll('.answer img')).toHaveLength(0);
      }
      fireEvent.keyDown(window, { key: String(selected + 1) });
      for (const name of question.options) {
        expect(
          screen.getByRole('button', { name: formatPokemonName(name) }),
        ).toBeDisabled();
      }
      expect(container.querySelectorAll('.sprite--silhouette')).toHaveLength(0);
      fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ correct, questionType }),
      );
    },
  );
}
it('builds sprite choices only from Pokémon with available sprites', () => {
  const pool = filterPokemon(catalog, { generations: ['I'] })
    .slice(0, 8)
    .map((candidate, index) => ({
      ...candidate,
      pokemon: {
        ...candidate.pokemon,
        sprite: index < 4 ? candidate.pokemon.sprite : null,
      },
    }));
  const limitedCatalog = {
    ...catalog,
    pokemon: Object.fromEntries(
      pool.map(({ name, pokemon }) => [name, pokemon]),
    ),
  };
  const question = buildSpriteMatchQuestion({
    catalog: limitedCatalog,
    pool,
    used: new Set(),
    random: createSeededRandom('missing-sprites'),
  });
  expect(question?.options).toHaveLength(4);
  expect(Object.keys(question?.optionVisuals ?? {})).toHaveLength(4);
});
