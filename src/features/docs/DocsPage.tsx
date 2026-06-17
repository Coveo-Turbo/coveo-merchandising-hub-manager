import {Button, Card, Group, Header, Stack, Text} from '@coveord/plasma-mantine';
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

export const DocsPage = () => (
  <Stack gap="lg">
    <Header description="Learn the tool from the same markdown sources that live in the repository, with quick access to setup, API usage, and bulk-management guides.">
      Documentation
    </Header>

    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Stack gap={4}>
          <Text fw={600}>Browse by topic</Text>
          <Text size="sm" c="dimmed">
            Jump to the guide you need, or open the repository if you want the raw markdown sources.
          </Text>
        </Stack>

        <Group gap="sm" wrap="wrap">
          {docsArticles.map((article) => (
            <Button key={article.slug} component="a" href={`#${article.slug}`} variant="light" color="violet">
              {article.title}
            </Button>
          ))}

          <Button
            component="a"
            href={getRepositoryUrl()}
            target="_blank"
            rel="noreferrer"
            variant="default"
            leftSection={<IconExternalLink size={16} />}
          >
            Repository
          </Button>
        </Group>
      </Stack>
    </Card>

    {docsArticles.map((article) => (
      <Card key={article.slug} id={article.slug} withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              {article.title}
            </Text>
            <Text size="sm" c="dimmed">
              {article.description}
            </Text>
          </Stack>

          <MarkdownContent
            content={article.content}
            headingIdPrefix={article.slug}
            resolveHref={(href) => resolveDocsHref(article, href)}
          />
        </Stack>
      </Card>
    ))}
  </Stack>
);
