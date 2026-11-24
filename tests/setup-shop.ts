import { vi } from 'vitest';

// Most tests exercise selling, so they run as an online store. catalog-mode.test.ts uses the real switch.
vi.mock('@/lib/server/store-mode', async (original) => ({
  ...(await original<typeof import('@/lib/server/store-mode')>()),
  isCatalogMode: async () => false,
  catalogClosed: async () => null,
  closedInCatalog: async () => {},
}));
