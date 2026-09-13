import { ArrowDownIcon, ArrowUpIcon } from '@/components/icons';

const parseNatureEffect = (description: string) =>
  /^Raises (.+); lowers (.+)$/.exec(description);

export const NatureEffect = ({ description }: { description: string }) => {
  const effect = parseNatureEffect(description);
  if (!effect) return description;
  return (
    <span className="nature-effect" aria-label={description} role="img">
      <span aria-hidden="true">
        <ArrowUpIcon weight="bold" />
        {effect[1]}
      </span>
      <span aria-hidden="true">
        <ArrowDownIcon weight="bold" />
        {effect[2]}
      </span>
    </span>
  );
};
