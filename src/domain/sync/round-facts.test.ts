import { describe, expect, it } from 'vitest';
import { completion } from '../../../tests/online/progress-fixtures.ts';
import { completeRound, projectRoundHistory } from '../player/game-history.ts';
import { defaultGameSettings } from '../settings/game-settings.ts';
import type { QuestionData } from '../quiz/types.ts';
import {
  archiveCompletion,
  scoreRound,
  validateRoundFact,
} from './round-facts.ts';

describe('completed round facts', () => {
  it('identifies a fresh League victory as the same archived record', async () => {
    const datasetId = crypto.randomUUID();
    const saved = completion(datasetId, 'league');
    const questions: QuestionData[] = saved.result.answers.map(
      (answer, index) => ({
        id: `question-${index}`,
        questionType: answer.questionType,
        category: answer.category,
        subject: { kind: 'pokemon', name: 'bulbasaur', generation: 'I' },
        repetition: {
          identity: 'bulbasaur',
          subjects: [],
          primary: [],
          distractors: [],
        },
        options: ['bulbasaur', 'ivysaur'],
        answer: { interaction: 'single-choice', correctOptions: ['bulbasaur'] },
        prompt: { kind: 'text', text: 'Choose the matching answer.' },
        media: { kind: 'none' },
      }),
    );
    const { completion: fresh, victory } = await completeRound(
      {
        answers: saved.result.answers,
        questions,
        settings: defaultGameSettings,
        mode: { kind: 'league' },
        contentVersion: saved.contentVersion,
        seed: 'league-seed',
        roundId: saved.completionId,
      },
      saved.completedAt,
      'Pilot Trainer',
    );
    const archived = archiveCompletion({ ...fresh, datasetId });
    const [projected] = projectRoundHistory([archived]).hallOfFame;
    expect(victory).toMatchObject({
      id: archived.id,
      completedAt: archived.completed_at,
    });
    expect(projected).toMatchObject({
      id: victory?.id,
      completedAt: victory?.completedAt,
    });
  });

  it('accepts a League victory only for a perfect full round', () => {
    const perfect = archiveCompletion(
      completion(crypto.randomUUID(), 'league'),
    );
    expect(validateRoundFact(perfect)).toBe(true);

    const short = structuredClone(perfect);
    short.data.answers.pop();
    expect(validateRoundFact(short)).toBe(false);

    const incorrect = structuredClone(perfect);
    incorrect.data.answers[0]!.question.selected = ['ivysaur'];
    expect(validateRoundFact(incorrect)).toBe(false);

    const missingVictory = structuredClone(perfect);
    missingVictory.data.victory = null;
    expect(validateRoundFact(missingVictory)).toBe(false);
  });

  it('rejects array-shaped enum fields in uploaded rounds', () => {
    const round = archiveCompletion(completion(crypto.randomUUID()));
    Reflect.set(round.data.answers[0]!, 'category', ['knowledge']);
    expect(validateRoundFact(round)).toBe(false);
  });

  it('rederives score from answers instead of saved totals', () => {
    const old = completion(crypto.randomUUID());
    const expected = old.result.score;
    old.result.score = 0;
    old.result.answers[0]!.points = 0;
    old.result.answers[0]!.speedBonus = 0;
    const round = archiveCompletion(old);
    expect(validateRoundFact(round)).toBe(true);
    expect(JSON.stringify(round.data)).not.toMatch(
      /"(?:score|points|speed_bonus|version)"/,
    );
    expect(scoreRound(round).score).toBe(expected);
  });

  it('retains a Daily start date through a completion after midnight', () => {
    const old = completion(crypto.randomUUID(), 'daily', {
      dailyDate: '2026-09-11',
      completedAt: '2026-09-12T00:01:00.000Z',
    });
    const round = archiveCompletion(old, true, '2026-09-11');
    expect(round.day).toBe('2026-09-11');
    expect(round.started_on).toBe('2026-09-11');
    expect(round.completed_at).toBe('2026-09-12T00:01:00.000Z');
    expect(validateRoundFact(round)).toBe(true);
    expect(projectRoundHistory([round]).results.streak.creditedDates).toEqual([
      '2026-09-11',
    ]);
    const duplicate = archiveCompletion(
      completion(crypto.randomUUID(), 'daily', {
        dailyDate: '2026-09-11',
        discoveries: ['ivysaur'],
      }),
      false,
      '2026-09-11',
    );
    const combined = projectRoundHistory([round, duplicate]);
    expect(combined.results.progress.correctQuestionTypes['type-check']).toBe(
      4,
    );
    expect(combined.pokedex).toEqual(['bulbasaur', 'ivysaur']);
  });
});
