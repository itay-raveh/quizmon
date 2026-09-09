import { GenerationLabel } from './GenerationLabel';
import {
  formatGeneration,
  formatPokemonName,
  formatPokemonTypes,
} from '@/game/format';
import { Fragment } from 'react';
import { AnswerEffectiveness } from './AnswerEffectiveness';
import type { PokemonCatalog, QuestionData } from '@/game/types';
import { GameButton } from './GameButton';
import { CheckIcon, XIcon } from './icons';
import { PokemonIdentity } from './PokemonIdentity';
import { PixelSprite } from './PixelSprite';
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
  typeRelations?: PokemonCatalog['typeRelations'];
  answered: boolean;
  onSelect: (option: string) => void;
  question: QuestionData;
  selectedOptions: readonly string[];
}

export const QuestionAnswers = ({
  typeRelations,
  answered,
  onSelect,
  question,
  selectedOptions,
}: QuestionAnswersProps) => {
  const correct = new Set(question.answer.correctOptions);
  const selected = new Set(selectedOptions);
  const hasTypeOptionBadges = typeOptionQuestionTypes.has(
    question.questionType,
  );
  const reservesOptionTypes = optionTypeRevealQuestionTypes.has(
    question.questionType,
  );
  const revealsOptionTypes = answered && reservesOptionTypes;
  const multiSelect = question.answer.interaction === 'multi-select';
  const concealed = Boolean(question.concealOptionLabels && !answered);
  const showdownStat =
    question.visual?.kind === 'stat-showdown'
      ? question.visual.stat
      : undefined;

  return (
    <div
      className={[
        'answers',
        question.optionVisuals ? 'answers--pokemon' : '',
        question.questionType === 'counter-pick' ? 'answers--counter-pick' : '',
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
        const optionSelected = selected.has(option);
        const optionCorrect = correct.has(option);
        const optionClassName = !answered
          ? optionSelected
            ? 'answer answer--selected'
            : 'answer'
          : optionCorrect
            ? 'answer answer--correct'
            : optionSelected
              ? 'answer answer--wrong'
              : 'answer answer--muted';
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
          answered && generation ? `. ${formatGeneration(generation)}.` : '';
        const statValue = question.optionStats?.[option];
        const hasStatValue =
          showdownStat !== undefined && statValue !== undefined;
        const revealsStat = answered && hasStatValue;
        const statAnnouncement = revealsStat
          ? `. ${formatPokemonName(showdownStat)}: ${statValue}.`
          : '';
        const stat = hasStatValue ? (
          <span
            aria-hidden="true"
            className={`answer__stat ${revealsStat ? '' : 'answer__stat--reserved'}`.trim()}
          >
            {statValue}
          </span>
        ) : null;
        const showCheckmark = answered
          ? optionCorrect
          : multiSelect && optionSelected;
        const selectionMark = showCheckmark ? (
          <CheckIcon weight="bold" />
        ) : answered && optionSelected ? (
          <XIcon weight="bold" />
        ) : (
          index + 1
        );

        const attackTypes = typeRelations
          ? question.questionType === 'type-matchup'
            ? [option]
            : question.questionType === 'counter-pick'
              ? visual?.types
              : undefined
          : undefined;
        const answerButton = (
          <GameButton
            aria-label={
              concealed
                ? `${visual?.silhouette ? 'Silhouette' : 'Sprite'} ${index + 1}`
                : `${formatPokemonName(option)}${typeAnnouncement}${generationAnnouncement}${classificationAnnouncement}${statAnnouncement}${resultAnnouncement}`
            }
            aria-keyshortcuts={String(index + 1)}
            aria-pressed={multiSelect ? optionSelected : undefined}
            className={`${optionClassName} ${visual ? 'answer--pokemon' : ''} ${concealed ? 'answer--concealed' : ''}`.trim()}
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
                  <PixelSprite
                    className={`answer__sprite ${visual.silhouette && !answered ? 'answer__sprite--silhouette' : ''}`.trim()}
                    src={visual.src}
                    fetchPriority="auto"
                  />
                </span>
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
                      <GenerationLabel generation={generation} />
                    </span>
                  ) : null}
                  {stat}
                </PokemonIdentity>
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
                {stat}
              </PokemonIdentity>
            ) : (
              <span>{formatPokemonName(option)}</span>
            )}
          </GameButton>
        );
        return attackTypes && typeRelations ? (
          <div
            className={`answer-matchup ${visual ? 'answer-matchup--pokemon' : ''}`.trim()}
            key={option}
          >
            {answerButton}
            {answered ? (
              <AnswerEffectiveness
                option={option}
                isTypeOption={question.questionType === 'type-matchup'}
                attackTypes={attackTypes}
                defenderTypes={question.pokemonTypes}
                typeRelations={typeRelations}
              />
            ) : null}
          </div>
        ) : (
          <Fragment key={option}>{answerButton}</Fragment>
        );
      })}
    </div>
  );
};
