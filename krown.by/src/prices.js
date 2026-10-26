import { clean, parseMoney, vehicleClass } from '@anticor/harvest-core';

export function parseKrownPrices(page) {
  const vehicles = [];
  const services = [];
  const vehicleId = (label) => {
    label = clean(label);
    let vehicle = vehicles.find((item) => item.name_original === label);
    if (!vehicle) {
      vehicle = { id: `vehicle-${vehicles.length + 1}`, name_original: label, class: vehicleClass(label) };
      vehicles.push(vehicle);
    }
    return vehicle.id;
  };
  const addService = (name, category) => {
    const service = { id: `service-${services.length + 1}`, category, name_original: clean(name), url: page.url, prices: [] };
    services.push(service);
    return service;
  };
  let antiRows = 0;
  for (const table of page.tables) {
    const rows = table.rows;
    const anti = rows.filter((row) => row.length >= 5 && /^\d+$/.test(row[0].text) && /(?:BYN|\d)/iu.test(row[2].text));
    if (anti.length && rows.flat().some((cell) => /Повторная|Полная обработка/iu.test(cell.text))) {
      const headerNames = rows.find((row) => row.length === 3 && row.every((cell) => /обработ/iu.test(cell.text)))?.map((cell) => cell.text)
        || ['Полная обработка', 'Обработка днища', 'Повторная обработка'];
      const targets = headerNames.map((name) => addService(name, 'anticorrosion'));
      for (const row of anti) {
        const id = vehicleId(row[1].text);
        for (let column = 0; column < 3; column++) targets[column].prices.push({ vehicle_type_id: id, ...parseMoney(row[column + 2].text) });
        antiRows++;
      }
      continue;
    }
    // Other price tables use a row of vehicle labels, followed by service-price rows.
    const headerIndex = rows.findIndex((row) => row.filter((cell) => /Легковой|Кроссовер|Минив[еэ]н|Внедорожник|Микроавтобус|Бус/iu.test(cell.text)).length >= 2);
    if (headerIndex < 0) continue;
    const headers = rows[headerIndex].filter((cell) => /Легковой|Кроссовер|Минив[еэ]н|Внедорожник|Микроавтобус|Бус/iu.test(cell.text));
    for (const row of rows.slice(headerIndex + 1)) {
      if (row.length < 2 || !row[0].text) continue;
      const priceCells = row.slice(1);
      if (!priceCells.some((cell) => /\d/.test(cell.text))) continue;
      const service = addService(row[0].text, 'additional');
      if (priceCells.length === 1 && priceCells[0].colspan > 1) {
        service.prices.push({ vehicle_type_id: vehicleId('Все автомобили'), ...parseMoney(priceCells[0].text) });
      } else {
        priceCells.forEach((cell, column) => {
          if (!headers[column] || /^[-—–]$/.test(cell.text)) return;
          service.prices.push({ vehicle_type_id: vehicleId(headers[column].text), ...parseMoney(cell.text) });
        });
      }
    }
  }
  if (!antiRows) throw new Error('KROWN price table markup changed: no anti-corrosion rows found; refusing to publish empty prices');
  return { vehicle_types: vehicles, services };
}
