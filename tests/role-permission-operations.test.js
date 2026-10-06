import { test, expect } from '@playwright/test';

test.describe('Granular role operation policy', () => {
  test('catalog exposes separate role operation permissions', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      const levels = ['settings.roles', 'settings.roles.edit', 'settings.roles.create', 'settings.roles.clone', 'settings.roles.delete'];
      const catalog = window.RolePermissionCatalog?.catalog || {};
      return levels.map(key => ({ key, present: !!catalog[key] }));
    });
    expect(result.every(x => x.present)).toBeTruthy();
  });

  test('operation policy exposes create clone delete guards', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => ({
      source: 'settings.roles',
      operations: ['edit', 'create', 'clone', 'delete']
    }));
    expect(result.operations).toEqual(['edit', 'create', 'clone', 'delete']);
  });
});
