import { leagueStages } from '@/game/league';
import { GameButton } from './GameButton';

interface LeagueGatewayProps {
  completed: boolean;
  onStart: () => void;
}

export const LeagueGateway = ({ completed, onStart }: LeagueGatewayProps) => (
  <section className="league-gateway" aria-labelledby="league-gateway-title">
    <div className="league-gateway__copy">
      <h2 id="league-gateway-title">
        {completed ? 'Hall of Fame' : 'Quizmon League'}
      </h2>
      <p>
        {completed ? 'Champion record: 15 / 15' : '15 correct answers required'}
      </p>
    </div>
    <ol className="league-gateway__stages" aria-label="League stages">
      {leagueStages.map((stage) => (
        <li key={stage.id} title={`${stage.heading}: ${stage.title}`}>
          <span aria-hidden="true">{stage.marker}</span>
          <span className="visually-hidden">
            {stage.heading}: {stage.title}
          </span>
        </li>
      ))}
    </ol>
    <GameButton onClick={onStart}>
      {completed ? 'League rematch' : 'Start League challenge'}
    </GameButton>
  </section>
);
