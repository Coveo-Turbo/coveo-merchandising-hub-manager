import {createElement, isValidElement, type ComponentPropsWithoutRef, type ReactNode} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {toSlug} from '../utils/markdown';

const getTextContent = (value: ReactNode): string => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => getTextContent(entry)).join('');
  }

  if (isValidElement<{children?: ReactNode}>(value)) {
    return getTextContent(value.props.children);
  }

  return '';
};

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const createHeadingRenderer =
  (tag: HeadingTag, headingIdPrefix?: string) =>
  ({children, ...props}: ComponentPropsWithoutRef<'h1'>) => {
    const slug = toSlug(getTextContent(children));
    const id = slug ? (headingIdPrefix ? `${headingIdPrefix}-${slug}` : slug) : undefined;

    return createElement(tag, {...props, id}, children);
  };

export interface MarkdownContentProps {
  content: string;
  headingIdPrefix?: string;
  resolveHref?: (href: string) => string;
}

export const MarkdownContent = ({content, headingIdPrefix, resolveHref}: MarkdownContentProps) => (
  <div className="cmh-markdown">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({href, children, ...props}) => {
          const resolvedHref = href ? resolveHref?.(href) ?? href : undefined;

          if (!resolvedHref) {
            return <span>{children}</span>;
          }

          const isExternal = /^(https?:)?\/\//.test(resolvedHref);

          return (
            <a
              {...props}
              href={resolvedHref}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noreferrer' : undefined}
            >
              {children}
            </a>
          );
        },
        h1: createHeadingRenderer('h1', headingIdPrefix),
        h2: createHeadingRenderer('h2', headingIdPrefix),
        h3: createHeadingRenderer('h3', headingIdPrefix),
        h4: createHeadingRenderer('h4', headingIdPrefix),
        h5: createHeadingRenderer('h5', headingIdPrefix),
        h6: createHeadingRenderer('h6', headingIdPrefix),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
