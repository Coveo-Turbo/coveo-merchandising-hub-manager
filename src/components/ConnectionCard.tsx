import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  NativeSelect,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@coveord/plasma-mantine';
import {IconArrowRight, IconCloudUpload, IconRefreshAlert} from '@coveord/plasma-react-icons';
import type {ManagerController} from '../hooks/useManagerController';
import {SAMPLE_CONFIGS} from '../services/sampleConfigs';

interface ConnectionCardProps {
  controller: ManagerController;
}

export const ConnectionCard = ({controller}: ConnectionCardProps) => (
  <Card withBorder radius="md" padding="lg">
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text fw={600}>Connection</Text>
          <Text c="dimmed" size="sm">
            {controller.runtime === 'extension'
              ? 'Use the current Hub session when possible, or connect manually as a fallback.'
              : 'Connect with your organization ID and a token that can edit Merchandising Hub commerce resources.'}
          </Text>
        </Stack>
        {controller.runtime === 'extension' && (
          <Badge color="violet" variant="light">
            Hub-aware
          </Badge>
        )}
      </Group>

      {controller.runtime === 'extension' && (
        <Alert color="violet" variant="light" title="Preferred path">
          Refresh Hub context first if you expect the extension to reuse the current session automatically.
        </Alert>
      )}

      <TextInput
        label="Organization ID"
        placeholder="myorganization"
        value={controller.connectionForm.organizationId}
        onChange={(event) => controller.handleConnectionFieldChange('organizationId', event.currentTarget.value)}
      />

      <NativeSelect
        label="Platform region"
        data={[
          {value: 'https://platform.cloud.coveo.com', label: 'US (platform.cloud.coveo.com)'},
          {value: 'https://platform-ca.cloud.coveo.com', label: 'Canada (platform-ca.cloud.coveo.com)'},
          {value: 'https://platform-eu.cloud.coveo.com', label: 'Europe (platform-eu.cloud.coveo.com)'},
          {value: 'https://platform-au.cloud.coveo.com', label: 'Australia (platform-au.cloud.coveo.com)'},
        ]}
        value={controller.connectionForm.platformUrl}
        onChange={(event) => controller.handleConnectionFieldChange('platformUrl', event.currentTarget.value)}
      />

      <PasswordInput
        label="Access token"
        placeholder="xx-xxxx-xxxx-xxxx"
        value={controller.connectionForm.accessToken}
        onChange={(event) => controller.handleConnectionFieldChange('accessToken', event.currentTarget.value)}
      />

      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm">
          <Button
            leftSection={<IconArrowRight size={16} />}
            onClick={() => void controller.connectManually()}
            loading={controller.connectionStatus === 'connecting'}
            disabled={!controller.connectionForm.organizationId.trim() || !controller.connectionForm.accessToken.trim()}
          >
            Connect manually
          </Button>
          {controller.runtime === 'extension' && (
            <Button
              variant="light"
              color="violet"
              leftSection={<IconRefreshAlert size={16} />}
              onClick={() => void controller.refreshResolvedContext()}
              loading={controller.loading}
            >
              Refresh Hub context
            </Button>
          )}
        </Group>

        {controller.devMode && SAMPLE_CONFIGS.length > 0 && (
          <NativeSelect
            aria-label="Load sample"
            data={[
              {value: '', label: 'Load sample'},
              ...SAMPLE_CONFIGS.map((sample, index) => ({value: String(index), label: sample.name})),
            ]}
            onChange={(event) => {
              if (event.currentTarget.value !== '') {
                controller.loadSampleConfig(Number(event.currentTarget.value));
              }
            }}
            leftSection={<IconCloudUpload size={16} />}
          />
        )}
      </Group>
    </Stack>
  </Card>
);
