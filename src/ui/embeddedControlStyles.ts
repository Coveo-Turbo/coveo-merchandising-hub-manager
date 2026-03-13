const embeddedFieldBorder = {
  backgroundColor: 'var(--mantine-color-body)',
  borderColor: 'var(--coveo-color-input-border, var(--mantine-color-default-border))',
  borderStyle: 'solid',
  borderWidth: '1px',
};

export const embeddedSegmentedControlStyles = {
  root: {
    backgroundColor: 'var(--mantine-color-gray-light)',
    border: '1px solid var(--mantine-color-default-border)',
    borderRadius: 'var(--mantine-radius-md)',
    boxShadow: 'none',
    padding: '2px',
  },
  indicator: {
    backgroundColor: 'var(--mantine-color-body)',
    border: '1px solid var(--mantine-color-default-border)',
    boxShadow: 'var(--mantine-shadow-xs)',
  },
  label: {
    fontWeight: 'var(--coveo-fw-normal, 400)',
  },
  innerLabel: {
    fontWeight: 'inherit',
  },
};

export const embeddedInputStyles = {
  input: embeddedFieldBorder,
};

export const embeddedTagsInputStyles = {
  pillsList: {
    ...embeddedFieldBorder,
    borderRadius: 'var(--mantine-radius-md)',
    gap: '0.375rem',
    minHeight: 'var(--input-height, 2.25rem)',
    paddingBlock: 'calc(0.5rem - 1px)',
    paddingInline: 'calc(0.75rem - 1px)',
  },
  inputField: {
    minHeight: '1.25rem',
  },
};
