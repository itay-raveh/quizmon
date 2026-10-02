import * as styles from './styles/classes.css.ts';

const corners = {
  badge: [
    styles.trainerBadgeCaseRivetTopLeft,
    styles.trainerBadgeCaseRivetTopRight,
    styles.trainerBadgeCaseRivetBottomLeft,
    styles.trainerBadgeCaseRivetBottomRight,
  ],
  titles: [
    styles.trainerTitlesFastenerTopLeft,
    styles.trainerTitlesFastenerTopRight,
    styles.trainerTitlesFastenerBottomLeft,
    styles.trainerTitlesFastenerBottomRight,
  ],
};

export const CollectionCorners = ({ kind }: { kind: keyof typeof corners }) =>
  corners[kind].map((corner, index) => (
    <span
      aria-hidden="true"
      className={`${kind === 'badge' ? styles.trainerBadgeCaseRivet : styles.trainerTitlesFastener} ${corner}`}
      key={index}
    />
  ));
