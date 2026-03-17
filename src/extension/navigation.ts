const NAV_ITEM_SELECTOR = 'a[href], button, [role="button"], [role="link"]';
const MANAGER_LABEL = 'CMH Manager';
const MANAGER_NAV_ATTR = 'data-cmh-manager-nav';
const MANAGER_STATE_ATTR = 'data-cmh-manager-active';
const MANAGER_TEMPLATE_ATTR = 'data-cmh-manager-template';
const MANAGER_HREF_ATTR = 'data-cmh-manager-href';

interface SidebarNavItem {
  container: HTMLElement;
  interactive: HTMLElement;
  active: boolean;
}

interface ManagerNavOptions {
  active: boolean;
  href: string;
  onActivate: (event: MouseEvent | KeyboardEvent) => void;
}

const normalizeText = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? '';

const getClassName = (element: Element) => (typeof (element as HTMLElement).className === 'string' ? (element as HTMLElement).className : '');

const isElementVisible = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const isActiveNavItem = (element: HTMLElement) => {
  if (element.getAttribute('aria-current') === 'page') {
    return true;
  }

  if (element.getAttribute('aria-selected') === 'true') {
    return true;
  }

  if (element.hasAttribute('data-active')) {
    return true;
  }

  if (element.getAttribute('data-state') === 'active') {
    return true;
  }

  return /\b(active|selected|current)\b/.test(getClassName(element).toLowerCase());
};

const resolveNavItemContainer = (interactive: HTMLElement, sidebar: HTMLElement) => {
  let current = interactive;

  while (current.parentElement && current.parentElement !== sidebar) {
    const parent = current.parentElement;
    if (parent.querySelectorAll(NAV_ITEM_SELECTOR).length > 1) {
      break;
    }
    current = parent;
  }

  return current;
};

const findPrimaryInteractive = (container: HTMLElement) =>
  (container.matches(NAV_ITEM_SELECTOR) ? container : container.querySelector<HTMLElement>(NAV_ITEM_SELECTOR)) ?? container;

const findLabelElement = (interactive: HTMLElement) => {
  const walker = document.createTreeWalker(interactive, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return normalizeText(node.textContent).length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  const textNode = walker.nextNode();
  return textNode?.parentElement ?? interactive;
};

const findIconElement = (interactive: HTMLElement) => interactive.querySelector<HTMLElement>('svg, img');

const getNodePath = (node: Node, ancestor: Node) => {
  const path: number[] = [];
  let current: Node | null = node;

  while (current && current !== ancestor) {
    const parent: Node | null = current.parentNode;
    if (!parent) {
      return null;
    }
    path.push(Array.prototype.indexOf.call(parent.childNodes, current));
    current = parent;
  }

  return current === ancestor ? path.reverse() : null;
};

const getNodeAtPath = <T extends Node>(ancestor: Node, path: number[] | null) => {
  if (!path) {
    return null;
  }

  let current: Node | null = ancestor;
  for (const index of path) {
    current = current?.childNodes[index] ?? null;
    if (!current) {
      return null;
    }
  }

  return current as T;
};

const removeDuplicateIds = (container: HTMLElement) => {
  container.querySelectorAll<HTMLElement>('[id]').forEach((element) => element.removeAttribute('id'));
  container.removeAttribute('id');
};

const copyIconSizing = (icon: SVGSVGElement, templateIcon: HTMLElement | null) => {
  if (!templateIcon) {
    return;
  }

  const className = getClassName(templateIcon);
  if (className) {
    icon.setAttribute('class', className);
  }

  const width = templateIcon.getAttribute('width');
  const height = templateIcon.getAttribute('height');
  if (width) {
    icon.setAttribute('width', width);
  }
  if (height) {
    icon.setAttribute('height', height);
  }

  const ariaHidden = templateIcon.getAttribute('aria-hidden');
  if (ariaHidden) {
    icon.setAttribute('aria-hidden', ariaHidden);
  }
};

const createManagerIcon = (templateIcon: HTMLElement | null) => {
  const ns = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(ns, 'svg');
  icon.setAttribute('viewBox', '0 0 20 20');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '1.8');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('width', '20');
  icon.setAttribute('height', '20');
  icon.setAttribute('aria-hidden', 'true');
  copyIconSizing(icon, templateIcon);

  const topLine = document.createElementNS(ns, 'path');
  topLine.setAttribute('d', 'M4 5h12');
  icon.appendChild(topLine);

  const middleLine = document.createElementNS(ns, 'path');
  middleLine.setAttribute('d', 'M4 10h12');
  icon.appendChild(middleLine);

  const bottomLine = document.createElementNS(ns, 'path');
  bottomLine.setAttribute('d', 'M4 15h12');
  icon.appendChild(bottomLine);

  const topKnob = document.createElementNS(ns, 'circle');
  topKnob.setAttribute('cx', '8');
  topKnob.setAttribute('cy', '5');
  topKnob.setAttribute('r', '1.5');
  topKnob.setAttribute('fill', 'currentColor');
  topKnob.setAttribute('stroke', 'none');
  icon.appendChild(topKnob);

  const middleKnob = document.createElementNS(ns, 'circle');
  middleKnob.setAttribute('cx', '12');
  middleKnob.setAttribute('cy', '10');
  middleKnob.setAttribute('r', '1.5');
  middleKnob.setAttribute('fill', 'currentColor');
  middleKnob.setAttribute('stroke', 'none');
  icon.appendChild(middleKnob);

  const bottomKnob = document.createElementNS(ns, 'circle');
  bottomKnob.setAttribute('cx', '6');
  bottomKnob.setAttribute('cy', '15');
  bottomKnob.setAttribute('r', '1.5');
  bottomKnob.setAttribute('fill', 'currentColor');
  bottomKnob.setAttribute('stroke', 'none');
  icon.appendChild(bottomKnob);

  return icon;
};

const collectSidebarNavItems = (sidebar: HTMLElement) => {
  const items: SidebarNavItem[] = [];
  const seen = new Set<HTMLElement>();
  const candidates = Array.from(sidebar.querySelectorAll<HTMLElement>(NAV_ITEM_SELECTOR));

  for (const interactive of candidates) {
    if (interactive.closest(`[${MANAGER_NAV_ATTR}="true"]`)) {
      continue;
    }

    const label = normalizeText(interactive.textContent);
    if (!label || !isElementVisible(interactive)) {
      continue;
    }

    const container = resolveNavItemContainer(interactive, sidebar);
    if (seen.has(container)) {
      continue;
    }

    seen.add(container);
    items.push({
      container,
      interactive,
      active: isActiveNavItem(interactive) || isActiveNavItem(container),
    });
  }

  return items;
};

const getTemplateItem = (sidebar: HTMLElement, active: boolean) => {
  const items = collectSidebarNavItems(sidebar);

  if (active) {
    return items.find((item) => item.active) ?? items[items.length - 1] ?? null;
  }

  const inactive = [...items].reverse().find((item) => !item.active);
  return inactive ?? items[items.length - 1] ?? null;
};

const createFallbackManagerButton = ({active, href, onActivate}: ManagerNavOptions) => {
  const button = document.createElement('a');
  button.href = href;
  button.setAttribute(MANAGER_NAV_ATTR, 'true');
  button.setAttribute(MANAGER_STATE_ATTR, String(active));
  button.setAttribute(MANAGER_TEMPLATE_ATTR, 'fallback');
  button.setAttribute(MANAGER_HREF_ATTR, href);
  button.style.width = '100%';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.gap = '14px';
  button.style.padding = '12px 16px';
  button.style.borderRadius = '12px';
  button.style.color = 'white';
  button.style.textDecoration = 'none';
  button.style.fontWeight = '500';
  button.style.fontSize = '16px';
  button.style.lineHeight = '1.25';
  button.style.background = active ? '#5c2ee5' : 'transparent';

  button.appendChild(createManagerIcon(null));

  const label = document.createElement('span');
  label.textContent = MANAGER_LABEL;
  button.appendChild(label);

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onActivate(event);
  });

  button.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onActivate(event);
  });

  return button;
};

const createManagerNavItemFromTemplate = (template: SidebarNavItem, {active, href, onActivate}: ManagerNavOptions) => {
  const interactivePath = getNodePath(template.interactive, template.container);
  const labelPath = getNodePath(findLabelElement(template.interactive), template.container);
  const templateIcon = findIconElement(template.interactive);
  const iconPath = templateIcon ? getNodePath(templateIcon, template.container) : null;
  const clone = template.container.cloneNode(true) as HTMLElement;

  removeDuplicateIds(clone);
  clone.setAttribute(MANAGER_NAV_ATTR, 'true');
  clone.setAttribute(MANAGER_STATE_ATTR, String(active));
  clone.setAttribute(MANAGER_HREF_ATTR, href);
  clone.setAttribute(
    MANAGER_TEMPLATE_ATTR,
    [template.container.tagName, getClassName(template.container), getClassName(template.interactive), active ? 'active' : 'inactive'].join('|'),
  );

  const cloneInteractive = getNodeAtPath<HTMLElement>(clone, interactivePath) ?? findPrimaryInteractive(clone);
  const cloneLabel = getNodeAtPath<HTMLElement>(clone, labelPath) ?? findLabelElement(cloneInteractive);
  const cloneIcon = (iconPath ? getNodeAtPath<HTMLElement>(clone, iconPath) : null) ?? findIconElement(cloneInteractive);

  cloneInteractive.removeAttribute('id');
  cloneInteractive.setAttribute(MANAGER_NAV_ATTR, 'true');
  cloneInteractive.setAttribute('aria-label', MANAGER_LABEL);
  if (cloneInteractive instanceof HTMLAnchorElement) {
    cloneInteractive.href = href;
  } else if (cloneInteractive instanceof HTMLButtonElement) {
    cloneInteractive.type = 'button';
  } else {
    cloneInteractive.setAttribute('role', 'button');
    cloneInteractive.setAttribute('tabindex', '0');
  }

  cloneLabel.textContent = MANAGER_LABEL;
  const managerIcon = createManagerIcon(cloneIcon);
  if (cloneIcon) {
    cloneIcon.replaceWith(managerIcon);
  } else {
    cloneInteractive.insertBefore(managerIcon, cloneInteractive.firstChild);
  }

  if (active) {
    cloneInteractive.setAttribute('aria-current', 'page');
  } else if (cloneInteractive.getAttribute('aria-current') === 'page') {
    cloneInteractive.removeAttribute('aria-current');
  }

  const activate = (event: MouseEvent | KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onActivate(event);
  };

  clone.addEventListener('click', activate, true);
  clone.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        activate(event);
      }
    },
    true,
  );

  return clone;
};

const getExistingManagerNavItem = (sidebar: HTMLElement) => sidebar.querySelector<HTMLElement>(`[${MANAGER_NAV_ATTR}="true"]`);

export const syncManagerNavItem = (sidebar: HTMLElement, options: ManagerNavOptions) => {
  const template = getTemplateItem(sidebar, options.active);
  const templateKey =
    template === null
      ? 'fallback'
      : [template.container.tagName, getClassName(template.container), getClassName(template.interactive), options.active ? 'active' : 'inactive'].join(
          '|',
        );
  const existing = getExistingManagerNavItem(sidebar);

  if (
    existing &&
    existing.getAttribute(MANAGER_STATE_ATTR) === String(options.active) &&
    existing.getAttribute(MANAGER_TEMPLATE_ATTR) === templateKey &&
    existing.getAttribute(MANAGER_HREF_ATTR) === options.href
  ) {
    return existing;
  }

  const nextItem = template ? createManagerNavItemFromTemplate(template, options) : createFallbackManagerButton(options);
  if (existing) {
    existing.replaceWith(nextItem);
  } else {
    sidebar.appendChild(nextItem);
  }

  return nextItem;
};

export const shouldDeactivateManagerFromTarget = (sidebar: HTMLElement, target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest(`[${MANAGER_NAV_ATTR}="true"]`)) {
    return false;
  }

  return collectSidebarNavItems(sidebar).some((item) => item.container.contains(target));
};
