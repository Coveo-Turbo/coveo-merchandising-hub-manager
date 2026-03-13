import {Badge, Button, Card, Code, Group, Select, Stack, Text} from '@coveord/plasma-mantine';
import {IconLogout, IconRefreshAlert, IconSettings} from '@coveord/plasma-react-icons';
import type {ManagerController} from '../hooks/useManagerController';

interface SessionContextCardProps {
  controller: ManagerController;
}

export const SessionContextCard = ({controller}: SessionContextCardProps) => {
  if (!controller.session) {
    return null;
  }

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Group gap="xs">
              <Text fw={600}>Current context</Text>
              <Badge color={controller.session.source === 'hub' ? 'violet' : 'teal'} variant="light">
                {controller.session.source === 'hub' ? 'Hub session' : 'Manual session'}
              </Badge>
            </Group>
            <Text c="dimmed" size="sm">
              Keep the selected tracking ID aligned with the property you want to manage before making writes.
            </Text>
          </Stack>

          <Group gap="xs">
            {controller.runtime === 'extension' && (
              <Button
                variant="light"
                color="violet"
                leftSection={<IconRefreshAlert size={16} />}
                onClick={() => void controller.refreshResolvedContext()}
                loading={controller.loading}
              >
                Refresh
              </Button>
            )}
            <Button
              variant="default"
              leftSection={<IconSettings size={16} />}
              onClick={() => controller.setShowManualConnection(!controller.showManualConnection)}
            >
              {controller.showManualConnection ? 'Hide manual form' : 'Manual override'}
            </Button>
            <Button variant="default" color="red" leftSection={<IconLogout size={16} />} onClick={() => void controller.disconnect()}>
              Disconnect
            </Button>
          </Group>
        </Group>

        <Group gap="md" wrap="wrap">
          <Stack gap={2}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              Organization
            </Text>
            <Code>{controller.session.organizationName || controller.session.organizationId}</Code>
          </Stack>
          <Stack gap={2}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              Property
            </Text>
            <Code>{controller.session.propertyName || controller.session.trackingId}</Code>
          </Stack>
          {controller.session.locale && (
            <Stack gap={2}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Locale
              </Text>
              <Code>{controller.session.locale}</Code>
            </Stack>
          )}
        </Group>

        {controller.runtime === 'extension' && (
          <Select
            label="Tracking ID"
            data={controller.availableTrackingIds.map((trackingId) => ({value: trackingId, label: trackingId}))}
            value={controller.session.trackingId}
            onChange={(value) => value && void controller.switchTrackingId(value)}
          />
        )}
      </Stack>
    </Card>
  );
};
