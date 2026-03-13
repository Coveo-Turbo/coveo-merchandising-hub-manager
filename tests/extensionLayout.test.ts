import {beforeEach, describe, expect, it} from 'vitest';
import {resolveEmbeddedHostInsets} from '../src/extension/layout';

const setRect = (
  element: Element,
  {left, top, width, height}: {left: number; top: number; width: number; height: number},
) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: left,
      y: top,
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      toJSON: () => ({}),
    }),
  });
};

describe('resolveEmbeddedHostInsets', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 1440});
    Object.defineProperty(window, 'innerHeight', {configurable: true, value: 960});
  });

  it('uses the visible main content container when available', () => {
    document.body.innerHTML = '<main data-testid="main-content"></main><aside></aside><header></header>';

    setRect(document.querySelector('main')!, {left: 96, top: 80, width: 1280, height: 840});
    setRect(document.querySelector('aside')!, {left: 0, top: 0, width: 72, height: 960});
    setRect(document.querySelector('header')!, {left: 0, top: 0, width: 1440, height: 64});

    expect(resolveEmbeddedHostInsets()).toEqual({
      top: 80,
      left: 96,
      right: 64,
      bottom: 40,
    });
  });

  it('falls back to header and sidebar bounds when no main content root is found', () => {
    document.body.innerHTML = '<aside></aside><header></header>';

    setRect(document.querySelector('aside')!, {left: 0, top: 0, width: 88, height: 960});
    setRect(document.querySelector('header')!, {left: 0, top: 0, width: 1440, height: 72});

    expect(resolveEmbeddedHostInsets()).toEqual({
      top: 72,
      left: 88,
      right: 0,
      bottom: 0,
    });
  });

  it('ignores centered data-testid wrappers that would create an artificial left gutter', () => {
    document.body.innerHTML = '<aside></aside><header></header><div data-testid="content-shell"></div>';

    setRect(document.querySelector('aside')!, {left: 0, top: 0, width: 88, height: 960});
    setRect(document.querySelector('header')!, {left: 0, top: 0, width: 1440, height: 72});
    setRect(document.querySelector('[data-testid="content-shell"]')!, {left: 320, top: 120, width: 960, height: 760});

    expect(resolveEmbeddedHostInsets()).toEqual({
      top: 72,
      left: 88,
      right: 0,
      bottom: 0,
    });
  });
});
