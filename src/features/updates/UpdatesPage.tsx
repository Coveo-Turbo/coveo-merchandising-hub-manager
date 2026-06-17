import {useEffect, useState} from 'react';
import {Alert, Badge, Button, Card, Group, Header, Stack, Text} from '@coveord/plasma-mantine';
import {IconAlertTriangle, IconDownload, IconExternalLink} from '@coveord/plasma-react-icons';
import {MarkdownContent} from '../../components/MarkdownContent';
import {fetchGitHubReleases, getReleaseFeedFallbackUrl, type ReleaseNote} from '../../services/githubReleases';

const releaseDateFormatter = new Intl.DateTimeFormat('en', {dateStyle: 'long'});

const formatReleaseDate = (value: string | null) => {
  if (!value) {
    return 'Publication date unavailable';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : releaseDateFormatter.format(date);
};

export const UpdatesPage = () => {
  const [releases, setReleases] = useState<ReleaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const nextReleases = await fetchGitHubReleases();
        if (!cancelled) {
          setReleases(nextReleases);
          setError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Unable to load GitHub releases.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Stack gap="lg">
      <Header description="Recent release notes are loaded from the public GitHub Releases feed so the page stays current without a separate changelog.">
        What&apos;s new
      </Header>

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <Stack gap={4}>
            <Text fw={600}>Release notes</Text>
            <Text size="sm" c="dimmed">
              Browse the latest shipped changes and open the full GitHub release page when you need more context.
            </Text>
          </Stack>

          <Button
            component="a"
            href={getReleaseFeedFallbackUrl()}
            target="_blank"
            rel="noreferrer"
            variant="default"
            leftSection={<IconExternalLink size={16} />}
          >
            Open GitHub Releases
          </Button>
        </Group>
      </Card>

      {loading ? (
        <Card withBorder radius="md" padding="lg">
          <Text>Loading release notes…</Text>
        </Card>
      ) : null}

      {!loading && error ? (
        <Alert color="yellow" variant="light" title="Release notes unavailable" icon={<IconAlertTriangle size={16} />}>
          <Stack gap="sm">
            <Text size="sm">{error}</Text>
            <Group>
              <Button
                component="a"
                href={getReleaseFeedFallbackUrl()}
                target="_blank"
                rel="noreferrer"
                variant="default"
                leftSection={<IconExternalLink size={16} />}
              >
                View releases on GitHub
              </Button>
            </Group>
          </Stack>
        </Alert>
      ) : null}

      {!loading && !error && releases.length === 0 ? (
        <Card withBorder radius="md" padding="lg">
          <Text>No published releases were found.</Text>
        </Card>
      ) : null}

      {!loading && !error
        ? releases.map((release, index) => (
            <Card key={release.tagName} withBorder radius="md" padding="lg">
              <Stack gap="md">
                <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                  <Stack gap={4}>
                    <Group gap="xs" wrap="wrap">
                      <Text fw={700}>{release.title}</Text>
                      {index === 0 ? (
                        <Badge color="violet" variant="light">
                          Latest
                        </Badge>
                      ) : null}
                    </Group>
                    <Text size="sm" c="dimmed">
                      {release.tagName} · {formatReleaseDate(release.publishedAt)}
                    </Text>
                  </Stack>

                  <Group gap="sm" wrap="wrap">
                    {release.extensionDownloadUrl ? (
                      <Button
                        component="a"
                        href={release.extensionDownloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        variant="light"
                        color="violet"
                        leftSection={<IconDownload size={16} />}
                      >
                        Download extension
                      </Button>
                    ) : null}
                    <Button
                      component="a"
                      href={release.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      variant="default"
                      leftSection={<IconExternalLink size={16} />}
                    >
                      View on GitHub
                    </Button>
                  </Group>
                </Group>

                <MarkdownContent content={release.body} />
              </Stack>
            </Card>
          ))
        : null}
    </Stack>
  );
};
