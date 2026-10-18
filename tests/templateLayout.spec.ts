import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import pluginJson from '../src/plugin.json';
import { homePath, templatePath } from '../src/constants';
import { testIds } from '../src/components/testIds';
import type { EventTemplate } from '../src/templates/types';

const fullTemplate: EventTemplate = {
  id: 'layout-all-fields',
  name: 'All field types',
  description: 'A template with optional fields and wrapping metadata.',
  tags: ['operations', 'optional', 'tag-with-a-very-long-unbroken-name-'.repeat(5)],
  target: { region: 'ap-northeast-1', eventBusName: 'event-bus-with-a-long-name-'.repeat(5) },
  event: {
    source: 'company.operations.'.repeat(8),
    detailType: 'OperationsRequested',
    fixedDetail: { origin: 'provisioned' },
    fields: [
      { key: 'message', label: 'Message', type: 'string', required: true },
      { key: 'count', label: 'Count', type: 'number', required: false, default: 0 },
      { key: 'enabled', label: 'Enabled', type: 'boolean', required: false, default: false },
      { key: 'environment', label: 'Environment', type: 'select', required: false, options: ['staging', 'production'] },
      { key: 'payload', label: 'Payload', type: 'json', required: false, default: { enabled: true } },
    ],
  },
};
const fixedTemplate: EventTemplate = {
  ...fullTemplate,
  id: 'layout-fixed',
  name: 'Fixed event',
  description: undefined,
  tags: undefined,
  event: { ...fullTemplate.event, fields: undefined, fixedDetail: { fixed: true } },
};
const manyFieldsTemplate: EventTemplate = {
  ...fullTemplate,
  id: 'layout-many-fields',
  name: 'Many fields',
  event: {
    ...fullTemplate.event,
    fields: Array.from({ length: 20 }, (_, index) => ({
      key: `field${index}`,
      label: `Optional field ${index}`,
      type: 'string',
      required: false,
    })),
  },
};
const templates = [fullTemplate, fixedTemplate, manyFieldsTemplate];

async function mockTemplates(page: Page, provisionedTemplates = templates) {
  await page.addInitScript(() => {
    let copiedText = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          copiedText = text;
        },
        readText: async () => copiedText,
      },
    });
  });
  await page.route(`**/api/plugins/${pluginJson.id}/resources/templates**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/execute')) {
      await route.fulfill({ json: { status: 'unknown', message: 'Delivery status is unknown.' } });
      return;
    }
    const id = url.searchParams.get('id') ?? url.pathname.split('/templates/')[1];
    if (id) {
      const template = provisionedTemplates.find((item) => item.id === id);
      await route.fulfill({ status: template ? 200 : 404, json: template ?? { message: 'Template not found' } });
      return;
    }
    const query = url.searchParams.get('q') ?? '';
    await route.fulfill({ json: { templates: provisionedTemplates.filter((item) => item.name.includes(query)) } });
  });
}

for (const width of [1280, 800, 390]) {
  test(`template layout and typed fields at ${width}px`, async ({ gotoPage, page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await mockTemplates(page);
    await gotoPage('/home');
    const catalog = page.getByTestId(testIds.homePage.container);
    const card = catalog.getByRole('article', { name: fullTemplate.name });
    await expect(card).toBeVisible();
    await expect(catalog.getByRole('article')).toHaveCount(3);
    expect(await catalog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    const tag = await card.getByText(fullTemplate.tags![2], { exact: true }).boundingBox();
    const action = await card.getByRole('button', { name: 'Use template' }).boundingBox();
    expect(action!.y - (tag!.y + tag!.height)).toBeGreaterThanOrEqual(15);
    await testInfo.attach(`catalog-${width}`, {
      body: await page.screenshot({ path: testInfo.outputPath(`catalog-${width}.png`), fullPage: true }),
      contentType: 'image/png',
    });

    const search = catalog.getByRole('textbox', { name: 'Search templates' });
    await search.fill(fullTemplate.name);
    await catalog.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(catalog.getByRole('article')).toHaveCount(1);
    expect(await catalog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await search.fill('no-match');
    await catalog.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(catalog.getByText('No templates match your search', { exact: true })).toBeVisible();
    await search.fill('');
    await catalog.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(catalog.getByRole('article')).toHaveCount(3);

    await card.getByRole('button', { name: 'Use template' }).click();
    await expect(page).toHaveURL(new RegExp(`${templatePath(fullTemplate.id)}$`));
    await expect(page.getByRole('heading', { name: pluginJson.name, exact: true })).toBeVisible();
    const executor = page.getByRole('region', { name: `Use ${fullTemplate.name}` });
    const fields = executor.getByRole('group', { name: 'Detail fields' });
    for (const type of ['string', 'number', 'boolean', 'select', 'json']) {
      await expect(fields.getByText(type, { exact: true })).toBeVisible();
    }
    await fields.getByRole('textbox', { name: 'Message *', exact: true }).fill('hello');
    await fields.getByRole('spinbutton', { name: 'Count', exact: true }).fill('7');
    await fields.getByRole('checkbox', { name: 'Enabled', exact: true }).check({ force: true });
    await fields.getByRole('combobox', { name: 'Environment', exact: true }).click();
    await page.getByRole('option', { name: 'staging', exact: true }).click();
    await fields.getByRole('textbox', { name: 'Payload', exact: true }).fill('{"nested":true}');
    const preview = executor.getByRole('textbox', { name: 'Event JSON preview' });
    await expect(preview).toHaveValue(/"message": "hello"/);
    await expect(preview).toHaveValue(/"count": 7/);
    await expect(preview).toHaveValue(/"enabled": true/);
    await expect(preview).toHaveValue(/"environment": "staging"/);
    await expect(preview).toHaveValue(/"nested": true/);
    await executor.getByRole('textbox', { name: /^Detail type/ }).fill('CustomRequested');
    expect(JSON.parse(await preview.inputValue())).toEqual({
      region: fullTemplate.target.region,
      eventBusName: fullTemplate.target.eventBusName,
      source: fullTemplate.event.source,
      detailType: 'CustomRequested',
      detail: {
        origin: 'provisioned',
        message: 'hello',
        count: 7,
        enabled: true,
        environment: 'staging',
        payload: { nested: true },
      },
    });
    const copyButton = executor.getByRole('button', { name: 'Copy AWS CLI command', exact: true });
    await expect(copyButton).toHaveText('');
    await copyButton.click();
    const command = await page.evaluate(() => navigator.clipboard.readText());
    expect(command).toMatch(/^aws events put-events/);
    expect(command).toContain(`--region '${fullTemplate.target.region}'`);
    expect(command).toContain(`"Source":"${fullTemplate.event.source}"`);
    expect(command).toContain('"DetailType":"CustomRequested"');
    expect(command).toContain('\\"origin\\":\\"provisioned\\"');
    expect(command).toContain('\\"message\\":\\"hello\\"');
    expect(await executor.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    const fieldBoxes = await fields.locator(':scope > div > *').evaluateAll((elements) =>
      elements.map((element) => {
        const { top, bottom } = element.getBoundingClientRect();
        return { top, bottom };
      })
    );
    for (let index = 1; index < fieldBoxes.length; index++) {
      expect(fieldBoxes[index].top - fieldBoxes[index - 1].bottom).toBeGreaterThanOrEqual(15);
    }
    await executor.getByRole('button', { name: 'Send event' }).click();
    const result = executor.getByText('Delivery status unknown', { exact: true });
    await expect(result).toBeVisible();
    const previewBox = await preview.boundingBox();
    const resultBox = await result.boundingBox();
    expect(resultBox!.y - (previewBox!.y + previewBox!.height)).toBeGreaterThanOrEqual(15);
    await testInfo.attach(`executor-${width}`, {
      body: await page.screenshot({ path: testInfo.outputPath(`executor-${width}.png`), fullPage: true }),
      contentType: 'image/png',
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: `Use ${fullTemplate.name}`, exact: true })).toBeVisible();
    await expect(fields.getByRole('textbox', { name: 'Message *', exact: true })).toHaveValue('');
    await executor.getByRole('button', { name: 'Back to templates' }).click();
    await expect(page).toHaveURL(new RegExp(`${homePath}$`));
    await page.goBack();
    await expect(page.getByRole('heading', { name: `Use ${fullTemplate.name}`, exact: true })).toBeVisible();
  });
}

test('direct links support missing, fixed-only and many-field templates', async ({ gotoPage, page }) => {
  await mockTemplates(page);
  await gotoPage('/templates/missing-template');
  await expect(page.getByText('Template not found', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Template not found', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to templates' }).click();
  await expect(page.getByRole('heading', { name: 'Available templates' })).toBeVisible();

  await gotoPage(`/templates/${fixedTemplate.id}`);
  await expect(page.getByRole('heading', { name: `Use ${fixedTemplate.name}`, exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Detail fields' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Event JSON preview' })).toHaveValue(/"fixed": true/);
  await page.getByRole('button', { name: 'Copy AWS CLI command', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('\\"fixed\\":true');

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoPage(`/templates/${manyFieldsTemplate.id}`);
  await expect(page.getByRole('group', { name: 'Detail fields' }).getByRole('textbox')).toHaveCount(20);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${homePath}$`));
});

for (const id of ['team/job', 'team%2Fjob', 'team?job# space+日本語', 'execute']) {
  test(`template links and execution preserve ID ${id}`, async ({ gotoPage, page }) => {
    const template = { ...fixedTemplate, id, name: 'Special ID template' };
    await mockTemplates(page, [template]);
    await gotoPage('/home');
    await page.getByRole('article', { name: template.name }).getByRole('button', { name: 'Use template' }).click();
    const heading = page.getByRole('heading', { name: `Use ${template.name}`, exact: true });
    await expect(heading).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(templatePath(id));
    await page.reload();
    await expect(heading).toBeVisible();
    const executionRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        request.method() === 'POST' && url.pathname.endsWith('/templates/execute') && url.searchParams.get('id') === id
      );
    });
    await page.getByRole('button', { name: 'Send event', exact: true }).click();
    await executionRequest;
    await expect(page.getByText('Delivery status unknown', { exact: true })).toBeVisible();
  });
}

test('copying reports clipboard failure and can be retried', async ({ gotoPage, page }) => {
  await mockTemplates(page);
  await gotoPage(`/templates/${fixedTemplate.id}`);
  const copyButton = page.getByRole('button', { name: 'Copy AWS CLI command', exact: true });
  await expect(copyButton).toBeVisible();
  await page.evaluate(() => {
    const writeText = navigator.clipboard.writeText;
    let attempts = 0;
    navigator.clipboard.writeText = async (text: string) => {
      if (attempts++ === 0) {
        throw new Error('Clipboard access denied');
      }
      await writeText(text);
    };
  });
  await copyButton.click();
  const error = page.getByRole('alert', { name: 'Could not copy AWS CLI command', exact: true });
  await expect(error).toBeVisible();
  await copyButton.click();
  await expect(error).toHaveCount(0);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^aws events put-events/);
});

test('optional authentication fields keep their spacing on a narrow screen', async ({
  gotoAppConfigPage,
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await gotoAppConfigPage({ pluginId: pluginJson.id });
  const form = page.getByRole('group', { name: 'AWS authentication' }).locator('xpath=ancestor::form');
  const provider = form.getByRole('combobox', { name: 'Authentication Provider' });
  for (const option of ['Access & secret key', 'Credentials file', 'AWS SDK Default']) {
    await provider.click();
    await page.getByRole('option', { name: option }).click();
    const fields = form.getByRole('group', { name: 'AWS authentication' });
    const boxes = await fields.locator(':scope > div > *').evaluateAll((elements) =>
      elements.map((element) => {
        const { top, bottom } = element.getBoundingClientRect();
        return { top, bottom };
      })
    );
    for (let index = 1; index < boxes.length; index++) {
      expect(boxes[index].top - boxes[index - 1].bottom).toBeGreaterThanOrEqual(15);
    }
    expect(await form.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  await testInfo.attach('authentication-mobile', {
    body: await page.screenshot({ path: testInfo.outputPath('authentication-mobile.png'), fullPage: true }),
    contentType: 'image/png',
  });
});
