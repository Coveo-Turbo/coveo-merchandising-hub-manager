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
  NativeSelect,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@coveord/plasma-mantine';
import {IconAlertTriangle, IconDownload, IconFileUpload, IconRefreshAlert, IconTrashX} from '@coveord/plasma-react-icons';
import type {ManagerController} from '../../hooks/useManagerController';
import type {ContextMappingDestinationAttribute, ContextMappingsDocument} from '../../types';
import {embeddedInputStyles} from '../../ui/embeddedControlStyles';

interface ContextMappingsSectionProps {
  controller: ManagerController;
}

export const ContextMappingsSection = ({controller}: ContextMappingsSectionProps) => {
  const isEmbedded = controller.runtime === 'extension';
  const inputStyles = isEmbedded ? embeddedInputStyles : undefined;
  const [mappingKey, setMappingKey] = useState('');
  const [mappingType, setMappingType] = useState('STRING');
  const [mappingDestination, setMappingDestination] = useState<ContextMappingDestinationAttribute>('QUERY_PIPELINE_CONTEXT');
  const [mappingFieldAlias, setMappingFieldAlias] = useState('');
  const [mappingFieldSource, setMappingFieldSource] = useState('');
  const contextMappingsDocument =
    controller.contextMappingsData &&
    !Array.isArray(controller.contextMappingsData) &&
    typeof controller.contextMappingsData === 'object'
      ? (controller.contextMappingsData as ContextMappingsDocument)
      : null;
  const mappingEntries = contextMappingsDocument?.mappings ?? [];
  const structuredEditorAvailable = !controller.contextMappingsString.trim() || Boolean(contextMappingsDocument);
  const addMapping = () => {
    const key = mappingKey.trim();
    const fieldAlias = mappingFieldAlias.trim();
    const fieldSource = mappingFieldSource.trim();
    if (!key || (mappingDestination === 'FIELD_ALIASES' && (!fieldAlias || !fieldSource))) {
      return;
    }

    controller.addContextMapping({
      key,
      type: mappingType,
      destinations: [
        {
          attribute: mappingDestination,
          ...(mappingDestination === 'FIELD_ALIASES' ? {fieldAlias, fieldSource} : {}),
        },
      ],
    });
    setMappingKey('');
    setMappingType('STRING');
    setMappingDestination('QUERY_PIPELINE_CONTEXT');
    setMappingFieldAlias('');
    setMappingFieldSource('');
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
              The builder works with object-based payloads. Fix the JSON or reload the current mappings to use it.
            </Alert>
          )}

          <Card withBorder radius="md" padding="lg">
            <Stack gap="md">
              <Stack gap={4}>
                <Text fw={600}>Mappings</Text>
                <Text size="sm" c="dimmed">
                  Add or remove mapping entries without hand-authoring the full JSON document.
                </Text>
              </Stack>

              <Stack gap="xs">
                {mappingEntries.map((mapping, index) => (
                  <Card key={`mapping-${index}`} withBorder radius="sm" padding="sm">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={4}>
                        <Group gap="xs">
                          <Text fw={600}>{mapping.key || 'Unnamed mapping'}</Text>
                          {mapping.type ? <Badge variant="outline">{mapping.type}</Badge> : null}
                        </Group>
                        <Group gap="xs">
                          {(mapping.destinations ?? []).map((destination, destinationIndex) => (
                            <Group key={`mapping-${index}-destination-${destinationIndex}`} gap="xs">
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
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => controller.removeContextMapping(index)}
                        aria-label={`Remove ${mapping.key || 'mapping'}`}
                        disabled={!structuredEditorAvailable}
                      >
                        <IconTrashX size={16} />
                      </ActionIcon>
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
                    <NativeSelect
                      label="Destination"
                      data={[
                        {value: 'QUERY_PIPELINE_CONTEXT', label: 'Query pipeline context'},
                        {value: 'ML_CONTEXT', label: 'ML context'},
                        {value: 'FIELD_ALIASES', label: 'Field aliases'},
                      ]}
                      value={mappingDestination}
                      onChange={(event) =>
                        setMappingDestination(event.currentTarget.value as ContextMappingDestinationAttribute)
                      }
                      styles={inputStyles}
                    />
                  </Group>
                  {mappingDestination === 'FIELD_ALIASES' && (
                    <Group grow align="flex-end">
                      <TextInput
                        label="Field alias"
                        placeholder="my_field"
                        value={mappingFieldAlias}
                        onChange={(event) => setMappingFieldAlias(event.currentTarget.value)}
                        styles={inputStyles}
                      />
                      <TextInput
                        label="Field source"
                        placeholder="catalog"
                        value={mappingFieldSource}
                        onChange={(event) => setMappingFieldSource(event.currentTarget.value)}
                        styles={inputStyles}
                      />
                    </Group>
                  )}
                  <Group justify="flex-end">
                    <Button
                      onClick={addMapping}
                      disabled={
                        !structuredEditorAvailable ||
                        !mappingKey.trim() ||
                        (mappingDestination === 'FIELD_ALIASES' &&
                          (!mappingFieldAlias.trim() || !mappingFieldSource.trim()))
                      }
                    >
                      Add mapping
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
                  Direct edits are applied to the payload that will be sent to the context mappings API.
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
