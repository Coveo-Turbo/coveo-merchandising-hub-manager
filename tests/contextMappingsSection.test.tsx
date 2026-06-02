import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {ContextMappingsSection} from '../src/features/context-mappings/ContextMappingsSection';
import type {ManagerController} from '../src/hooks/useManagerController';
import type {ContextMappingsDocument, SessionContext} from '../src/types';

vi.mock('@coveord/plasma-mantine', () => ({
  ActionIcon: ({children, ...props}: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  Alert: ({children, title}: {children: ReactNode; title?: string}) => (
    <div>
      {title ? <div>{title}</div> : null}
      {children}
    </div>
  ),
  Badge: ({children}: {children: ReactNode}) => <span>{children}</span>,
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
  NativeSelect: ({
    value,
    onChange,
    label,
    data,
  }: {
    value?: string;
    label?: string;
    data?: Array<{value: string; label: string}>;
    onChange?: (event: {currentTarget: {value: string}}) => void;
  }) => (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange?.({currentTarget: {value: event.currentTarget.value}})}>
        {(data ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
  Stack: ({children}: {children: ReactNode}) => <div>{children}</div>,
  Text: ({children}: {children: ReactNode}) => <span>{children}</span>,
  Textarea: ({value, onChange}: {value?: string; onChange?: (event: {currentTarget: {value: string}}) => void}) => (
    <textarea value={value} onChange={(event) => onChange?.({currentTarget: {value: event.currentTarget.value}})} />
  ),
  TextInput: ({
    value,
    onChange,
    label,
    placeholder,
  }: {
    value?: string;
    label?: string;
    placeholder?: string;
    onChange?: (event: {currentTarget: {value: string}}) => void;
  }) => (
    <label>
      {label}
      <input
        aria-label={label || placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.({currentTarget: {value: event.currentTarget.value}})}
      />
    </label>
  ),
}));

vi.mock('@coveord/plasma-react-icons', () => ({
  IconAlertTriangle: () => <span />,
  IconDownload: () => <span />,
  IconFileUpload: () => <span />,
  IconRefreshAlert: () => <span />,
  IconTrashX: () => <span />,
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
    contextMappingsData: {mappings: []} as ContextMappingsDocument,
    contextMappingsString: '{invalid json',
    contextMappingsValidationError: 'Expected property name or \'}\' in JSON at position 1',
    fetchContextMappings: vi.fn(),
    exportContextMappings: vi.fn(),
    loadContextMappingsFile: vi.fn(),
    saveContextMappings: vi.fn(),
    setContextMappingsString: vi.fn(),
    addContextMapping: vi.fn(),
    removeContextMapping: vi.fn(),
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
      contextMappingsData: {mappings: []},
      contextMappingsString: '{}',
      contextMappingsValidationError: null,
    });

    render(<ContextMappingsSection controller={controller} />);

    fireEvent.change(screen.getByDisplayValue('{}'), {target: {value: '{"mapping":"locale"}'}});

    expect(controller.setContextMappingsString).toHaveBeenCalledWith('{"mapping":"locale"}');
  });

  it('lets admins add and remove mappings with the structured builder', () => {
    const controller = createController({
      contextMappingsData: {
        mappings: [{key: 'locale', type: 'STRING', destinations: [{attribute: 'QUERY_PIPELINE_CONTEXT'}]}],
      },
      contextMappingsString: JSON.stringify(
        {mappings: [{key: 'locale', type: 'STRING', destinations: [{attribute: 'QUERY_PIPELINE_CONTEXT'}]}]},
        null,
        2,
      ),
      contextMappingsValidationError: null,
    });

    render(<ContextMappingsSection controller={controller} />);

    fireEvent.change(screen.getByLabelText('Key'), {target: {value: 'storeId'}});
    fireEvent.change(screen.getByLabelText('Destination'), {target: {value: 'ML_CONTEXT'}});
    fireEvent.click(screen.getByRole('button', {name: 'Add mapping'}));

    expect(controller.addContextMapping).toHaveBeenCalledWith({
      key: 'storeId',
      type: 'STRING',
      destinations: [{attribute: 'ML_CONTEXT'}],
    });

    fireEvent.click(screen.getByRole('button', {name: 'Remove locale'}));
    expect(controller.removeContextMapping).toHaveBeenCalledWith(0);
  });

  it('requires field alias details for FIELD_ALIASES mappings', () => {
    const controller = createController({
      contextMappingsData: {mappings: []},
      contextMappingsString: JSON.stringify({mappings: []}, null, 2),
      contextMappingsValidationError: null,
    });

    render(<ContextMappingsSection controller={controller} />);

    fireEvent.change(screen.getByLabelText('Key'), {target: {value: 'brand'}});
    fireEvent.change(screen.getByLabelText('Destination'), {target: {value: 'FIELD_ALIASES'}});

    expect((screen.getByRole('button', {name: 'Add mapping'}) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Field alias'), {target: {value: 'ec_brand'}});
    fireEvent.change(screen.getByLabelText('Field source'), {target: {value: 'catalog'}});
    fireEvent.click(screen.getByRole('button', {name: 'Add mapping'}));

    expect(controller.addContextMapping).toHaveBeenCalledWith({
      key: 'brand',
      type: 'STRING',
      destinations: [{attribute: 'FIELD_ALIASES', fieldAlias: 'ec_brand', fieldSource: 'catalog'}],
    });
  });
});
