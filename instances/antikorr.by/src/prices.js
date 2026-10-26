import { clean, parseMoney, vehicleClass } from '@anticor/harvest-core';

export const PRICE_NOTE = 'Цены ориентировочные. Точную стоимость комплекса уточняйте у менеджера.';

async function chooseRadio(page, name, index) {
  const input = page.locator(`input[name="${name}"]`).nth(index);
  if (await input.isChecked()) return;
  const oldTable = await page
    .locator('#price-table .table-wrapper > table')
    .first()
    .elementHandle();
  const responsePromise = page.waitForResponse(
    (response) => {
      const request = response.request();
      return (
        new URL(response.url()).pathname === '/wp-admin/admin-ajax.php' &&
        request.postData()?.includes('action=get_price_list')
      );
    },
    { timeout: 20000 },
  );
  const [response] = await Promise.all([responsePromise, input.locator('..').click()]);
  if (!response.ok()) throw new Error(`Price selector returned HTTP ${response.status()}`);
  await response.finished();
  await page.waitForFunction((table) => !table.isConnected, oldTable, { timeout: 10000 });
  await oldTable.dispose();
  await page.locator('#price-table .table-wrapper > table .pricetr').waitFor();
}

export async function readPriceVariants(page) {
  if (new URL(page.url()).pathname !== '/tsenyi/') return {};
  const brands = await page
    .locator('input[name="brandselect"]')
    .evaluateAll((inputs) =>
      inputs.map((input) => ({ id: input.value, name: input.dataset.name })),
    );
  const vehicles = await page.locator('input[name="autoselect"]').evaluateAll((inputs) =>
    inputs.map((input) => ({
      id: input.value,
      name: input.closest('label').querySelector('.title').textContent.replace(/\s+/g, ' ').trim(),
    })),
  );
  if (brands.length < 1 || vehicles.length < 1)
    throw new Error('Antikorr price selectors are missing');
  const variants = [];
  for (let brandIndex = 0; brandIndex < brands.length; brandIndex++) {
    await chooseRadio(page, 'brandselect', brandIndex);
    for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex++) {
      await chooseRadio(page, 'autoselect', vehicleIndex);
      const packages = await page
        .locator('#price-table .table-wrapper > table')
        .first()
        .evaluate((table) => {
          const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();
          const headers = [...table.rows[0].cells].slice(1);
          const amounts = [...table.querySelector('tr.pricetr').cells].slice(1);
          return headers.map((header, index) => ({
            id: String(index + 1),
            name: normalize(header.querySelector('.title')?.textContent),
            description: normalize(header.querySelector('span')?.textContent),
            price_text_original: normalize(amounts[index]?.textContent),
            features: [...table.querySelectorAll('tr.proptr')].map((row) => ({
              name: normalize(row.cells[0].textContent),
              included: Boolean(row.cells[index + 1]?.querySelector('img')),
            })),
          }));
        });
      if (!packages.length || packages.some((item) => !item.name || !item.price_text_original)) {
        throw new Error(
          `Antikorr returned an incomplete price table for ${brands[brandIndex].name}/${vehicles[vehicleIndex].name}: ${JSON.stringify(packages)}`,
        );
      }
      variants.push({ brand: brands[brandIndex], vehicle: vehicles[vehicleIndex], packages });
    }
  }
  return { price_calculator: { brands, vehicles, variants } };
}

export function parsePriceVariants(calculator, url) {
  if (!calculator?.variants?.length) throw new Error('Antikorr price calculator data is missing');
  const expected = calculator.brands.length * calculator.vehicles.length;
  const pairs = new Set(
    calculator.variants.map((variant) => `${variant.brand.id}:${variant.vehicle.id}`),
  );
  if (pairs.size !== expected || calculator.variants.length !== expected)
    throw new Error('Incomplete Antikorr brand/vehicle price coverage');
  const vehicles = calculator.vehicles.map((vehicle) => ({
    id: `vehicle-${vehicle.id}`,
    name_original: clean(vehicle.name),
    class: vehicleClass(vehicle.name),
  }));
  const services = new Map();
  for (const variant of calculator.variants) {
    for (const item of variant.packages) {
      const key = `complex-${item.id}-brand-${variant.brand.id}`;
      if (!services.has(key))
        services.set(key, {
          id: key,
          category: 'anticorrosion',
          name_original: `${item.name} (${variant.brand.name})`,
          description: item.description,
          url,
          prices: [],
        });
      const money = parseMoney(item.price_text_original);
      const negotiated = /^договор(?:ная)?\.?(?:\s*BYN)?$/iu.test(item.price_text_original);
      if (
        money.price === null &&
        money.price_min === null &&
        money.price_max === null &&
        !negotiated
      )
        throw new Error(`Unrecognized Antikorr price: ${item.price_text_original}`);
      services.get(key).prices.push({
        vehicle_type_id: `vehicle-${variant.vehicle.id}`,
        ...money,
        notes: negotiated
          ? `${PRICE_NOTE} Цена договорная; сумма на сайте не указана.`
          : PRICE_NOTE,
      });
    }
  }
  if ([...services.values()].some((service) => service.prices.length !== vehicles.length))
    throw new Error('Antikorr package missing a vehicle price');
  return { services: [...services.values()], vehicle_types: vehicles };
}

export function parseWashPrices(page, vehicles) {
  const table = page.tables.find((item) => item.rows[0]?.[0]?.text === 'Вид автомобиля');
  if (!table) throw new Error('Antikorr underbody-wash price table is missing');
  const headers = table.rows[0].slice(1);
  const amounts = table.rows[1]?.slice(1);
  if (!amounts || amounts.length !== headers.length)
    throw new Error('Incomplete Antikorr underbody-wash prices');
  return headers.map((header, index) => {
    const label = clean(header.text);
    let vehicle = vehicles.find((item) => item.name_original === label);
    if (!vehicle) {
      vehicle = {
        id: `wash-vehicle-${index + 1}`,
        name_original: label,
        class: vehicleClass(label),
      };
      vehicles.push(vehicle);
    }
    const original = clean(amounts[index].text);
    const money = parseMoney(original);
    if (money.price === null && money.price_min === null && !/не обслуживаем/iu.test(original))
      throw new Error(`Unrecognized wash price: ${original}`);
    return {
      vehicle_type_id: vehicle.id,
      ...money,
      notes:
        'Цена без снятия пластиковой защиты днища и колёсных арок. Валюта BYN используется по общему прайс-листу сайта.',
    };
  });
}
