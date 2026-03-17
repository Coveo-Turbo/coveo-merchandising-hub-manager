import {beforeEach, describe, expect, it, vi} from 'vitest';
import {shouldDeactivateManagerFromTarget, syncManagerNavItem} from '../src/extension/navigation';

const setRect = (element: Element, {left = 0, top = 0, width = 240, height = 48} = {}) => {
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

const getInteractive = (container: HTMLElement) =>
  (container.matches('a, button, [role="button"], [role="link"]')
    ? container
    : container.querySelector<HTMLElement>('a, button, [role="button"], [role="link"]'))!;

describe('extension sidebar navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav id="sidebar">
        <div class="nav-entry nav-entry--default">
          <a class="nav-link nav-link--default" href="/listings">
            <span class="nav-icon-wrap"><svg class="nav-icon" width="18" height="18"></svg></span>
            <span class="nav-label">Product Listings</span>
          </a>
        </div>
        <div class="nav-entry nav-entry--active">
          <a class="nav-link nav-link--active" href="/facets" aria-current="page">
            <span class="nav-icon-wrap"><svg class="nav-icon" width="18" height="18"></svg></span>
            <span class="nav-label">Facets</span>
          </a>
        </div>
      </nav>
    `;

    document.querySelectorAll('#sidebar a').forEach((element, index) => {
      setRect(element, {top: index * 56 + 8});
    });
  });

  it('clones an inactive menu item structure for the default manager rail entry', () => {
    const sidebar = document.getElementById('sidebar') as HTMLElement;
    const onActivate = vi.fn();

    const injected = syncManagerNavItem(sidebar, {
      active: false,
      href: '/hub?cmhManager=1&cmhSection=listings',
      onActivate,
    });

    expect(injected.className).toBe('nav-entry nav-entry--default');
    expect(getInteractive(injected).className).toBe('nav-link nav-link--default');
    expect(injected.textContent).toContain('CMH Manager');
    expect(injected.textContent).not.toContain('Product Listings');
    expect(injected.querySelector('svg')).not.toBeNull();

    injected.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it('switches to the active host template when the manager is open', () => {
    const sidebar = document.getElementById('sidebar') as HTMLElement;

    const injected = syncManagerNavItem(sidebar, {
      active: true,
      href: '/hub?cmhManager=1&cmhSection=listings',
      onActivate: vi.fn(),
    });

    expect(injected.className).toBe('nav-entry nav-entry--active');
    expect(getInteractive(injected).className).toBe('nav-link nav-link--active');
    expect(getInteractive(injected).getAttribute('aria-current')).toBe('page');
  });

  it('treats other sidebar items as a manager deactivation signal', () => {
    const sidebar = document.getElementById('sidebar') as HTMLElement;

    const injected = syncManagerNavItem(sidebar, {
      active: true,
      href: '/hub?cmhManager=1&cmhSection=listings',
      onActivate: vi.fn(),
    });

    expect(shouldDeactivateManagerFromTarget(sidebar, document.querySelector('.nav-label'))).toBe(true);
    expect(shouldDeactivateManagerFromTarget(sidebar, injected.querySelector('.nav-label'))).toBe(false);
    expect(shouldDeactivateManagerFromTarget(sidebar, sidebar)).toBe(false);
  });
});
