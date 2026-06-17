export const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[`'"’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
