import { GameButton } from '@/components/GameButton';
import { GenerationLabel } from '@/components/GenerationLabel';
import { CheckIcon, MinusIcon, XIcon } from '@/components/icons';
import { TypeBadges } from '@/components/TypeBadge';
import {
  formatGeneration,
  formatPokemonName,
  formatPokemonTypes,
} from '@/domain/pokemon/format';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { getQuestionRendering } from '@/domain/quiz/question-variants';
import { isVisible, spriteState } from '@/domain/quiz/question-rendering';
import type { QuestionData } from '@/domain/quiz/types';
import { AnswerEffectiveness } from './AnswerEffectiveness';
import { supplementalItemSprites } from './item-sprites';
import { MoveReveal } from './MoveReveal';
import { NatureEffect } from './NatureEffect';
import { QuestionIdentity, QuestionSprite } from './QuestionEntity';

interface QuestionAnswerChoiceProps {
  question: QuestionData;
  option: string;
  index: number;
  answered: boolean;
  cluesShown: number;
  selectedOptions: readonly string[];
  onSelect: (option: string) => void;
  typeRelations?: PokemonCatalog['typeRelations'];
  hasTypeOptionBadges: boolean;
  reservesOptionTypes: boolean;
}

export const QuestionAnswerChoice = ({
  question,
  option,
  index,
  answered,
  cluesShown,
  selectedOptions,
  onSelect,
  typeRelations,
  hasTypeOptionBadges,
  reservesOptionTypes,
}: QuestionAnswerChoiceProps) => {
  const multiSelect = question.answer.interaction === 'multi-select';
  const policy = getQuestionRendering(question).choices;
  const state = { answered, cluesShown };
  const concealed = !isVisible(policy.name, state);
  const revealsOptionTypes =
    (answered || question.showTypes) && reservesOptionTypes;
  const showdownStat =
    question.visual?.kind === 'stat-showdown'
      ? question.visual.stat
      : undefined;
  const label = question.optionLabels?.[option] ?? formatPokemonName(option);
  const reveal = question.optionReveals?.[option];
  const measurement =
    question.questionType === 'weight-comparison' ||
    question.questionType === 'height-comparison';
  const detail =
    reveal && !measurement ? (
      <span
        aria-hidden="true"
        className={`answer__reveal ${answered ? '' : 'answer__reveal--reserved'}`.trim()}
      >
        {question.questionType === 'nature-effects' ? (
          <NatureEffect description={reveal} compact />
        ) : question.questionType === 'move-purpose' ? (
          <MoveReveal description={reveal} />
        ) : (
          reveal
        )}
      </span>
    ) : null;
  const itemImage =
    question.optionImages?.[option] ??
    (question.questionType === 'evolution-items'
      ? supplementalItemSprites[option]
      : undefined);
  const visual =
    policy.sprite === 'never' ? undefined : question.optionVisuals?.[option];
  const dexNumber =
    question.optionDexNumbers?.[option] ??
    question.optionVisuals?.[option]?.dexNumber;
  const optionSelected = selectedOptions.includes(option);
  const optionCorrect = question.answer.correctOptions.includes(option);
  const optionClassName = !answered
    ? optionSelected
      ? 'answer answer--selected'
      : 'answer'
    : optionCorrect
      ? multiSelect && !optionSelected
        ? 'answer answer--missed'
        : 'answer answer--correct'
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
    (showdownStat !== undefined && statValue !== undefined) ||
    (measurement && reveal !== undefined);
  const revealsStat = answered && hasStatValue;
  const statAnnouncement =
    revealsStat && showdownStat !== undefined
      ? `. ${formatPokemonName(showdownStat)}: ${statValue}.`
      : '';
  const stat = hasStatValue ? (
    <span
      aria-hidden="true"
      className={`answer__stat ${revealsStat ? '' : 'answer__stat--reserved'}`.trim()}
    >
      {measurement ? reveal : statValue}
    </span>
  ) : null;
  const selectionMark =
    resultMarker === 'missed' ? (
      <MinusIcon weight="bold" />
    ) : answered && optionCorrect ? (
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
          ? `${spriteState(policy.sprite, state).silhouette ? 'Silhouette' : 'Sprite'} ${index + 1}`
          : `${label}${answered && reveal ? `. ${reveal}.` : ''}${typeAnnouncement}${generationAnnouncement}${classificationAnnouncement}${statAnnouncement}${resultAnnouncement}`
      }
      aria-keyshortcuts={
        question.options.length <= 9 ? String(index + 1) : undefined
      }
      aria-pressed={multiSelect ? optionSelected : undefined}
      className={`${optionClassName} ${visual ? 'answer--pokemon' : ''} ${itemImage ? 'answer--item' : ''} ${concealed ? 'answer--concealed' : ''}`.trim()}
      disabled={answered}
      onClick={() => onSelect(option)}
      sound="none"
    >
      <kbd aria-hidden="true">{selectionMark}</kbd>
      {itemImage ? (
        <span className="answer__item-slot" aria-hidden="true">
          <QuestionSprite
            rule={policy.sprite}
            state={state}
            className="answer__item-sprite"
            src={itemImage}
          />
        </span>
      ) : null}
      {visual ? (
        <>
          <span className="answer__sprite-field" aria-hidden="true">
            <QuestionSprite
              rule={policy.sprite}
              state={state}
              className="answer__sprite"
              src={visual.src}
              fetchPriority="auto"
            />
          </span>
          <QuestionIdentity
            policy={policy}
            state={state}
            className={`answer__nameplate ${hasStatValue ? 'answer__nameplate--stat' : ''}`.trim()}
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
            {detail}
            {stat}
          </QuestionIdentity>
        </>
      ) : hasTypeOptionBadges ? (
        <TypeBadges className="answer__type-choice" types={[option]} />
      ) : dexNumber !== undefined ? (
        <QuestionIdentity
          policy={policy}
          state={state}
          className={`answer__identity ${hasStatValue ? 'answer__identity--stat' : ''}`.trim()}
          dexNumber={dexNumber}
          hideNumberFromAccessibility
          name={option}
          nameClassName="answer__name"
        >
          {detail}
          {stat}
        </QuestionIdentity>
      ) : (
        <span className="answer__text">
          {question.optionDetails?.[option]?.length ? (
            <span className="answer__effects" aria-hidden="true">
              {question.optionDetails[option].map((row, index) => (
                <span className="answer__effect" key={index}>
                  <strong>{row.value}</strong>
                  <span>{row.label}</span>
                </span>
              ))}
            </span>
          ) : (
            <span>{label}</span>
          )}
          {detail}
          {classification || generation ? (
            <span
              aria-hidden="true"
              className="answer__text-detail"
              style={{ visibility: answered ? undefined : 'hidden' }}
            >
              {classification ? <span>{classification}</span> : null}
              {generation ? <GenerationLabel generation={generation} /> : null}
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
          defenderTypes={question.subject.types ?? []}
          typeRelations={typeRelations}
        />
      ) : null}
    </div>
  ) : (
    answerButton
  );
};
