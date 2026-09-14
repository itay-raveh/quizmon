import { clearSaveIssue } from '../src/lib/storage/save-health';
import '@testing-library/jest-dom/vitest';

if (typeof Element !== 'undefined') Element.prototype.scrollIntoView = vi.fn();

beforeEach(clearSaveIssue);
