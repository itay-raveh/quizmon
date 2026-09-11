import { QuestionIcon, XIcon } from '@/components/icons';
import { TypeEffectArrow } from '@/components/RelationArrow';
import { SoundButton } from '@/components/SoundButton';
import { TypeBadges } from '@/components/TypeBadge';
import {
  formatPokemonName,
  formatTypeMultiplier,
} from '@/domain/pokemon/format';
import { attackMultiplier } from '@/domain/pokemon/type-effectiveness';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { useId } from 'react';

export const AnswerEffectiveness = ({
  option,
  isTypeOption,
  attackTypes,
  defenderTypes,
  typeRelations,
}: {
  option: string;
  isTypeOption: boolean;
  attackTypes: readonly string[];
  defenderTypes: readonly string[];
  typeRelations: PokemonCatalog['typeRelations'];
}) => {
  const id = useId();
  const calculations = attackTypes.map((type) => ({
    type,
    factors: defenderTypes.map((defender) =>
      attackMultiplier({ typeRelations }, type, [defender]),
    ),
    total: attackMultiplier({ typeRelations }, type, defenderTypes),
  }));
  const total = Math.max(
    ...calculations.map((calculation) => calculation.total),
  );
  return (
    <>
      <SoundButton
        className="answer-matchup__help"
        aria-label={`${formatPokemonName(option)}: ×${formatTypeMultiplier(total)} damage. Explain type effectiveness`}
        popoverTarget={id}
      >
        <span>×{formatTypeMultiplier(total)}</span>
        <QuestionIcon aria-hidden="true" weight="bold" />
      </SoundButton>
      <div
        className="question-type-help matchup-help"
        id={id}
        popover="auto"
        role="note"
      >
        <SoundButton
          className="question-type-help__close"
          aria-label="Close type effectiveness explanation"
          popoverTarget={id}
          popoverTargetAction="hide"
        >
          <XIcon aria-hidden="true" weight="bold" />
        </SoundButton>
        {calculations.map(({ type, factors, total: multiplier }) => (
          <div className="matchup-help__calculation" key={type}>
            {!isTypeOption && calculations.length > 1 ? (
              <div className="matchup-help__attack">
                {multiplier === total ? (
                  <b>{formatPokemonName(type)}</b>
                ) : (
                  formatPokemonName(type)
                )}
              </div>
            ) : null}
            <div
              className="matchup-help__formula"
              aria-label={`${formatPokemonName(type)}: ${factors.map((factor, index) => `${formatTypeMultiplier(factor)} against ${formatPokemonName(defenderTypes[index]!)}`).join(' times ')} equals ${formatTypeMultiplier(multiplier)}`}
              role="math"
            >
              {factors.map((factor, index) => (
                <div
                  className="matchup-help__factor"
                  key={defenderTypes[index]}
                  aria-hidden="true"
                >
                  <TypeBadges types={[type]} />
                  <TypeEffectArrow multiplier={factor} />
                  <TypeBadges types={[defenderTypes[index]!]} />
                </div>
              ))}
              {factors.length > 1 ? (
                <div className="matchup-help__total" aria-hidden="true">
                  {factors.map(formatTypeMultiplier).join(' × ')} = ×
                  {formatTypeMultiplier(multiplier)}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
