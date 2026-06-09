import { describe, it, expect } from 'vitest';
import { formatBytes, STATUS_META } from './format';

describe('formatBytes', () => {
  it('formats bytes into human-readable units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(15 * 1024 * 1024)).toBe('15 MB');
  });

  it('handles missing values', () => {
    expect(formatBytes(undefined)).toBe('—');
  });
});

describe('STATUS_META', () => {
  it('maps each document status to a label', () => {
    expect(STATUS_META.uploaded.label).toBe('Uploaded');
    expect(STATUS_META.in_progress.label).toBe('In progress');
    expect(STATUS_META.signed.label).toBe('Signed');
  });
});
