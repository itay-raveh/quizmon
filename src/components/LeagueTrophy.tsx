import { Trophy } from './Trophy';

export const LeagueTrophy = ({ locked = false }: { locked?: boolean }) => (
  <div
    className={`league-trophy${locked ? ' league-trophy--locked' : ''}`}
    aria-hidden="true"
  >
    <svg
      className="league-trophy__rays"
      viewBox="0 0 400 300"
      fill="currentColor"
    >
      {Array.from({ length: 16 }, (_, index) => (
        <path
          key={index}
          d={
            index % 2
              ? 'M196 144 L178 -100 L222 -100 L204 144Z'
              : 'M196 144 L157 -100 L243 -100 L204 144Z'
          }
          transform={`rotate(${index * 22.5} 200 150)`}
          opacity={index % 2 ? '.26' : '.5'}
        />
      ))}
    </svg>
    <Trophy className="league-trophy__image" />
  </div>
);
