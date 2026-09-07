const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export const CollectionCorners = ({ className }: { className: string }) =>
  corners.map((corner) => (
    <span
      aria-hidden="true"
      className={`${className} ${className}--${corner}`}
      key={corner}
    />
  ));
