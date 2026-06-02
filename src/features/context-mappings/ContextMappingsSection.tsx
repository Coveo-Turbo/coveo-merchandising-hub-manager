import {
  Alert,
  Button,
  Card,
  FileInput,
  Group,
  Header,
  Stack,
  Text,
  Textarea,
} from '@coveord/plasma-mantine';
import {IconAlertTriangle, IconDownload, IconFileUpload, IconRefreshAlert} from '@coveord/plasma-react-icons';
import type {ManagerController} from '../../hooks/useManagerController';
import {embeddedInputStyles} from '../../ui/embeddedControlStyles';

interface ContextMappingsSectionProps {
  controller: ManagerController;
}

export const ContextMappingsSection = ({controller}: ContextMappingsSectionProps) => {
  const isEmbedded = controller.runtime === 'extension';
  const inputStyles = isEmbedded ? embeddedInputStyles : undefined;

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
