import {useEffect, useMemo, useState} from 'react';
import {Badge, Button, Card, Group, Header, Stack, Text} from '@coveord/plasma-mantine';
import {IconExternalLink} from '@coveord/plasma-react-icons';
import {MarkdownContent} from '../../components/MarkdownContent';
import {getRepositoryUrl} from '../../core/env';
import {toSlug} from '../../utils/markdown';
import {docsArticles, type DocsArticle} from './docsArticles';

const docsArticlesByPath = new Map(docsArticles.map((article) => [article.sourcePath, article]));

const normalizeRepoPath = (value: string) => {
  const normalizedSegments: string[] = [];

  value
    .replace(/^\/+/, '')
    .split('/')
    .forEach((segment) => {
      if (!segment || segment === '.') {
        return;
      }

      if (segment === '..') {
        normalizedSegments.pop();
        return;
      }

      normalizedSegments.push(segment);
    });

  return normalizedSegments.join('/');
};

const resolveRelativeRepoPath = (sourcePath: string, href: string) => {
  const sourceSegments = sourcePath.split('/');
  sourceSegments.pop();
  return normalizeRepoPath([...sourceSegments, href].join('/'));
};

const resolveArticleAnchor = (article: DocsArticle, hash: string) => {
  const headingSlug = toSlug(hash.replace(/^#/, ''));
  return headingSlug ? `#${article.slug}-${headingSlug}` : `#${article.slug}`;
};

const resolveDocsHref = (article: DocsArticle, href: string) => {
  if (/^(https?:)?\/\//.test(href) || href.startsWith('mailto:')) {
    return href;
  }

  const [pathPart, hashPart = ''] = href.split('#');
  const hash = hashPart ? `#${hashPart}` : '';

  if (!pathPart) {
    return resolveArticleAnchor(article, hash);
  }

  const resolvedPath = resolveRelativeRepoPath(article.sourcePath, pathPart);
  const targetArticle = docsArticlesByPath.get(resolvedPath);

  if (targetArticle) {
    return resolveArticleAnchor(targetArticle, hash);
  }

  return `${getRepositoryUrl()}/blob/main/${resolvedPath}${hash}`;
};

const getSelectedArticle = (hash: string) => {
  const normalizedHash = hash.replace(/^#/, '');

  if (!normalizedHash) {
    return docsArticles[0];
  }

  return (
    docsArticles.find((article) => article.slug === normalizedHash || normalizedHash.startsWith(`${article.slug}-`)) ??
    docsArticles[0]
  );
};

const getHeadingTargetId = (hash: string, fallbackArticle: DocsArticle) => {
  const normalizedHash = hash.replace(/^#/, '');
  return normalizedHash || fallbackArticle.slug;
};

const getArticleHash = (article: DocsArticle) => `#${article.slug}`;

export const DocsPage = () => {
  const [activeHash, setActiveHash] = useState(() => window.location.hash);

  const selectedArticle = useMemo(() => getSelectedArticle(activeHash), [activeHash]);
  const selectedArticleIndex = docsArticles.findIndex((article) => article.slug === selectedArticle.slug);
  const previousArticle = selectedArticleIndex > 0 ? docsArticles[selectedArticleIndex - 1] : null;
  const nextArticle = selectedArticleIndex < docsArticles.length - 1 ? docsArticles[selectedArticleIndex + 1] : null;

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash);

    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const targetId = getHeadingTargetId(activeHash, selectedArticle);
      const target = document.getElementById(targetId) as HTMLElement | null;
      target?.scrollIntoView?.({block: 'start'});
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeHash, selectedArticle]);

  return (
    <Stack gap="lg">
      <Card withBorder radius="xl" padding="xl">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
            <Stack gap="xs" style={{maxWidth: '48rem'}}>
              <Badge color="violet" variant="light" size="lg">
                {docsArticles.length} guides
              </Badge>
              <Header description="Start with the architecture view, then move into setup, APIs, ranking rules, and automation references.">
                Documentation
              </Header>
            </Stack>

            <Button
              component="a"
              href={getRepositoryUrl()}
              target="_blank"
              rel="noreferrer"
              variant="default"
              leftSection={<IconExternalLink size={16} />}
            >
              Open repository
            </Button>
          </Group>

          <Text size="sm" c="dimmed">
            Pick a guide from the navigation and keep a shareable URL for the exact article or heading you are reading.
          </Text>
        </Stack>
      </Card>

      <div className="cmh-docs-layout">
        <aside className="cmh-docs-sidebar">
          <Card withBorder radius="xl" padding="lg">
            <Stack gap="md">
              <Stack gap={4}>
                <Text fw={600}>Browse guides</Text>
                <Text size="sm" c="dimmed">
                  Jump between onboarding, architecture, APIs, and operational references.
                </Text>
              </Stack>

              <Stack gap="sm">
                {docsArticles.map((article) => {
                  const isActive = selectedArticle.slug === article.slug;

                  return (
                    <div key={article.slug}>
                      <Button
                        component="a"
                        href={getArticleHash(article)}
                        variant={isActive ? 'filled' : 'light'}
                        color="violet"
                        fullWidth
                        className="cmh-docs-nav-button"
                      >
                        {article.title}
                      </Button>
                      <Text size="xs" c="dimmed" mt={6}>
                        {article.description}
                      </Text>
                    </div>
                  );
                })}
              </Stack>
            </Stack>
          </Card>
        </aside>

        <div className="cmh-docs-content">
          <Card key={selectedArticle.slug} id={selectedArticle.slug} withBorder radius="xl" padding="xl">
            <Stack gap="lg">
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  {selectedArticle.title}
                </Text>
                <Text size="sm" c="dimmed">
                  {selectedArticle.description}
                </Text>
              </Stack>

              <div className="cmh-docs-prose">
                <MarkdownContent
                  content={selectedArticle.content}
                  headingIdPrefix={selectedArticle.slug}
                  resolveHref={(href) => resolveDocsHref(selectedArticle, href)}
                />
              </div>

              <Group justify="space-between" align="stretch" wrap="wrap" gap="md">
                {previousArticle ? (
                  <Button component="a" href={getArticleHash(previousArticle)} variant="default">
                    Previous: {previousArticle.title}
                  </Button>
                ) : (
                  <span />
                )}

                {nextArticle ? (
                  <Button component="a" href={getArticleHash(nextArticle)} variant="light" color="violet">
                    Next: {nextArticle.title}
                  </Button>
                ) : null}
              </Group>
            </Stack>
          </Card>
        </div>
      </div>
    </Stack>
  );
};
