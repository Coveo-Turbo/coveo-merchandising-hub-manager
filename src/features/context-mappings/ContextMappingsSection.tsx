import {useState} from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Header,
  MultiSelect,
  NativeSelect,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@coveord/plasma-mantine';
import {IconAlertTriangle, IconDownload, IconFileUpload, IconRefreshAlert, IconTrashX} from '@coveord/plasma-react-icons';
import type {ManagerController} from '../../hooks/useManagerController';
import type {ContextMappingDefinition, ContextMappingDestinationAttribute} from '../../types';
import {embeddedInputStyles} from '../../ui/embeddedControlStyles';

interface ContextMappingsSectionProps {
  controller: ManagerController;
}

const DEFAULT_DESTINATIONS: ContextMappingDestinationAttribute[] = ['QUERY_PIPELINE_CONTEXT'];

export const ContextMappingsSection = ({controller}: ContextMappingsSectionProps) => {
  const isEmbedded = controller.runtime === 'extension';
  const inputStyles = isEmbedded ? embeddedInputStyles : undefined;
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [mappingKey, setMappingKey] = useState('');
  const [mappingType, setMappingType] = useState('STRING');
  const [mappingDestinations, setMappingDestinations] = useState<ContextMappingDestinationAttribute[]>(DEFAULT_DESTINATIONS);
  const [mappingFieldAlias, setMappingFieldAlias] = useState('');
  const [mappingFieldSource, setMappingFieldSource] = useState('');
  const mappingEntries = controller.contextMappingsData ?? [];
  const structuredEditorAvailable = !controller.contextMappingsString.trim() || Array.isArray(controller.contextMappingsData);
  const usesFieldAliases = mappingDestinations.includes('FIELD_ALIASES');

  const resetBuilder = () => {
    setEditingKey(null);
    setMappingKey('');
    setMappingType('STRING');
    setMappingDestinations(DEFAULT_DESTINATIONS);
    setMappingFieldAlias('');
    setMappingFieldSource('');
  };

  const saveMapping = async () => {
    const key = mappingKey.trim();
    const fieldAlias = mappingFieldAlias.trim();
    const fieldSource = mappingFieldSource.trim();
    if (!key || !mappingDestinations.length || (usesFieldAliases && (!fieldAlias || !fieldSource))) {
      return;
    }

    const mapping: ContextMappingDefinition = {
      key,
      type: mappingType,
      destinations: mappingDestinations.map((attribute) => ({
        attribute,
        ...(attribute === 'FIELD_ALIASES' ? {fieldAlias, fieldSource} : {}),
      })),
    };

    const success = editingKey
      ? await controller.updateContextMapping(editingKey, mapping)
      : await controller.addContextMapping(mapping);

    if (success !== false) {
      resetBuilder();
    }
  };

  const startEditingMapping = (mapping: ContextMappingDefinition) => {
    setEditingKey(mapping.key?.trim() || null);
    setMappingKey(mapping.key || '');
    setMappingType(mapping.type || 'STRING');
    setMappingDestinations(
      (mapping.destinations ?? [])
        .map((destination) => destination.attribute)
        .filter((value): value is ContextMappingDestinationAttribute => Boolean(value)),
    );
    const fieldAliasDestination = (mapping.destinations ?? []).find((destination) => destination.attribute === 'FIELD_ALIASES');
    setMappingFieldAlias(fieldAliasDestination?.fieldAlias || '');
    setMappingFieldSource(fieldAliasDestination?.fieldSource || '');
  };

  return (
    <Stack gap="lg">
      <Header description="Fetch, inspect, import, edit, export, and save commerce context mappings for the active organization and tracking ID.">
        Context Mappings
      </Header>

      {!controller.session ? (
        <Alert color="yellow" variant="light" title="Connection required" icon={<IconAlertTriangle size={16} />}>
          Connect first to manage context mappings.
        </Alert>
      ) : (
        <>
          <Card withBorder radius="md" padding="lg">
            <Stack gap="md">
              <Group justify="space-between" align="flex-end" wrap="wrap">
                <Stack gap={4}>
                  <Text fw={600}>JSON document</Text>
                  <Text size="sm" c="dimmed">
                    Load the current mappings, import a JSON export, then save your changes back to Commerce.
                  </Text>
                </Stack>
                <Group gap="sm" wrap="wrap">
                  <Button
                    variant="default"
                    leftSection={<IconRefreshAlert size={16} />}
                    onClick={() => void controller.fetchContextMappings()}
                    loading={controller.loading}
                  >
                    Refresh mappings
                  </Button>
                  <Button
                    variant="light"
                    leftSection={<IconDownload size={16} />}
                    onClick={controller.exportContextMappings}
                    disabled={!controller.contextMappingsString.trim()}
                  >
                    Download JSON
                  </Button>
                  <FileInput
                    accept=".json,application/json"
                    placeholder="Choose JSON file"
                    leftSection={<IconFileUpload size={16} />}
                    onChange={(file) => void controller.loadContextMappingsFile(file)}
                    styles={inputStyles}
                  />
                  <Button
                    onClick={() => void controller.saveContextMappings()}
                    loading={controller.loading}
                    disabled={!controller.contextMappingsString.trim() || Boolean(controller.contextMappingsValidationError)}
                  >
                    Save mappings
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Card>

          {controller.contextMappingsValidationError && (
            <Alert color="red" variant="light" title="Invalid JSON" icon={<IconAlertTriangle size={16} />}>
              Fix the JSON before saving. {controller.contextMappingsValidationError}
            </Alert>
          )}

          {!structuredEditorAvailable && (
            <Alert color="yellow" variant="light" title="Structured editor unavailable" icon={<IconAlertTriangle size={16} />}>
              The builder works with array-based payloads. Fix the JSON or reload the current mappings to use it.
            </Alert>
          )}

          <Card withBorder radius="md" padding="lg">
            <Stack gap="md">
              <Stack gap={4}>
                <Text fw={600}>Mappings</Text>
                <Text size="sm" c="dimmed">
                  Create, edit, or delete mappings from the list while keeping the JSON editor in sync.
                </Text>
              </Stack>

              <Stack gap="xs">
                {mappingEntries.map((mapping, index) => (
                  <Card key={mapping.key || `mapping-${index}`} withBorder radius="sm" padding="sm">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={4}>
                        <Group gap="xs">
                          <Text fw={600}>{mapping.key || 'Unnamed mapping'}</Text>
                          {mapping.type ? <Badge variant="outline">{mapping.type}</Badge> : null}
                        </Group>
                        <Group gap="xs">
                          {(mapping.destinations ?? []).map((destination, destinationIndex) => (
                            <Group key={`${mapping.key || index}-destination-${destinationIndex}`} gap="xs">
                              <Badge variant="light">{destination.attribute || 'Unsupported destination in JSON'}</Badge>
                              {destination.attribute === 'FIELD_ALIASES' &&
                              (destination.fieldAlias || destination.fieldSource) ? (
                                <Text size="sm" c="dimmed">
                                  {[destination.fieldAlias, destination.fieldSource].filter(Boolean).join(' • ')}
                                </Text>
                              ) : null}
                            </Group>
                          ))}
                        </Group>
                      </Stack>
                      <Group gap="xs">
                        <Button variant="default" onClick={() => startEditingMapping(mapping)} disabled={!structuredEditorAvailable}>
                          Edit
                        </Button>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => void controller.removeContextMapping(index)}
                          aria-label={`Remove ${mapping.key || 'mapping'}`}
                          disabled={!structuredEditorAvailable}
                        >
                          <IconTrashX size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>

              <Card withBorder radius="sm" padding="md">
                <Stack gap="sm">
                  <Group grow align="flex-end">
                    <TextInput
                      label="Key"
                      placeholder="storeId"
                      value={mappingKey}
                      onChange={(event) => setMappingKey(event.currentTarget.value)}
                      styles={inputStyles}
                    />
                    <NativeSelect
                      label="Type"
                      data={[
                        {value: 'STRING', label: 'String'},
                        {value: 'NUMBER', label: 'Number'},
                        {value: 'BOOLEAN', label: 'Boolean'},
                        {value: 'PRODUCT_LIST', label: 'Product list'},
                      ]}
                      value={mappingType}
                      onChange={(event) => setMappingType(event.currentTarget.value)}
                      styles={inputStyles}
                    />
                    <MultiSelect
                      label="Destinations"
                      data={[
                        {value: 'QUERY_PIPELINE_CONTEXT', label: 'Query pipeline context'},
                        {value: 'ML_CONTEXT', label: 'ML context'},
                        {value: 'FIELD_ALIASES', label: 'Field aliases'},
                      ]}
                      value={mappingDestinations}
                      onChange={(value) => setMappingDestinations(value as ContextMappingDestinationAttribute[])}
                      styles={inputStyles}
                    />
                  </Group>
                  {usesFieldAliases && (
                    <Stack gap="xs">
                      <Group grow align="flex-end">
                        <TextInput
                          label="Field alias"
                          placeholder="price_store_{{contextValue}}"
                          value={mappingFieldAlias}
                          onChange={(event) => setMappingFieldAlias(event.currentTarget.value)}
                          styles={inputStyles}
                        />
                        <TextInput
                          label="Field source"
                          placeholder="price_dict.{{contextValue}}"
                          value={mappingFieldSource}
                          onChange={(event) => setMappingFieldSource(event.currentTarget.value)}
                          styles={inputStyles}
                        />
                      </Group>
                      <Text size="sm" c="dimmed">
                        Field alias is the query result alias and can use {'{{contextValue}}'} for dynamic names. Field source is the
                        indexed field template to resolve and should use {'{{contextValue}}'} where Commerce should inject the shopper
                        value.
                      </Text>
                    </Stack>
                  )}
                  <Group justify="flex-end">
                    {editingKey ? (
                      <Button variant="default" onClick={resetBuilder}>
                        Cancel
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => void saveMapping()}
                      disabled={
                        !structuredEditorAvailable ||
                        !mappingKey.trim() ||
                        !mappingDestinations.length ||
                        (usesFieldAliases && (!mappingFieldAlias.trim() || !mappingFieldSource.trim()))
                      }
                    >
                      {editingKey ? 'Update mapping' : 'Add mapping'}
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Stack>
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Stack gap="sm">
              <Stack gap={4}>
                <Text fw={600}>Editor</Text>
                <Text size="sm" c="dimmed">
                  Direct edits use the list-all response structure and sync creates, updates, and deletions when you save.
                </Text>
              </Stack>
              <Textarea
                minRows={20}
                autosize
                value={controller.contextMappingsString}
                onChange={(event) => controller.setContextMappingsString(event.currentTarget.value)}
                spellCheck={false}
                styles={{...inputStyles, input: {...inputStyles?.input, fontFamily: 'monospace'}}}
              />
            </Stack>
          </Card>
        </>
      )}
    </Stack>
  );
};
