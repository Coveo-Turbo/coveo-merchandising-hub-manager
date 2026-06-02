import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it} from 'vitest';
import {useUrlSection} from '../src/hooks/useUrlSection';

describe('useUrlSection', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('reads the context mappings section from the standalone URL parameter', () => {
    window.history.replaceState({}, '', '/?section=context-mappings');

    const {result} = renderHook(() => useUrlSection(false));

    expect(result.current[0]).toBe('context-mappings');
  });

  it('writes the context mappings section to the embedded URL parameter', () => {
    const {result} = renderHook(() => useUrlSection(true));

    act(() => {
      result.current[1]('context-mappings');
    });

    expect(new URLSearchParams(window.location.search).get('cmhSection')).toBe('context-mappings');
  });
});
