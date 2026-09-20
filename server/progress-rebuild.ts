import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  contribution,
  combine,
  emptyContribution,
} from '../src/domain/sync/progress.ts';
import {
  progressProjectionVersion,
  readRecordedGame,
} from '../src/domain/player/game-history.ts';
import * as schema from './progress-schema.ts';

export async function rebuildAccountProgress(
  db: NodePgDatabase,
  ownerId: string,
) {
  return db.transaction(async (tx) => {
    const [service] = await tx
      .select()
      .from(schema.serviceState)
      .where(eq(schema.serviceState.id, 'main'))
      .for('share');
    if (!service || service.fenced)
      throw new Error('Account recovery is in progress.');
    const [account] = await tx
      .select()
      .from(schema.accountState)
      .where(eq(schema.accountState.id, ownerId))
      .for('update');
    if (!account) throw new Error('Account not found.');
    if (account.projectionVersion === progressProjectionVersion)
      return account.progress;
    const generationId = account.generationId;
    const facts = await tx
      .select()
      .from(schema.completionFacts)
      .where(
        and(
          eq(schema.completionFacts.ownerId, ownerId),
          eq(schema.completionFacts.generationId, generationId),
        ),
      )
      .orderBy(schema.completionFacts.revision);
    const discoveries = await tx
      .select()
      .from(schema.operationOutcomes)
      .where(
        and(
          eq(schema.operationOutcomes.ownerId, ownerId),
          eq(schema.operationOutcomes.generationId, generationId),
        ),
      );
    let progress = emptyContribution();
    for (const table of [schema.dailyResults, schema.playerPokemon])
      await tx
        .delete(table)
        .where(
          and(eq(table.ownerId, ownerId), eq(table.generationId, generationId)),
        );
    for (const fact of facts) {
      const game = readRecordedGame(fact.completion);
      const effect = contribution(game, fact.eligible);
      progress = combine(progress, effect);
      await tx
        .update(schema.completionFacts)
        .set({ contribution: effect })
        .where(eq(schema.completionFacts.id, fact.id));
      if (fact.eligible && game.mode === 'daily')
        await tx.insert(schema.dailyResults).values({
          id: crypto.randomUUID(),
          ownerId,
          generationId,
          date: game.dailyDate!,
          completionId: game.completionId,
          score: game.result.score,
          elapsedMilliseconds: game.result.elapsedMilliseconds,
          result: game.result,
          streakCredit: game.completedAt.slice(0, 10) === game.dailyDate,
        });
    }
    for (const outcome of discoveries)
      progress = combine(progress, outcome.effect);
    for (const pokemon of new Set([
      ...progress.discoveries,
      ...progress.correctPokemon,
    ]))
      await tx.insert(schema.playerPokemon).values({
        id: crypto.randomUUID(),
        ownerId,
        generationId,
        pokemon,
        discovered: progress.discoveries.includes(pokemon),
        correct: progress.correctPokemon.includes(pokemon),
      });
    progress.discoveries = [];
    progress.correctPokemon = [];
    await tx
      .update(schema.accountState)
      .set({
        progress,
        projectionVersion: progressProjectionVersion,
        revision: account.revision + 1,
      })
      .where(eq(schema.accountState.id, ownerId));
    return progress;
  });
}
