import type { TrainerStats } from '@/game/storage';
import type { QuestionCategory } from '@/game/types';

interface TrainerCardProps {
  stats: TrainerStats;
}

const categoryLabels: Record<QuestionCategory, string> = {
  ability: 'Abilities',
  champion: 'Champion rounds',
  description: 'Field notes',
  evolution: 'Evolutions',
  identity: 'Pokémon identity',
  matchup: 'Matchups',
  move: 'Moves',
  stat: 'Stats',
  type: 'Types',
};

export const TrainerCard = ({ stats }: TrainerCardProps) => (
  <section className="trainer-card" aria-labelledby="trainer-card-title">
    <header className="trainer-card__header">
      <h2 id="trainer-card-title">Trainer Card</h2>
      <span>Daily clears · {stats.dailyChallengesCompleted}</span>
    </header>
    <dl className="trainer-card__record">
      <div>
        <dt>Games</dt>
        <dd>{stats.gamesCompleted.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Perfect rounds</dt>
        <dd>{stats.perfectRounds.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Best Daily Combo</dt>
        <dd>{stats.bestDailyStreak.toLocaleString()}</dd>
      </div>
    </dl>
    {stats.strongestCategory ? (
      <p className="trainer-card__strength">
        <span>Strong suit</span>
        <strong>{categoryLabels[stats.strongestCategory.category]}</strong>
        <small>
          {stats.strongestCategory.correct} / {stats.strongestCategory.total}
        </small>
      </p>
    ) : null}
  </section>
);
