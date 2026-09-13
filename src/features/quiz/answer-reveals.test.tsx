import { formatPokedexNumber } from '@/domain/pokemon/format';
import { buildQuestions } from '@/domain/quiz/question-generation';
import { defaultGameSettings } from '@/domain/settings/game-settings';
import { createSeededRandom } from '@/lib/random';
import { render } from '@testing-library/react';
import { catalog } from '../../../tests/fixtures/catalog';
import { QuestionAnswers } from './QuestionAnswers';
import { QuestionArtwork } from './QuestionArtwork';

it.each([
  ['field-notes', 3],
  ['type-check', 4],
  ['type-twins', 4],
  ['legend-hunt', 4],
  ['generation-roundup', 4],
  ['evolution-shift', 4],
] as const)(
  '%s shows identity before submission except direct-answer clues',
  (questionType, difficulty) => {
    const [question] = buildQuestions(
      catalog,
      {
        ...defaultGameSettings,
        difficulty,
        generations: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'],
        questionTypes: [questionType],
      },
      createSeededRandom(`reveal:${questionType}`),
      1,
    );
    expect(question).toBeDefined();
    expect(question!.namesOnly).toBe(true);
    const content = (answered: boolean) => (
      <>
        <QuestionArtwork
          question={question!}
          answered={answered}
          cluesShown={0}
        />
        <QuestionAnswers
          question={question!}
          answered={answered}
          selectedOptions={[]}
          onSelect={vi.fn()}
        />
      </>
    );
    const { container, rerender } = render(content(false));
    const sources = Object.values(question!.optionVisuals ?? {}).map(
      ({ src }) => src,
    );
    const numbers = Object.values(question!.optionVisuals ?? {}).map(
      ({ dexNumber }) => dexNumber,
    );
    if (question!.prompt.kind === 'pokemon') {
      expect(question!.media.kind).toBe('pixel-sprite');
      if (question!.media.kind === 'pixel-sprite')
        sources.push(question!.media.src);
      numbers.push(question!.prompt.dexNumber);
    }
    for (const src of sources)
      expect(container.querySelector(`img[src="${src}"]`)).toBeVisible();
    for (const number of container.querySelectorAll(
      '.pokemon-identity__number',
    )) {
      if (
        questionType === 'generation-roundup' ||
        number.closest('.pokemon-identity[aria-hidden="true"]')
      )
        expect(number).not.toBeVisible();
      else expect(number).toBeVisible();
    }
    if (question!.visual?.kind === 'evolution-shift')
      expect(
        container.querySelector(`img[src="${question!.visual.evolution.src}"]`),
      ).not.toBeInTheDocument();
    rerender(content(true));
    if (question!.visual?.kind === 'evolution-shift') {
      sources.push(question!.visual.evolution.src);
      numbers.push(question!.visual.evolution.dexNumber);
    }
    expect(sources.length).toBeGreaterThan(0);
    for (const src of sources)
      expect(container.querySelector(`img[src="${src}"]`)).toBeVisible();
    for (const number of numbers)
      expect(container.textContent).toContain(formatPokedexNumber(number));
  },
);
