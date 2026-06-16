import {useMediaQuery} from '@mantine/hooks';
import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  FileInput,
  Group,
  Header,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  ThemeIcon,
} from '@coveord/plasma-mantine';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconExternalLink,
  IconFileUpload,
  IconSparkles,
} from '@coveord/plasma-react-icons';
import type {ManagerController} from '../../hooks/useManagerController';

interface ListingsSectionProps {
  controller: ManagerController;
}

export const ListingsSection = ({controller}: ListingsSectionProps) => {
  const isMobile = useMediaQuery('(max-width: 48em)');

  return (
    <Stack gap="lg">
      <Header description="Import listing pages from CSV, review the generated rules, and publish them to Merchandising Hub.">
        Listings
      </Header>

      {controller.session ? (
        <>
          <Card withBorder radius="md" padding="lg">
            <Stack gap="lg">
              <Stepper active={controller.listingStep - 1} allowNextStepsSelect={false} orientation={isMobile ? 'vertical' : 'horizontal'}>
                <Stepper.Step label="Connect" description="Resolve org context" />
                <Stepper.Step label="Upload" description="Load CSV input" />
                <Stepper.Step label="Preview" description="Review before publish" />
                <Stepper.Step label="Publish" description="Push to CMH" />
              </Stepper>

              {controller.listingStep <= 2 && (
                <Stack gap="md">
                  <Group justify="space-between" wrap="wrap">
                    <Stack gap={4}>
                      <Text fw={600}>Upload listing definitions</Text>
                      <Text size="sm" c="dimmed">
                        Supported columns: <Code>Name</Code>, <Code>UrlPattern</Code>, <Code>FilterField</Code>, <Code>FilterValue</Code>,{' '}
                        <Code>FilterOperator</Code>, <Code>Language</Code>, <Code>Country</Code>, <Code>Currency</Code>.
                      </Text>
                    </Stack>
                    <Badge color="violet" variant="light">
                      {controller.session.trackingId}
                    </Badge>
                  </Group>

                  <FileInput
                    label="CSV file"
                    accept=".csv"
                    leftSection={<IconFileUpload size={16} />}
                    placeholder="Choose a CSV file"
                    onChange={(file) => void controller.handleFileUpload(file)}
                  />

                  <Alert color="blue" variant="light" title="CSV behavior">
                    Rows sharing the same <Code>Name</Code> are merged into a single listing page. Separate multiple URL patterns or
                    filter values with semicolons.
                  </Alert>
                </Stack>
              )}

              {controller.listingStep === 3 && (
                <Stack gap="md">
                  <Group justify="space-between" wrap="wrap">
                    <Stack gap={4}>
                      <Text fw={600}>Preview parsed listings</Text>
                      <Text size="sm" c="dimmed">
                        Review patterns and generated rules before you publish them.
                      </Text>
                    </Stack>
                    <Badge color="teal" variant="light">
                      {controller.parsedListings.length} listing(s)
                    </Badge>
                  </Group>

                  <SimpleGrid cols={{base: 1, md: 2}} spacing="md">
                    {controller.parsedListings.map((listing, index) => (
                      <Card key={`${listing.name}-${index}`} withBorder radius="md" padding="md">
                        <Stack gap="sm">
                          <Group justify="space-between" align="flex-start">
                            <Stack gap={2}>
                              <Text fw={600}>{listing.name}</Text>
                              <Text size="sm" c="dimmed">
                                {listing.patterns.length} URL pattern(s), {listing.pageRules.length} rule(s)
                              </Text>
                            </Stack>
                            <Button
                              variant="light"
                              color="violet"
                              leftSection={<IconSparkles size={16} />}
                              onClick={() => void controller.enhanceListing(index)}
                              loading={controller.loading}
                            >
                              AI enhance
                            </Button>
                          </Group>

                          <Stack gap={6}>
                            {listing.patterns.map((pattern) => (
                              <Group key={pattern.url} gap="xs" wrap="nowrap" align="flex-start">
                                <ThemeIcon variant="light" size="sm" radius="xl" color="gray" style={{flexShrink: 0}}>
                                  <IconExternalLink size={16} />
                                </ThemeIcon>
                                <Code style={{whiteSpace: 'normal'}}>{pattern.url}</Code>
                              </Group>
                            ))}
                          </Stack>

                          <Stack gap={8}>
                            {listing.pageRules.map((rule) => (
                              <Card key={rule.name} withBorder radius="sm" padding="sm" bg={rule.name.startsWith('AI Suggested') ? 'violet.0' : undefined}>
                                <Stack gap={4}>
                                  <Group gap="xs">
                                    <Text fw={600} size="sm">
                                      {rule.name}
                                    </Text>
                                    {rule.name.startsWith('AI Suggested') && (
                                      <Badge color="violet" variant="light">
                                        AI
                                      </Badge>
                                    )}
                                  </Group>
                                  <Text size="sm" c="dimmed">
                                    {rule.filters
                                      .map((filter) => {
                                        const values = filter.value.values?.join('; ') ?? String(filter.value.value ?? '');
                                        return `${filter.fieldName} ${filter.operator} "${values}"`;
                                      })
                                      .join(', ')}
                                  </Text>
                                  {rule.locales?.[0] && (
                                    <Code>{[rule.locales[0].language, rule.locales[0].country, rule.locales[0].currency].filter(Boolean).join('-')}</Code>
                                  )}
                                </Stack>
                              </Card>
                            ))}
                          </Stack>
                        </Stack>
                      </Card>
                    ))}
                  </SimpleGrid>

                  <Group justify="flex-end">
                    <Button variant="default" onClick={controller.resetListings}>
                      Reset upload
                    </Button>
                    <Button leftSection={<IconArrowRight size={16} />} onClick={() => void controller.submitListings()} loading={controller.loading}>
                      Push to CMH
                    </Button>
                  </Group>
                </Stack>
              )}

              {controller.listingStep === 4 && (
                <Card withBorder radius="md" padding="xl">
                  <Stack gap="md" align="center">
                    <ThemeIcon size={56} radius="xl" color="teal" variant="light" style={{flexShrink: 0}}>
                      <IconCheck size={24} />
                    </ThemeIcon>
                    <Stack gap={4} align="center">
                      <Text fw={700} size="lg">
                        Listings published
                      </Text>
                      <Text c="dimmed" ta="center">
                        The listing payload has been sent to Merchandising Hub for <Code>{controller.session.trackingId}</Code>.
                      </Text>
                    </Stack>
                    <Button onClick={controller.resetListings}>Upload another CSV</Button>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Card>
        </>
      ) : (
        <Alert color="yellow" variant="light" title="Connection required" icon={<IconAlertTriangle size={16} />}>
          Open the Connection workspace to refresh the Hub session or connect manually before you import listing pages.
        </Alert>
      )}
    </Stack>
  );
};
