import { describe, expect, it } from 'vitest';
import { normalizeMessageRole } from '../../types';

describe('normalizeMessageRole', () => {
  it('migrates legacy manager role to dispatcher', () => {
    expect(normalizeMessageRole('manager')).toBe('dispatcher');
  });

  it('keeps canonical roles unchanged', () => {
    expect(normalizeMessageRole('dispatcher')).toBe('dispatcher');
    expect(normalizeMessageRole('customer')).toBe('customer');
    expect(normalizeMessageRole('accountant')).toBe('accountant');
  });

  it('returns undefined for empty role', () => {
    expect(normalizeMessageRole(undefined)).toBeUndefined();
  });
});
