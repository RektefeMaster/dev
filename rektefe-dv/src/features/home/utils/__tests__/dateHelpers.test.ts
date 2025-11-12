import { formatDateValue } from '../dateHelpers';

describe('formatDateValue', () => {
  it('formats ISO string to Turkish short date', () => {
    const result = formatDateValue('2025-01-15T10:00:00Z');
    expect(result).toBe('15 Oca 2025');
  });

  it('returns null for invalid date input', () => {
    expect(formatDateValue('not-a-date')).toBeNull();
    expect(formatDateValue(undefined)).toBeNull();
  });

  it('accepts Date objects', () => {
    const date = new Date('2025-03-02T00:00:00+03:00');
    const result = formatDateValue(date);
    expect(result).toBe('02 Mar 2025');
  });
});


