import { parentPort } from 'node:worker_threads';
import {
  trainerProfileSchema,
  createTrainerProfile,
} from '../src/domain/player/trainer-profile.ts';
import {
  compactRoundSchema,
  scoreCompactRound,
  type CompactRound,
} from '../src/domain/sync/compact-rounds.ts';
import { isLeagueVictory } from '../src/domain/quiz/league.ts';
import { projectTrainerHistory } from './rxdb-read.ts';
import type {
  ProjectionInput,
  ProjectionMessage,
} from './trainer-projection.ts';

if (parentPort) {
  const port = parentPort;
  const send = (message: ProjectionMessage) => port.postMessage(message);
  port.on(
    'message',
    ({ profile: rawProfile, rounds: rawRounds, detail }: ProjectionInput) => {
      send({ type: 'started' });
      try {
        const start = performance.now();
        const profile =
          rawProfile === undefined
            ? createTrainerProfile()
            : trainerProfileSchema.parse(rawProfile);
        const rounds: CompactRound[] = [];
        for (let index = 0; index < rawRounds.length; index++) {
          rounds.push(compactRoundSchema.parse(rawRounds[index]));
          // These are private worker copies; release each source after validation.
          rawRounds[index] = null;
        }
        const validationMs = performance.now() - start;
        const projectionStart = performance.now();
        const projection = detail
          ? projectTrainerHistory(profile, rounds)
          : undefined;
        const leagueCompleted = projection
          ? projection.stats.leagueCompleted
          : rounds.some((round) => isLeagueVictory(scoreCompactRound(round)));
        send({
          type: 'result',
          value: {
            profile,
            leagueCompleted,
            ...(projection ? { detail: projection } : {}),
            roundCount: rounds.length,
            validationMs,
            projectionMs: performance.now() - projectionStart,
            heapBytes: process.memoryUsage().heapUsed,
          },
        });
      } catch {
        // Never transfer validation errors containing source profile or answer values.
        send({ type: 'invalid' });
      }
    },
  );
  send({ type: 'ready' });
}
