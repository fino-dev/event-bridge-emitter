import { test, expect } from './fixtures';

test('should be possible to save AWS authentication settings', async ({ appConfigPage, page }) => {
  const saveButton = page.getByRole('button', { name: /Save and test/i });
  const region = page.getByRole('textbox', { name: 'Default Region' });

  await region.clear();
  await region.fill('ap-northeast-1');

  const saveResponse = appConfigPage.waitForSettingsResponse();
  await saveButton.click();
  await expect(saveResponse).toBeOK();
});
