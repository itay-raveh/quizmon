import { clearSaveIssue } from '../src/lib/storage/save-health';
vi.mock(
  '../src/lib/storage/local-database',
  () => import('./fixtures/local-database'),
);
import '@testing-library/jest-dom/vitest';

if (typeof Element !== 'undefined') Element.prototype.scrollIntoView = vi.fn();

beforeEach(clearSaveIssue);
