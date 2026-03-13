import type {EmbeddedAppearance} from '../types';

interface HostInsets {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

const MIN_CONTENT_WIDTH = 320;
const MIN_CONTENT_HEIGHT = 320;
const UNHELPFUL_BACKGROUNDS = new Set([
  '',
  'transparent',
  'rgba(0, 0, 0, 0)',
  'rgb(255, 255, 255)',
  'rgba(255, 255, 255, 1)',
]);

const getViewportWidth = () => window.innerWidth || document.documentElement.clientWidth || 0;
const getViewportHeight = () => window.innerHeight || document.documentElement.clientHeight || 0;

const isVisible = (rect: DOMRect | DOMRectReadOnly) =>
  rect.width >= MIN_CONTENT_WIDTH && rect.height >= MIN_CONTENT_HEIGHT && rect.bottom > 0 && rect.right > 0;

const toHostInsets = (rect: DOMRect | DOMRectReadOnly): HostInsets => ({
  top: Math.max(0, Math.round(rect.top)),
  left: Math.max(0, Math.round(rect.left)),
  right: Math.max(0, Math.round(getViewportWidth() - rect.right)),
  bottom: Math.max(0, Math.round(getViewportHeight() - rect.bottom)),
});

const getArea = (rect: DOMRect | DOMRectReadOnly) => rect.width * rect.height;

const scoreContentCandidate = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  if (!isVisible(rect)) {
    return -1;
  }

  const semanticBonus = element.matches('main, [role="main"]') ? 1_000_000_000 : 0;
  const viewportBonus = rect.left >= 0 && rect.top >= 0 ? 100_000_000 : 0;
  return semanticBonus + viewportBonus + getArea(rect);
};

export const findSidebarRoot = (root: ParentNode = document) => {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('aside, nav, [role="navigation"]'));
  return candidates.find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left < 100 && rect.width < 360 && rect.height > getViewportHeight() / 2;
  });
};

export const findHeaderRoot = (root: ParentNode = document) => {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('header, [role="banner"]'));
  return candidates.find((element) => element.getBoundingClientRect().height >= 48);
};

export const findContentRoot = (root: ParentNode = document) => {
  const pickBestCandidate = (candidates: HTMLElement[]) =>
    candidates
      .map((element) => ({element, score: scoreContentCandidate(element)}))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)[0]?.element;

  const semanticCandidates = Array.from(root.querySelectorAll<HTMLElement>('main, [role="main"]'));
  const semanticContent = pickBestCandidate(semanticCandidates);
  if (semanticContent) {
    return semanticContent;
  }

  const sidebar = findSidebarRoot(root);
  const expectedLeftEdge = sidebar ? Math.round(sidebar.getBoundingClientRect().right) : 0;
  const genericCandidates = Array.from(root.querySelectorAll<HTMLElement>('[data-testid*="main"], [data-testid*="content"]')).filter(
    (element) => {
      const rect = element.getBoundingClientRect();
      return rect.left <= expectedLeftEdge + 48 && rect.width >= getViewportWidth() * 0.55;
    },
  );

  return pickBestCandidate(genericCandidates);
};

export const resolveEmbeddedHostInsets = (root: ParentNode = document): HostInsets => {
  const sidebar = findSidebarRoot(root);
  const header = findHeaderRoot(root);
  const fallbackTop = header ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0;
  const fallbackLeft = sidebar ? Math.max(0, Math.round(sidebar.getBoundingClientRect().right)) : 0;
  const content = findContentRoot(root);
  if (content) {
    const contentInsets = toHostInsets(content.getBoundingClientRect());
    return {
      top: Math.max(contentInsets.top, fallbackTop),
      left: Math.max(contentInsets.left, fallbackLeft),
      right: contentInsets.right,
      bottom: contentInsets.bottom,
    };
  }

  return {
    top: fallbackTop,
    left: fallbackLeft,
    right: 0,
    bottom: 0,
  };
};

export const captureEmbeddedAppearance = (root: ParentNode = document): EmbeddedAppearance => {
  const sources = [findContentRoot(root), findHeaderRoot(root), document.body].filter(
    (entry): entry is HTMLElement => Boolean(entry),
  );

  const fontFamily = sources
    .map((source) => window.getComputedStyle(source).fontFamily)
    .find((value) => value.trim().length > 0);

  const backgroundColor = sources
    .map((source) => window.getComputedStyle(source).backgroundColor)
    .find((value) => !UNHELPFUL_BACKGROUNDS.has(value));

  return {
    fontFamily: fontFamily || undefined,
    backgroundColor: backgroundColor || undefined,
  };
};
