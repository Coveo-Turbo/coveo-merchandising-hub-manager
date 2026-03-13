import {Alert, Button, Card, Code, Group, Header, Modal, Stack, Text} from '@coveord/plasma-mantine';
import {IconAlertTriangle, IconDownload, IconTrashX} from '@coveord/plasma-react-icons';
import type {ManagerController} from '../../hooks/useManagerController';

interface MaintenanceSectionProps {
  controller: ManagerController;
}

export const MaintenanceSection = ({controller}: MaintenanceSectionProps) => (
  <Stack gap="lg">
    <Header description="Export or clear all listing pages for the currently selected tracking ID. Use these tools carefully.">
      Maintenance
    </Header>

    {!controller.session ? (
      <Alert color="yellow" variant="light" title="Connection required" icon={<IconAlertTriangle size={16} />}>
        Connect first to use maintenance tools.
      </Alert>
    ) : (
      <>
        <Card withBorder radius="md" padding="lg">
          <Stack gap="sm">
            <Text fw={600}>Export listings</Text>
            <Text size="sm" c="dimmed">
              Download all listing pages associated with <Code>{controller.session.trackingId}</Code> as a CSV file.
            </Text>
            <Group justify="flex-start">
              <Button variant="default" leftSection={<IconDownload size={16} />} onClick={() => void controller.exportAllListings()} loading={controller.loading}>
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
              <Button color="red" variant="light" leftSection={<IconTrashX size={16} />} onClick={() => controller.setIsDeleteConfirming(true)}>
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
              <Button color="red" leftSection={<IconTrashX size={16} />} onClick={() => void controller.deleteAllListings()} loading={controller.loading}>
                Delete everything
              </Button>
            </Group>
          </Stack>
        </Modal>
      </>
    )}
  </Stack>
);
