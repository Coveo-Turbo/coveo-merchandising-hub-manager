import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {ContextMappingsSection} from '../src/features/context-mappings/ContextMappingsSection';
import type {ManagerController} from '../src/hooks/useManagerController';
import type {SessionContext} from '../src/types';

vi.mock('@coveord/plasma-mantine', () => ({
  Alert: ({children, title}: {children: ReactNode; title?: string}) => (
    <div>
      {title ? <div>{title}</div> : null}
      {children}
    </div>
  ),
  Button: ({children, ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {loading?: boolean; leftSection?: ReactNode}) => {
    const {loading, leftSection, ...buttonProps} = props;
    void loading;
    void leftSection;
    return <button {...buttonProps}>{children}</button>;
  },
  Card: ({children}: {children: ReactNode}) => <div>{children}</div>,
  FileInput: ({placeholder}: {placeholder?: string}) => <input aria-label={placeholder || 'Choose JSON file'} type="file" />,
  Group: ({children}: {children: ReactNode}) => <div>{children}</div>,
  Header: ({children, description}: {children: ReactNode; description?: string}) => (
    <div>
      <h1>{children}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  ),
  Stack: ({children}: {children: ReactNode}) => <div>{children}</div>,
  Text: ({children}: {children: ReactNode}) => <span>{children}</span>,
  Textarea: ({value, onChange}: {value?: string; onChange?: (event: {currentTarget: {value: string}}) => void}) => (
    <textarea value={value} onChange={(event) => onChange?.({currentTarget: {value: event.currentTarget.value}})} />
  ),
}));

vi.mock('@coveord/plasma-react-icons', () => ({
  IconAlertTriangle: () => <span />,
  IconDownload: () => <span />,
  IconFileUpload: () => <span />,
  IconRefreshAlert: () => <span />,
}));

const session: SessionContext = {
  organizationId: 'my-org',
  trackingId: 'storefront',
  trackingIds: ['storefront'],
  accessToken: 'token-123',
  platformUrl: 'https://platform.cloud.coveo.com',
  source: 'manual',
};

const createController = (overrides: Partial<ManagerController> = {}): ManagerController =>
  ({
    runtime: 'standalone',
    session,
    loading: false,
    contextMappingsString: '{invalid json',
    contextMappingsValidationError: 'Expected property name or \'}\' in JSON at position 1',
    fetchContextMappings: vi.fn(),
    exportContextMappings: vi.fn(),
    loadContextMappingsFile: vi.fn(),
    saveContextMappings: vi.fn(),
    setContextMappingsString: vi.fn(),
    ...overrides,
  }) as ManagerController;

describe('ContextMappingsSection', () => {
  it('shows an inline validation error and disables save when the JSON is invalid', () => {
    render(<ContextMappingsSection controller={createController()} />);

    expect(screen.getByText('Context Mappings')).toBeTruthy();
    expect(screen.getByText('Invalid JSON')).toBeTruthy();
    expect((screen.getByRole('button', {name: 'Save mappings'}) as HTMLButtonElement).disabled).toBe(true);
  });

  it('passes textarea edits back to the controller', () => {
    const controller = createController({
      contextMappingsString: '{}',
      contextMappingsValidationError: null,
    });

    render(<ContextMappingsSection controller={controller} />);

    fireEvent.change(screen.getByRole('textbox'), {target: {value: '{"mapping":"locale"}'}});

    expect(controller.setContextMappingsString).toHaveBeenCalledWith('{"mapping":"locale"}');
  });
});
