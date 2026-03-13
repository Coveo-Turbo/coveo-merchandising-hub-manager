import {useState} from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Header,
  NativeSelect,
  NumberInput,
  SegmentedControl,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Textarea,
} from '@coveord/plasma-mantine';
import {IconAlertTriangle, IconCopy, IconPlus, IconRefreshAlert, IconTrashX} from '@coveord/plasma-react-icons';
import type {ManagerController} from '../../hooks/useManagerController';
import type {SortDefinition} from '../../types';
import {embeddedInputStyles, embeddedSegmentedControlStyles, embeddedTagsInputStyles} from '../../ui/embeddedControlStyles';

interface GlobalConfigSectionProps {
  controller: ManagerController;
}

export const GlobalConfigSection = ({controller}: GlobalConfigSectionProps) => {
  const [sortType, setSortType] = useState<'relevance' | 'fields'>('relevance');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('desc');
  const isEmbedded = controller.runtime === 'extension';
  const segmentedControlStyles = isEmbedded ? embeddedSegmentedControlStyles : undefined;
  const inputStyles = isEmbedded ? embeddedInputStyles : undefined;
  const tagsInputStyles = isEmbedded ? embeddedTagsInputStyles : undefined;

  return (
    <Stack gap="lg">
      <Header description="Load, edit, and save the shared commerce query configuration that backs search, listings, product suggest, and recommendations.">
        Global Config
      </Header>

      {!controller.session ? (
        <Alert color="yellow" variant="light" title="Connection required" icon={<IconAlertTriangle size={16} />}>
          Connect first to fetch and save configuration documents.
        </Alert>
      ) : (
        <>
          <Card withBorder radius="md" padding="lg">
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <SegmentedControl
                value={controller.globalConfigType}
                onChange={(value) => controller.setGlobalConfigType(value as typeof controller.globalConfigType)}
                styles={segmentedControlStyles}
                data={[
                  {label: 'Search', value: 'search'},
                  {label: 'Listings', value: 'listing'},
                  {label: 'Product Suggest', value: 'product-suggest'},
                  {label: 'Recommendations', value: 'recommendation'},
                ]}
              />
              <Group gap="sm">
                <Button variant="default" leftSection={<IconRefreshAlert size={16} />} onClick={() => void controller.fetchGlobalConfig()} loading={controller.loading}>
                  Refresh config
                </Button>
                <Button onClick={() => void controller.saveGlobalConfig()} loading={controller.loading} disabled={!controller.globalConfigString}>
                  Save config
                </Button>
              </Group>
            </Group>
          </Card>

          {controller.globalConfigData && controller.qc && (
            <>
              <Card withBorder radius="md" padding="lg">
                <Stack gap="md">
                  <Group justify="space-between" wrap="wrap">
                    <Stack gap={4}>
                      <Text fw={600}>Common settings</Text>
                      <Text size="sm" c="dimmed">
                        Use these fields to adjust the most common query settings without editing JSON directly.
                      </Text>
                    </Stack>
                    <Group gap="xs">
                      <Button variant="default" leftSection={<IconCopy size={16} />} onClick={controller.copySharedSettings}>
                        Copy
                      </Button>
                      <Button variant="light" onClick={controller.pasteSharedSettings} disabled={!controller.sharedSettings}>
                        Paste
                      </Button>
                    </Group>
                  </Group>

                  <NumberInput
                    label="Results per page"
                    value={controller.qc.perPage ?? 0}
                    onChange={(value) => controller.updateQueryConfigField('perPage', Number(value) || 0)}
                    allowDecimal={false}
                    min={0}
                    styles={inputStyles}
                  />

                  <TagsInput
                    label="Additional fields"
                    value={controller.qc.additionalFields ?? []}
                    onChange={(value) => controller.updateQueryConfigField('additionalFields', value)}
                    placeholder="Add fields such as ec_brand"
                    styles={tagsInputStyles}
                  />

                  {!['recommendation', 'product-suggest'].includes(controller.globalConfigType) && (
                    <Stack gap="sm">
                      <Text fw={600} size="sm">
                        Sorts
                      </Text>
                      <Stack gap="xs">
                        {(controller.qc.sorts ?? []).map((sort: SortDefinition, index) => (
                          <Card key={`${sort.sortCriteria}-${index}`} withBorder radius="sm" padding="sm">
                            <Group justify="space-between" align="flex-start">
                              <Stack gap={2}>
                                <Group gap="xs">
                                  <Badge variant="light">{sort.sortCriteria === 'relevance' ? 'Relevance' : 'Field'}</Badge>
                                  {sort.fields?.[0]?.field && <Text size="sm">{sort.fields[0].field}</Text>}
                                  {sort.fields?.[0]?.direction && <Badge variant="outline">{sort.fields[0].direction}</Badge>}
                                </Group>
                                {sort.fields?.[0]?.displayNames?.length ? (
                                  <Text c="dimmed" size="sm">
                                    {sort.fields[0].displayNames.map((label) => `${label.language}: ${label.value}`).join(' | ')}
                                  </Text>
                                ) : null}
                              </Stack>
                              <ActionIcon variant="subtle" color="red" onClick={() => controller.removeSort(index)}>
                                <IconTrashX size={16} />
                              </ActionIcon>
                            </Group>
                          </Card>
                        ))}
                      </Stack>

                      <Card withBorder radius="sm" padding="md">
                        <Stack gap="sm">
                          <Group grow align="flex-end">
                            <NativeSelect
                              label="Type"
                              data={[
                                {value: 'relevance', label: 'Relevance'},
                                {value: 'fields', label: 'Field'},
                              ]}
                              value={sortType}
                              onChange={(event) => setSortType(event.currentTarget.value as 'relevance' | 'fields')}
                              styles={inputStyles}
                            />
                            {sortType === 'fields' && (
                              <>
                                <TextInput
                                  label="Field"
                                  value={sortField}
                                  onChange={(event) => setSortField(event.currentTarget.value)}
                                  styles={inputStyles}
                                />
                                <NativeSelect
                                  label="Direction"
                                  data={[
                                    {value: 'desc', label: 'Descending'},
                                    {value: 'asc', label: 'Ascending'},
                                  ]}
                                  value={sortDirection}
                                  onChange={(event) => setSortDirection(event.currentTarget.value)}
                                  styles={inputStyles}
                                />
                              </>
                            )}
                          </Group>

                          {sortType === 'fields' && (
                            <Stack gap="xs">
                              <Text size="sm" fw={600}>
                                Display names
                              </Text>
                              <Group grow align="flex-end">
                                <TextInput
                                  label="Language"
                                  value={controller.pendingSortLang}
                                  onChange={(event) => controller.setPendingSortLang(event.currentTarget.value)}
                                  styles={inputStyles}
                                />
                                <TextInput
                                  label="Label"
                                  value={controller.pendingSortLabelValue}
                                  onChange={(event) => controller.setPendingSortLabelValue(event.currentTarget.value)}
                                  styles={inputStyles}
                                />
                                <Button variant="default" leftSection={<IconPlus size={16} />} onClick={controller.addPendingSortLabel}>
                                  Add label
                                </Button>
                              </Group>
                              <Group gap="xs">
                                {controller.pendingSortLabels.map((label, index) => (
                                  <Badge key={`${label.language}-${label.value}-${index}`} rightSection={
                                    <ActionIcon size="xs" variant="transparent" onClick={() => controller.removePendingSortLabel(index)}>
                                      <IconTrashX size={14} />
                                    </ActionIcon>
                                  }>
                                    {label.language}: {label.value}
                                  </Badge>
                                ))}
                              </Group>
                            </Stack>
                          )}

                          <Button
                            onClick={() => {
                              if (sortType === 'relevance') {
                                controller.addSort('relevance');
                                return;
                              }

                              if (!sortField.trim()) {
                                return;
                              }

                              controller.addSort('fields', sortField.trim(), sortDirection);
                              setSortField('');
                            }}
                          >
                            Add sort
                          </Button>
                        </Stack>
                      </Card>
                    </Stack>
                  )}
                </Stack>
              </Card>

              <Card withBorder radius="md" padding="lg">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Stack gap={4}>
                      <Text fw={600}>JSON editor</Text>
                      <Text size="sm" c="dimmed">
                        Direct edits are applied to the payload that will be sent to the selected API.
                      </Text>
                    </Stack>
                  </Group>
                  <Textarea
                    minRows={20}
                    autosize
                    value={controller.globalConfigString}
                    onChange={(event) => controller.setGlobalConfigString(event.currentTarget.value)}
                    spellCheck={false}
                    styles={{...inputStyles, input: {...inputStyles?.input, fontFamily: 'monospace'}}}
                  />
                </Stack>
              </Card>
            </>
          )}
        </>
      )}
    </Stack>
  );
};
