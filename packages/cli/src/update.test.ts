import { describe, it, expect } from 'vitest';
import { compareSemver, CURRENT_VERSION } from './update.js';

describe('CLI Update Engine', () => {
  it('correctly compares semantic versions', () => {
    expect(compareSemver('1.17.3', '1.17.2')).toBe(1);
    expect(compareSemver('1.18.0', '1.17.2')).toBe(1);
    expect(compareSemver('2.0.0', '1.17.2')).toBe(1);
    expect(compareSemver('v1.17.3', 'v1.17.2')).toBe(1);
    expect(compareSemver('1.17.2', '1.17.2')).toBe(0);
    expect(compareSemver('1.17.1', '1.17.2')).toBe(-1);
    expect(compareSemver('1.16.9', '1.17.2')).toBe(-1);
  });

  it('exposes valid current version', () => {
    expect(CURRENT_VERSION).toBe('1.17.2');
  });
});
