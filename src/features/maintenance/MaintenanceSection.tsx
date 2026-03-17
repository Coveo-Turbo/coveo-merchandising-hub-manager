import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Code,
  Group,
  Header,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@coveord/plasma-mantine';
import {IconAlertTriangle, IconCloudUpload, IconDownload, IconTrashX} from '@coveord/plasma-react-icons';
import type {ManagerController} from '../../hooks/useManagerController';
import {embeddedInputStyles} from '../../ui/embeddedControlStyles';

interface MaintenanceSectionProps {
  controller: ManagerController;
}

export const MaintenanceSection = ({controller}: MaintenanceSectionProps) => {
  const isEmbedded = controller.runtime === 'extension';
  const inputStyles = isEmbedded ? embeddedInputStyles : undefined;

  return (
    <Stack gap="lg">
      <Header description="Export or clear listing data, and deploy the Commerce Troubleshoot Console for the current organization/session.">
        Maintenance
      </Header>

      {!controller.session ? (
        <Alert color="yellow" variant="light" title="Connection required" icon={<IconAlertTriangle size={16} />}>
          Connect first to use maintenance tools.
        </Alert>
      ) : (
        <>
          <Card withBorder radius="md" padding="lg">
            <Stack gap="md">
              <Stack gap={4}>
                <Text fw={600}>Deploy Commerce Troubleshoot Console</Text>
                <Text size="sm" c="dimmed">
                  Generate and optionally deploy the hosted troubleshoot page through the backend using the current
                  organization, session token, and platform region.
                </Text>
              </Stack>

              <Alert color="blue" variant="light" title="Backend execution" icon={<IconAlertTriangle size={16} />}>
                Dry-run generates the hosted bundle and diagnostics without publishing. Non-dry-run now publishes
                directly through the Hosted Page API from the backend.
              </Alert>

              <SimpleGrid cols={{base: 1, md: 2}} spacing="md">
                <TextInput
                  label="Hosted page name"
                  placeholder="commerce-troubleshoot-console"
                  value={controller.troubleshootDeployForm.hostedPageName}
                  onChange={(event) => controller.updateTroubleshootDeployForm('hostedPageName', event.currentTarget.value)}
                  required
                  styles={inputStyles}
                />
                <TextInput
                  label="Hosted page id"
                  description="Optional. Leave blank to resolve by exact page name first."
                  value={controller.troubleshootDeployForm.hostedPageId}
                  onChange={(event) => controller.updateTroubleshootDeployForm('hostedPageId', event.currentTarget.value)}
                  styles={inputStyles}
                />
                <TextInput
                  label="Runtime default tracking ID"
                  description="Prefilled from the current session and used as the hosted app default."
                  value={controller.troubleshootDeployForm.trackingId}
                  onChange={(event) => controller.updateTroubleshootDeployForm('trackingId', event.currentTarget.value)}
                  styles={inputStyles}
                />
              </SimpleGrid>

              <Checkbox
                label="Dry-run only"
                description="Generate bundle artifacts and diagnostics without executing the hosted page deploy."
                checked={controller.troubleshootDeployForm.dryRun}
                onChange={(event) => controller.updateTroubleshootDeployForm('dryRun', event.currentTarget.checked)}
              />

              <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                <Stack gap={4}>
                  <Text size="sm" c="dimmed">
                    Organization
                  </Text>
                  <Code>{controller.session.organizationId}</Code>
                  <Text size="sm" c="dimmed">
                    Platform
                  </Text>
                  <Code>{controller.session.platformUrl}</Code>
                </Stack>

                <Button
                  leftSection={<IconCloudUpload size={16} />}
                  onClick={() => void controller.deployTroubleshootConsole()}
                  loading={controller.loading}
                  disabled={
                    !controller.troubleshootDeployForm.hostedPageName.trim() ||
                    !controller.troubleshootDeployForm.trackingId.trim()
                  }
                >
                  {controller.troubleshootDeployForm.dryRun ? 'Run dry-run' : 'Deploy troubleshoot console'}
                </Button>
              </Group>
            </Stack>
          </Card>

          {controller.troubleshootDeployResult && (
            <Card withBorder radius="md" padding="lg">
              <Stack gap="md">
                <Group justify="space-between" wrap="wrap" gap="md">
                  <Stack gap={4}>
                    <Text fw={600}>Latest deploy result</Text>
                    <Text size="sm" c="dimmed">
                      Review the hosted page identity and backend diagnostics from the last execution.
                    </Text>
                  </Stack>
                  <Badge color={controller.troubleshootDeployResult.deployed ? 'teal' : 'blue'} variant="light">
                    {controller.troubleshootDeployResult.deployed ? 'Deployed' : 'Dry-run'}
                  </Badge>
                </Group>

                <SimpleGrid cols={{base: 1, md: 2}} spacing="md">
                  <Stack gap={4}>
                    <Text size="sm" fw={600}>
                      Hosted page name
                    </Text>
                    <Code>{controller.troubleshootDeployResult.hostedPageName}</Code>
                  </Stack>
                  <Stack gap={4}>
                    <Text size="sm" fw={600}>
                      Hosted page id
                    </Text>
                    <Code>{controller.troubleshootDeployResult.hostedPageId ?? 'Not returned'}</Code>
                  </Stack>
                  <Stack gap={4}>
                    <Text size="sm" fw={600}>
                      Key strategy
                    </Text>
                    <Text size="sm">
                      {controller.troubleshootDeployResult.keyInfo.source} · created{' '}
                      {controller.troubleshootDeployResult.keyInfo.created ? 'yes' : 'no'} · reused{' '}
                      {controller.troubleshootDeployResult.keyInfo.reused ? 'yes' : 'no'}
                    </Text>
                  </Stack>
                </SimpleGrid>

                <Textarea
                  label="Diagnostics"
                  minRows={8}
                  autosize
                  readOnly
                  value={controller.troubleshootDeployResult.diagnostics.join('\n')}
                  styles={{...inputStyles, input: {...inputStyles?.input, fontFamily: 'monospace'}}}
                />
              </Stack>
            </Card>
          )}

          <Card withBorder radius="md" padding="lg">
            <Stack gap="sm">
              <Text fw={600}>Export listings</Text>
              <Text size="sm" c="dimmed">
                Download all listing pages associated with <Code>{controller.session.trackingId}</Code> as a CSV file.
              </Text>
              <Group justify="flex-start">
                <Button
                  variant="default"
                  leftSection={<IconDownload size={16} />}
                  onClick={() => void controller.exportAllListings()}
                  loading={controller.loading}
                >
                  Export all listings
                </Button>
              </Group>
            </Stack>
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Stack gap="sm">
              <Text fw={600} c="red">
                Danger zone
              </Text>
              <Text size="sm" c="dimmed">
                Delete every listing associated with <Code>{controller.session.trackingId}</Code>. This cannot be undone.
              </Text>
              <Group justify="flex-start">
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconTrashX size={16} />}
                  onClick={() => controller.setIsDeleteConfirming(true)}
                >
                  Delete all listings
                </Button>
              </Group>
            </Stack>
          </Card>

          <Modal
            opened={controller.isDeleteConfirming}
            onClose={() => controller.setIsDeleteConfirming(false)}
            title="Delete all listings?"
          >
            <Stack gap="md">
              <Alert color="red" variant="light" title="Destructive action" icon={<IconAlertTriangle size={16} />}>
                This will remove every listing page for <Code>{controller.session.trackingId}</Code>.
              </Alert>
              <Group justify="flex-end">
                <Button variant="default" onClick={() => controller.setIsDeleteConfirming(false)}>
                  Cancel
                </Button>
                <Button
                  color="red"
                  leftSection={<IconTrashX size={16} />}
                  onClick={() => void controller.deleteAllListings()}
                  loading={controller.loading}
                >
                  Delete everything
                </Button>
              </Group>
            </Stack>
          </Modal>
        </>
      )}
    </Stack>
  );
};
