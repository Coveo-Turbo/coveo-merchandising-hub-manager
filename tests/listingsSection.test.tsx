import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {ListingsSection} from '../src/features/listings/ListingsSection';
import type {ManagerController} from '../src/hooks/useManagerController';
import type {SessionContext} from '../src/types';

vi.mock('@mantine/hooks', () => ({
  useMediaQuery: () => false,
}));

vi.mock('@coveord/plasma-mantine', () => ({
  Alert: ({children, title}: {children: ReactNode; title?: string}) => (
    <div>
      {title ? <div>{title}</div> : null}
      {children}
    </div>
  ),
  Badge: ({children}: {children: ReactNode}) => <span>{children}</span>,
  Button: ({children, leftSection, loading, ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {leftSection?: ReactNode; loading?: boolean}) => {
    void leftSection;
    void loading;
    return <button {...props}>{children}</button>;
  },
  Card: ({children}: {children: ReactNode}) => <div>{children}</div>,
  Code: ({children}: {children: ReactNode}) => <code>{children}</code>,
  FileInput: ({label}: {label?: string}) => <input aria-label={label || 'CSV file'} type="file" />,
  Group: ({children}: {children: ReactNode}) => <div>{children}</div>,
  Header: ({children, description}: {children: ReactNode; description?: string}) => (
    <div>
      <h1>{children}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  ),
  SimpleGrid: ({children}: {children: ReactNode}) => <div>{children}</div>,
  Stack: ({children}: {children: ReactNode}) => <div>{children}</div>,
  Stepper: Object.assign(
    ({children}: {children: ReactNode}) => <div>{children}</div>,
    {Step: ({children, label}: {children?: ReactNode; label: string}) => <div>{label}{children}</div>},
  ),
  Text: ({children}: {children: ReactNode}) => <span>{children}</span>,
  ThemeIcon: ({children}: {children: ReactNode}) => <span>{children}</span>,
}));

vi.mock('@coveord/plasma-react-icons', () => new Proxy({}, {get: () => () => <span />})); 

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
    parsedListings: [],
    listingStep: 2,
    showManualConnection: false,
    handleFileUpload: vi.fn(),
    enhanceListing: vi.fn(),
    resetListings: vi.fn(),
    submitListings: vi.fn(),
    ...overrides,
  }) as ManagerController;

describe('ListingsSection', () => {
  it('does not render the connection form inside the listings workflow anymore', () => {
    render(<ListingsSection controller={createController()} />);

    expect(screen.getByText('Listings')).toBeTruthy();
    expect(screen.queryByText('Connection')).toBeNull();
    expect(screen.queryByRole('button', {name: 'Connect manually'})).toBeNull();
    expect(screen.getByText('Upload listing definitions')).toBeTruthy();
  });
});
