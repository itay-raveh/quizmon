import { formatPokemonName, formatPokemonTypes } from '@/game/format';
import type { QuestionData } from '@/game/types';
import { GameButton } from './GameButton';
import { CheckIcon, XIcon } from './icons';
import { PokemonIdentity } from './PokemonIdentity';
import { TypeBadges } from './TypeBadge';

const typeOptionQuestionTypes = new Set<QuestionData['questionType']>([
  'evolution-shift',
  'type-check',
  'type-matchup',
]);

const optionTypeRevealQuestionTypes = new Set<QuestionData['questionType']>([
  'counter-pick',
  'odd-one-out',
  'type-roundup',
  'type-twins',
]);

interface QuestionAnswersProps {
  answered: boolean;
  correctOptions: readonly string[];
  onSelect: (option: string) => void;
  question: QuestionData;
  selectedOptions: readonly string[];
}

export const QuestionAnswers = ({
  answered,
  correctOptions,
  onSelect,
  question,
  selectedOptions,
}: QuestionAnswersProps) => {
  const correct = new Set(correctOptions);
  const selected = new Set(selectedOptions);
  const hasTypeOptionBadges = typeOptionQuestionTypes.has(
    question.questionType,
  );
  const reservesOptionTypes = optionTypeRevealQuestionTypes.has(
    question.questionType,
  );
  const revealsOptionTypes = answered && reservesOptionTypes;
  const multiSelect = question.answer.interaction === 'multi-select';
  const showdownStat =
    question.visual?.kind === 'stat-showdown'
      ? question.visual.stat
      : undefined;

  const optionClassName = (option: string) => {
    if (!answered) {
      return selected.has(option) ? 'answer answer--selected' : 'answer';
    }
    if (correct.has(option)) return 'answer answer--correct';
    if (selected.has(option)) return 'answer answer--wrong';
    return 'answer answer--muted';
  };

  return (
    <div
      className={[
        'answers',
        question.optionVisuals ? 'answers--pokemon' : '',
        hasTypeOptionBadges ? 'answers--type-options' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {question.options.map((option, index) => {
        const visual = question.optionVisuals?.[option];
        const dexNumber = question.optionGenerations
          ? undefined
          : (question.optionDexNumbers?.[option] ?? visual?.dexNumber);
        const concealed = Boolean(question.concealOptionLabels && !answered);
        const optionSelected = selected.has(option);
        const optionCorrect = correct.has(option);
        const resultMarker =
          answered && multiSelect
            ? optionCorrect && !optionSelected
              ? 'missed'
              : !optionCorrect && optionSelected
                ? 'wrong'
                : null
            : null;
        const typeAnnouncement =
          revealsOptionTypes && visual
            ? `. ${visual.types.length === 1 ? 'Type' : 'Types'}: ${formatPokemonTypes(visual.types)}.`
            : '';
        const resultAnnouncement =
          resultMarker === 'missed'
            ? ' Correct answer, not selected.'
            : resultMarker === 'wrong'
              ? ' Wrong pick.'
              : '';
        const classification = question.optionClassifications?.[option];
        const classificationAnnouncement =
          answered && classification
            ? `. ${classification === 'Neither' ? 'Neither Legendary nor Mythical' : classification}.`
            : '';
        const generation = question.optionGenerations?.[option];
        const generationAnnouncement =
          answered && generation ? `. Generation ${generation}.` : '';
        const statValue = question.optionStats?.[option];
        const hasStatValue =
          showdownStat !== undefined && statValue !== undefined;
        const revealsStat = answered && hasStatValue;
        const statAnnouncement = revealsStat
          ? `. ${formatPokemonName(showdownStat)}: ${statValue}.`
          : '';
        const selectionMark = answered ? (
          optionCorrect ? (
            <CheckIcon weight="bold" />
          ) : optionSelected ? (
            <XIcon weight="bold" />
          ) : (
            index + 1
          )
        ) : question.answer.interaction === 'multi-select' && optionSelected ? (
          <CheckIcon weight="bold" />
        ) : (
          index + 1
        );

        return (
          <GameButton
            aria-label={
              concealed
                ? `Silhouette ${index + 1}`
                : `${formatPokemonName(option)}${typeAnnouncement}${generationAnnouncement}${classificationAnnouncement}${statAnnouncement}${resultAnnouncement}`
            }
            aria-keyshortcuts={String(index + 1)}
            aria-pressed={
              question.answer.interaction === 'single-choice'
                ? undefined
                : optionSelected
            }
            className={`${optionClassName(option)} ${visual ? 'answer--pokemon' : ''} ${concealed ? 'answer--concealed' : ''}`.trim()}
            disabled={answered}
            key={option}
            onClick={() => onSelect(option)}
            sound="none"
          >
            <kbd aria-hidden="true">{selectionMark}</kbd>
            {resultMarker ? (
              <span
                aria-hidden="true"
                className={`answer__result-marker answer__result-marker--${resultMarker}`}
              >
                {resultMarker === 'missed' ? 'Missed' : 'Wrong pick'}
              </span>
            ) : null}
            {visual ? (
              <>
                <span className="answer__sprite-field" aria-hidden="true">
                  <img
                    className={`pixel-sprite answer__sprite ${visual.silhouette && !answered ? 'answer__sprite--silhouette' : ''}`.trim()}
                    src={visual.src}
                    alt=""
                    decoding="async"
                    width="96"
                    height="96"
                  />
                </span>
                {
                  <PokemonIdentity
                    className={`answer__nameplate ${hasStatValue ? 'answer__nameplate--stat' : ''}`.trim()}
                    revealed={!concealed}
                    dexNumber={dexNumber}
                    hideNumberFromAccessibility
                    name={option}
                    nameClassName="answer__name"
                  >
                    {reservesOptionTypes ? (
                      <TypeBadges
                        className={`answer__types ${answered ? '' : 'answer__types--reserved'}`.trim()}
                        types={visual.types}
                      />
                    ) : null}
                    {classification ? (
                      <span
                        aria-hidden="true"
                        className={`answer__classification ${answered ? '' : 'answer__classification--reserved'}`.trim()}
                      >
                        {classification}
                      </span>
                    ) : null}
                    {generation ? (
                      <span
                        aria-hidden="true"
                        className={`answer__generation ${answered ? '' : 'answer__generation--reserved'}`.trim()}
                      >
                        Generation <span>{generation}</span>
                      </span>
                    ) : null}
                    {hasStatValue ? (
                      <span
                        aria-hidden="true"
                        className={`answer__stat ${revealsStat ? '' : 'answer__stat--reserved'}`.trim()}
                      >
                        {statValue}
                      </span>
                    ) : null}
                  </PokemonIdentity>
                }
              </>
            ) : hasTypeOptionBadges ? (
              <TypeBadges className="answer__type-choice" types={[option]} />
            ) : dexNumber !== undefined ? (
              <PokemonIdentity
                className={`answer__identity ${hasStatValue ? 'answer__identity--stat' : ''}`.trim()}
                dexNumber={dexNumber}
                hideNumberFromAccessibility
                name={option}
                nameClassName="answer__name"
              >
                {hasStatValue ? (
                  <span
                    aria-hidden="true"
                    className={`answer__stat ${revealsStat ? '' : 'answer__stat--reserved'}`.trim()}
                  >
                    {statValue}
                  </span>
                ) : null}
              </PokemonIdentity>
            ) : (
              <span>{formatPokemonName(option)}</span>
            )}
          </GameButton>
        );
      })}
    </div>
  );
};
