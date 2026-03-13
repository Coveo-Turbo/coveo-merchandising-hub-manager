import {
  Alert,
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Header,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@coveord/plasma-mantine';
import {
  IconAlertTriangle,
  IconDownload,
  IconFileUpload,
  IconRefreshAlert,
  IconSparkles,
} from '@coveord/plasma-react-icons';
import type {ManagerController} from '../../hooks/useManagerController';
import type {MerchandisingHubRulePayload, RuleModel} from '../../types';
import {embeddedInputStyles, embeddedSegmentedControlStyles} from '../../ui/embeddedControlStyles';

interface RulesSectionProps {
  controller: ManagerController;
}

const getRuleRecord = (item: RuleModel | MerchandisingHubRulePayload) => ('rule' in item ? item.rule : item);
const getConditionCount = (item: RuleModel | MerchandisingHubRulePayload) =>
  'rule' in item ? item.rule.filters?.length ?? 0 : item.conditions?.length ?? 0;

export const RulesSection = ({controller}: RulesSectionProps) => {
  const isEmbedded = controller.runtime === 'extension';
  const segmentedControlStyles = isEmbedded ? embeddedSegmentedControlStyles : undefined;
  const inputStyles = isEmbedded ? embeddedInputStyles : undefined;

  return (
    <Stack gap="lg">
      <Header description="Fetch, review, export, and import private ranking or filter rules for search and listing experiences.">
        Rules
      </Header>

      {!controller.session ? (
        <Alert color="yellow" variant="light" title="Connection required" icon={<IconAlertTriangle size={16} />}>
          Connect first to manage rules.
        </Alert>
      ) : (
        <>
          <Card withBorder radius="md" padding="lg">
            <Stack gap="md">
              <Group justify="space-between" wrap="wrap">
                <SegmentedControl
                  value={controller.rankingRulesType}
                  onChange={(value) => controller.setRankingRulesType(value as 'ranking' | 'filter')}
                  styles={segmentedControlStyles}
                  data={[
                    {label: 'Ranking', value: 'ranking'},
                    {label: 'Filter', value: 'filter'},
                  ]}
                />
                <SegmentedControl
                  value={controller.rankingRulesSolutionType}
                  onChange={(value) => controller.setRankingRulesSolutionType(value as 'listing' | 'search')}
                  styles={segmentedControlStyles}
                  data={[
                    {label: 'Listing', value: 'listing'},
                    {label: 'Search', value: 'search'},
                  ]}
                />
              </Group>

              <Group gap="sm">
                <Button variant="default" leftSection={<IconRefreshAlert size={16} />} onClick={() => void controller.fetchRankingRules()} loading={controller.loading}>
                  Fetch rules
                </Button>
                <Button variant="light" leftSection={<IconDownload size={16} />} onClick={controller.exportRankingRules} disabled={controller.rankingRulesData.length === 0}>
                  Download JSON
                </Button>
              </Group>
            </Stack>
          </Card>

          {controller.rankingRulesData.length > 0 && (
            <SimpleGrid cols={{base: 1, md: 2}} spacing="md">
              {controller.rankingRulesData.map((item, index) => {
                const rule = getRuleRecord(item);
                const conditionCount = getConditionCount(item);
                return (
                  <Card key={`${rule.name}-${index}`} withBorder radius="md" padding="md">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600}>{rule.name}</Text>
                        <Badge variant="light">{rule.action}</Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {rule.description || 'No description'}
                      </Text>
                      <Text size="sm">
                        Status: {rule.enabled === false ? 'Disabled' : 'Enabled'}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Conditions: {conditionCount}
                      </Text>
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          )}

          <Card withBorder radius="md" padding="lg">
            <Stack gap="md">
              <Group justify="space-between" wrap="wrap">
                <Stack gap={4}>
                  <Text fw={600}>Import rules</Text>
                  <Text size="sm" c="dimmed">
                    Load a JSON export, review it, then import it into the currently selected tracking ID.
                  </Text>
                </Stack>
                <FileInput
                  accept=".json"
                  placeholder="Choose JSON file"
                  leftSection={<IconFileUpload size={16} />}
                  onChange={(file) => void controller.loadRankingRulesFile(file)}
                  styles={inputStyles}
                />
              </Group>

              <Textarea
                minRows={14}
                autosize
                readOnly
                value={controller.rankingRulesJSON}
                styles={{...inputStyles, input: {...inputStyles?.input, fontFamily: 'monospace'}}}
              />

              <Group justify="flex-end">
                <Button
                  leftSection={<IconSparkles size={16} />}
                  onClick={() => void controller.importRankingRules()}
                  loading={controller.loading}
                  disabled={controller.rankingRulesData.length === 0}
                >
                  Import {controller.rankingRulesData.length || ''} rule(s)
                </Button>
              </Group>
            </Stack>
          </Card>
        </>
      )}
    </Stack>
  );
};
