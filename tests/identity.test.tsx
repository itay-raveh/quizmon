import { fireEvent, screen } from '@testing-library/react';
import { renderQuestion } from './fixtures/question';
import { buildQuestions } from '@/game/game';
import { defaultModifiers, filterPokemon } from '@/game/modifiers';
import { formatPokemonName } from '@/game/format';
import { getQuestionPokemon } from '@/game/pokedex';
import { isQuestionData } from '@/game/question-lineup';
import { createSeededRandom } from '@/game/random';
import { buildSpriteMatchQuestion } from '@/game/questions/identity';
import type { QuestionType } from '@/game/types';
import { catalog } from './fixtures/catalog';

const generate = (questionType: QuestionType) => {
  const questions = buildQuestions(
    catalog,
    { ...defaultModifiers, questionTypes: [questionType], generations: ['I'] },
    createSeededRandom('reverse-identity'),
    1,
  );
  expect(questions).toHaveLength(1);
  return questions[0]!;
};

for (const questionType of ['sprite-match', 'whos-that-pokemon'] as const) {
  it(`${questionType} generates a valid, repeatable question in the selected generation`, () => {
    const question = generate(questionType);
    expect(generate(questionType)).toEqual(question);
    expect(question.questionType).toBe(questionType);
    expect(isQuestionData(question)).toBe(true);
    expect(new Set(question.options).size).toBe(4);
    expect(question.answer.correctOptions).toEqual([question.pokemonName]);
    expect(question.repetition.subjects).toEqual([question.pokemonName]);
    expect(getQuestionPokemon(question)).toEqual([question.pokemonName]);
    expect(new Set(getQuestionPokemon(question, true))).toEqual(
      new Set(question.options),
    );
    for (const name of question.options) {
      expect(catalog.pokemon[name]?.generation).toBe('I');
    }
    if (questionType === 'sprite-match') {
      expect(question.prompt).toMatchObject({
        kind: 'pokemon',
        name: question.pokemonName,
      });
      expect(question.media.kind).toBe('none');
      expect(question.concealOptionLabels).toBe(true);
      for (const name of question.options) {
        expect(question.optionVisuals?.[name]).toMatchObject({
          src: catalog.pokemon[name]?.sprite,
          silhouette: false,
        });
      }
    } else {
      expect(question.media).toEqual({
        kind: 'sprite',
        silhouette: true,
        src: catalog.pokemon[question.pokemonName]?.sprite,
      });
      expect(question.optionVisuals).toBeUndefined();
    }
  });

  it.each([true, false])(
    `${questionType} conceals and reveals correctly (correct: %s)`,
    (correct) => {
      const question = generate(questionType);
      const onAnswer = vi.fn();
      const { container } = renderQuestion({ question, onAnswer });
      const selected = question.options.findIndex(
        (name) => (name === question.pokemonName) === correct,
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
