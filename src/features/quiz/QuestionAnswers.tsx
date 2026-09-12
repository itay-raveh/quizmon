import { GameButton } from '@/components/GameButton';
import { GenerationLabel } from '@/components/GenerationLabel';
import { CheckIcon, XIcon } from '@/components/icons';
import { PixelSprite } from '@/components/PixelSprite';
import { PokemonIdentity } from '@/components/PokemonIdentity';
import { TypeBadges } from '@/components/TypeBadge';
import {
  formatGeneration,
  formatPokemonName,
  formatPokemonTypes,
} from '@/domain/pokemon/format';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import type { QuestionData } from '@/domain/quiz/types';
import { Fragment } from 'react';
import { TypeAnswerPicker } from './TypeAnswerPicker';
import { AnswerEffectiveness } from './AnswerEffectiveness';

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
  const revealsOptionTypes =
    (answered || question.showTypes) && reservesOptionTypes;
  const multiSelect = question.answer.interaction === 'multi-select';
  const concealed = Boolean(question.concealOptionLabels && !answered);
  const showdownStat =
    question.visual?.kind === 'stat-showdown'
      ? question.visual.stat
      : undefined;

  if (hasTypeOptionBadges && multiSelect && question.options.length > 4) {
    return (
      <TypeAnswerPicker
        question={question}
        selectedOptions={selectedOptions}
        answered={answered}
        onSelect={onSelect}
        typeRelations={typeRelations}
      />
    );
  }

  return (
    <div
      className={[
        'answers',
        question.optionVisuals && !question.namesOnly ? 'answers--pokemon' : '',
        question.questionType === 'counter-pick' ? 'answers--counter-pick' : '',
        hasTypeOptionBadges ? 'answers--type-options' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {question.options.map((option, index) => {
        const optionVisual = question.optionVisuals?.[option];
        const visual = question.namesOnly
          ? undefined
          : question.optionVisuals?.[option];
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
          revealsOptionTypes && optionVisual
            ? `. ${optionVisual.types.length === 1 ? 'Type' : 'Types'}: ${formatPokemonTypes(optionVisual.types)}.`
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
            aria-keyshortcuts={index < 9 ? String(index + 1) : undefined}
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
                  {visual.referenceSrc ? (
                    <PixelSprite
                      className="answer__sprite"
                      src={visual.referenceSrc}
                    />
                  ) : null}
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
                      className={`answer__types ${revealsOptionTypes ? '' : 'answer__types--reserved'}`.trim()}
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
              <span className="answer__text">
                <span>{formatPokemonName(option)}</span>
                {question.namesOnly &&
                ((reservesOptionTypes && optionVisual) ||
                  classification ||
                  generation) ? (
                  <span
                    aria-hidden="true"
                    className="answer__text-detail"
                    style={{ visibility: answered ? undefined : 'hidden' }}
                  >
                    {reservesOptionTypes && optionVisual ? (
                      <TypeBadges types={optionVisual.types} />
                    ) : null}
                    {classification ? <span>{classification}</span> : null}
                    {generation ? (
                      <GenerationLabel generation={generation} />
                    ) : null}
                  </span>
                ) : null}
              </span>
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
