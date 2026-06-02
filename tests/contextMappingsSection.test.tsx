import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {ContextMappingsSection} from '../src/features/context-mappings/ContextMappingsSection';
import type {ManagerController} from '../src/hooks/useManagerController';
import type {ContextMappingDefinition, SessionContext} from '../src/types';

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
  MultiSelect: ({
    value = [],
    onChange,
    label,
    data,
  }: {
    value?: string[];
    label?: string;
    data?: Array<{value: string; label: string}>;
    onChange?: (value: string[]) => void;
  }) => (
    <label>
      {label}
      <select
        aria-label={label}
        multiple
        value={value}
        onChange={(event) => onChange?.([...event.currentTarget.selectedOptions].map((option) => option.value))}
      >
        {(data ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
    contextMappingsData: [] as ContextMappingDefinition[],
    contextMappingsString: '{invalid json',
    contextMappingsValidationError: 'Expected property name or \'}\' in JSON at position 1',
    fetchContextMappings: vi.fn(),
    exportContextMappings: vi.fn(),
    loadContextMappingsFile: vi.fn(),
    saveContextMappings: vi.fn(),
    setContextMappingsString: vi.fn(),
    addContextMapping: vi.fn().mockResolvedValue(true),
    updateContextMapping: vi.fn().mockResolvedValue(true),
    removeContextMapping: vi.fn().mockResolvedValue(true),
    ...overrides,
  }) as ManagerController;

const selectMultiValues = (label: string, values: string[]) => {
  const select = screen.getByLabelText(label) as HTMLSelectElement;
  for (const option of [...select.options]) {
    option.selected = values.includes(option.value);
  }
  fireEvent.change(select);
};

describe('ContextMappingsSection', () => {
  it('shows an inline validation error and disables save when the JSON is invalid', () => {
    render(<ContextMappingsSection controller={createController()} />);

    expect(screen.getByText('Context Mappings')).toBeTruthy();
    expect(screen.getByText('Invalid JSON')).toBeTruthy();
    expect((screen.getByRole('button', {name: 'Save mappings'}) as HTMLButtonElement).disabled).toBe(true);
  });

  it('passes textarea edits back to the controller for array payloads', () => {
    const controller = createController({
      contextMappingsData: [],
      contextMappingsString: '[]',
      contextMappingsValidationError: null,
    });

    render(<ContextMappingsSection controller={controller} />);

    fireEvent.change(screen.getByDisplayValue('[]'), {target: {value: '[{"key":"locale"}]'}});

    expect(controller.setContextMappingsString).toHaveBeenCalledWith('[{"key":"locale"}]');
    expect(screen.queryByText('Structured editor unavailable')).toBeNull();
  });

  it('creates and updates mappings with multi-destination selections', async () => {
    const controller = createController({
      contextMappingsData: [
        {key: 'locale', type: 'STRING', destinations: [{attribute: 'QUERY_PIPELINE_CONTEXT'}]},
      ],
      contextMappingsString: JSON.stringify([{key: 'locale', type: 'STRING', destinations: [{attribute: 'QUERY_PIPELINE_CONTEXT'}]}], null, 2),
      contextMappingsValidationError: null,
    });

    render(<ContextMappingsSection controller={controller} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Key'), {target: {value: 'storeId'}});
      selectMultiValues('Destinations', ['ML_CONTEXT', 'FIELD_ALIASES']);
      fireEvent.change(screen.getByLabelText('Field alias'), {target: {value: 'price_store_{{contextValue}}'}});
      fireEvent.change(screen.getByLabelText('Field source'), {target: {value: 'price_dict.{{contextValue}}'}});
      fireEvent.click(screen.getByRole('button', {name: 'Add mapping'}));
    });

    expect(controller.addContextMapping).toHaveBeenCalledWith({
      key: 'storeId',
      type: 'STRING',
      destinations: [
        {attribute: 'ML_CONTEXT'},
        {
          attribute: 'FIELD_ALIASES',
          fieldAlias: 'price_store_{{contextValue}}',
          fieldSource: 'price_dict.{{contextValue}}',
        },
      ],
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
      fireEvent.change(screen.getByLabelText('Type'), {target: {value: 'NUMBER'}});
      fireEvent.click(screen.getByRole('button', {name: 'Update mapping'}));
    });

    expect(controller.updateContextMapping).toHaveBeenCalledWith('locale', {
      key: 'locale',
      type: 'NUMBER',
      destinations: [{attribute: 'QUERY_PIPELINE_CONTEXT'}],
    });
  });

  it('requires field alias details when FIELD_ALIASES is selected and shows helper text', async () => {
    const controller = createController({
      contextMappingsData: [],
      contextMappingsString: '[]',
      contextMappingsValidationError: null,
    });

    render(<ContextMappingsSection controller={controller} />);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Key'), {target: {value: 'brand'}});
      selectMultiValues('Destinations', ['QUERY_PIPELINE_CONTEXT', 'FIELD_ALIASES']);
    });

    expect((screen.getByRole('button', {name: 'Add mapping'}) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Field alias is the query result alias/i)).toBeTruthy();

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Field alias'), {target: {value: 'ec_brand'}});
      fireEvent.change(screen.getByLabelText('Field source'), {target: {value: 'catalog.{{contextValue}}'}});
      fireEvent.click(screen.getByRole('button', {name: 'Add mapping'}));
    });

    expect(controller.addContextMapping).toHaveBeenCalledWith({
      key: 'brand',
      type: 'STRING',
      destinations: [
        {attribute: 'QUERY_PIPELINE_CONTEXT'},
        {attribute: 'FIELD_ALIASES', fieldAlias: 'ec_brand', fieldSource: 'catalog.{{contextValue}}'},
      ],
    });
  });
});
