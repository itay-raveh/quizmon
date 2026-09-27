export type SaveErrorKind = 'newer' | 'invalid' | 'unavailable';

export class SaveError extends Error {
  readonly kind: SaveErrorKind;
  constructor(kind: SaveErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'SaveError';
  }
}
