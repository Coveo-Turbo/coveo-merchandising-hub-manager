import {describe, expect, it} from 'vitest';
import {getRequiredSection} from '../src/appRouting';

describe('app connection routing', () => {
  it('redirects disconnected users to the connection workspace once initial context resolution is complete', () => {
    expect(getRequiredSection('global-config', true, false)).toBe('connection');
    expect(getRequiredSection('listings', true, false)).toBe('connection');
    expect(getRequiredSection('connection', true, false)).toBe('connection');
  });

  it('preserves the current section before initial resolution or when a session exists', () => {
    expect(getRequiredSection('global-config', false, false)).toBe('global-config');
    expect(getRequiredSection('global-config', true, true)).toBe('global-config');
  });
});
