import {Alert, Header, Stack} from '@coveord/plasma-mantine';
import {IconAlertTriangle} from '@coveord/plasma-react-icons';
import {ConnectionCard} from '../../components/ConnectionCard';
import {SessionContextCard} from '../../components/SessionContextCard';
import type {ManagerController} from '../../hooks/useManagerController';

interface ConnectionSectionProps {
  controller: ManagerController;
}

export const ConnectionSection = ({controller}: ConnectionSectionProps) => (
  <Stack gap="lg">
    <Header description="Connect once, validate the current Hub context, and choose the tracking ID you want to manage across the app.">
      Connection
    </Header>

    {controller.session ? (
      <>
        <SessionContextCard controller={controller} />
        {controller.showManualConnection ? <ConnectionCard controller={controller} /> : null}
      </>
    ) : (
      <>
        <ConnectionCard controller={controller} />
        <Alert color="yellow" variant="light" title="Connection required" icon={<IconAlertTriangle size={16} />}>
          Refresh the current Hub session or connect manually before managing commerce resources.
        </Alert>
      </>
    )}
  </Stack>
);
