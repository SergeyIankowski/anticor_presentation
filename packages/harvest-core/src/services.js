// The unified service list. Every parsed service gets a `service_key`: the key of the first rule
// whose `match` fits the start of `name_original`, or `<domain>:<service id>` when none does.
// Keys are shared when sites name the same service differently; a key used by one site only is a
// service no other company offers. Add rules when a new site names an existing service
// differently, then run `pnpm services:keys` to rewrite the keys in the parsed datasets.
export const serviceCatalog = [
  {
    key: 'anticorrosion-full',
    label: 'Полная антикоррозийная обработка',
    // Whole-car treatment as each site names it: "Полная обработка", "Полный комплекс…",
    // "Комплексная защита/обработка" or a bare "Антикоррозийная обработка (автомобиля)".
    match:
      /^(полная обработка|(базовый )?полный комплекс|комплексн(ая|ую) (защит|обработк)|антикорр?ози[йо]н+ая обработка(\s+автомобил(я|ей))?$)/i,
  },
  {
    key: 'anticorrosion-underbody',
    label: 'Антикор днища',
    match: /^(обработка днища|антикорр?ози[йо]н+ая обработка днища|днище$)/i,
  },
  {
    key: 'anticorrosion-body',
    label: 'Антикор кузова',
    match: /^антикорр?ози[йо]н+ая обработка кузова/i,
  },
  {
    key: 'anticorrosion-sills-arches',
    label: 'Антикор порогов и арок',
    match: /^антикорр?ози[йо]н+ая обработка порогов и арок/i,
  },
  {
    key: 'anticorrosion-sills',
    label: 'Антикор порогов',
    match: /^(антикорр?ози[йо]н+ая обработка порогов|пороги$)/i,
  },
  {
    key: 'anticorrosion-arches',
    label: 'Антикор арок',
    match: /^(антикорр?ози[йо]н+ая обработка арок|арки и крылья$)/i,
  },
  {
    key: 'anticorrosion-cavities',
    label: 'Антикор скрытых полостей',
    match: /^(антикорр?ози[йо]н+ая обработка скрытых полостей|скрытые полости$)/i,
  },
  {
    key: 'anticorrosion-hood',
    label: 'Антикор капота',
    match: /^(антикорр?ози[йо]н+ая обработка капота|капот$)/i,
  },
  {
    key: 'anticorrosion-ev',
    label: 'Антикор электромобилей',
    match: /^антикор(р?ози[йо]н+ая обработка)? электромобилей/i,
  },
  {
    key: 'inspection',
    label: 'Осмотр и оценка состояния днища',
    match: /^(антикорр?ози[йо]н+ая экспертиза|бесплатная оценка стоимости|диагностик[уа] днища)/i,
  },
  {
    key: 'sandblasting-mobile',
    label: 'Выездной пескоструй',
    match: /^(пескоструйная обработка с выездом|выездной пескоструй)/i,
  },
  {
    key: 'sandblasting-frames',
    label: 'Пескоструй рам',
    match: /^(пескоструй рам|рама внедорожника$)/i,
  },
  {
    key: 'sandblasting',
    label: 'Пескоструйная обработка',
    // antikorim.by prices underbody sandblasting per vehicle size as "Днище легкового авто" etc.
    match:
      /^((пескоструй|пескоструйная обработка)$|пескоструйная (очистка днища|обработка кузова)|беспылевая пескоструйная обработка|днище (легкового авто|кроссовера|джипа))/i,
  },
  {
    key: 'laser-cleaning',
    label: 'Лазерная очистка от ржавчины',
    match: /^лазерн(ая|ое) (чистка|очистка|удаление коррозии)(\s+(металла|кузова)|$)/i,
  },
  {
    key: 'welding-sills',
    label: 'Переварка порогов',
    match: /^(переварка порог|фрагмент порога$)/i,
  },
  { key: 'welding-arches', label: 'Переварка арок', match: /^(переварка арк|кромка арки$)/i },
  {
    key: 'welding-underbody',
    label: 'Переварка днища',
    match: /^(переварка днища|участок днища$)/i,
  },
  { key: 'welding-patch', label: 'Сварка: латка', match: /^(поставить латку|латка(\s|$))/i },
  {
    key: 'welding',
    label: 'Сварочные работы',
    match: /^(сварочн(ые|ых) работ|переварка автомобиля)/i,
  },
  {
    key: 'body-painting',
    label: 'Кузовной ремонт и покраска',
    match: /^(кузовной ремонт, покраска|покраска авто)/i,
  },
  {
    key: 'vin-cleaning',
    label: 'Восстановление и чистка VIN-номера',
    match: /^(восстановление|чистка) vin-номера/i,
  },
  {
    key: 'protective-film',
    label: 'Оклейка антигравийной плёнкой',
    match: /^(оклейка автомобиля антигравийн|полная оклейка$)/i,
  },
  {
    key: 'headlight-polishing',
    label: 'Полировка фар',
    match: /^(бронирование и )?полировка фар/i,
  },
  // antikorr.by sells the same four anticorrosion packages with two material brands.
  ...['Dinitrol', 'Noxudol'].flatMap((brand) =>
    [
      [1, 'Комплекс №1'],
      [2, 'Комплекс №2'],
      [3, 'Комплекс №3 «Бесшумка» Эко'],
      [4, 'Комплекс №4 «Бесшумка»'],
    ].map(([number, title]) => ({
      key: `anticorrosion-complex-${number}-${brand.toLowerCase()}`,
      label: `Антикор: ${title} (${brand})`,
      match: new RegExp(`^комплекс №\\s?${number}\\b.*\\(${brand}\\)`, 'i'),
    })),
  ),
  {
    key: 'anticorrosion-repeat',
    label: 'Повторная антикор обработка',
    match: /^повторная обработка/i,
  },
  { key: 'wax-protection', label: 'Защита кузова воском', match: /^покрытие автомобиля .*воском/i },
  { key: 'soundproofing', label: 'Шумоизоляция', match: /^(напыляемая )?шумоизоляция/i },
  {
    key: 'underbody-wash-antisalt',
    label: 'Мойка днища с антисолью',
    match: /^мойка днища с "?антисолью/i,
  },
  {
    key: 'underbody-wash-heavy',
    label: 'Мойка сильно загрязнённого днища',
    match: /^мойка сильно загрязн[её]нного днища/i,
  },
  {
    key: 'underbody-wash',
    label: 'Мойка днища',
    match: /^мойка днища( и арок| автомобиля| на подъ[её]мнике)/i,
  },
  {
    key: 'body-wash-antisalt',
    label: 'Мойка кузова с антисолью',
    match: /^мойка кузова с "?антисолью/i,
  },
  // KROWN car-wash packages. Matching the wash description (or "Стандарт" inside "Комплекс")
  // keeps them apart from anticorrosion packages that other sites also call "Стандарт".
  {
    key: 'wash-standard-plus',
    label: 'Мойка «Стандарт плюс»',
    match: /^стандарт плюс\s+двухфазная/i,
  },
  { key: 'wash-standard', label: 'Мойка «Стандарт»', match: /^стандарт\s+двухфазная/i },
  {
    key: 'wash-complex-1',
    label: 'Мойка «Комплекс №1»',
    match: /^комплекс №\s?1\s*["“«]?стандарт/i,
  },
  {
    key: 'wash-complex-2',
    label: 'Мойка «Комплекс №2»',
    match: /^комплекс №\s?2\s*["“«]?стандарт/i,
  },
  { key: 'engine-wash-top', label: 'Мойка двигателя сверху', match: /^мойка двигателя сверху/i },
  { key: 'engine-wash-bottom', label: 'Мойка двигателя снизу', match: /^мойка двигателя снизу/i },
  {
    key: 'antirain-front-hemisphere',
    label: 'Антидождь: передняя полусфера',
    match: /^антидождь \(aquapel\) передняя полусфера/i,
  },
  { key: 'antirain-glass', label: 'Антидождь на лобовое/заднее стекло', match: /^антидождь на/i },
  {
    key: 'interior-cleaning-heavy',
    label: 'Уборка салона от шерсти и сложных загрязнений',
    match: /^уборка салона от шерсти/i,
  },
  { key: 'interior-cleaning', label: 'Уборка салона', match: /^уборка салона/i },
  { key: 'mats-wash', label: 'Мойка ковриков (4 шт.)', match: /^мойка резиновых ковриков/i },
  { key: 'glass-wash', label: 'Мойка стёкол и зеркал', match: /^мойка ст[её]кол и зеркал/i },
  { key: 'ozonation', label: 'Озонирование салона', match: /^озонирование салона/i },
  { key: 'paint-deep-cleaning', label: 'Глубокая чистка ЛКП', match: /^глубокая чистка лкп/i },
  { key: 'wheel-cleaning', label: 'Отбеливание дисков (за 1 диск)', match: /^отбеливание дисков/i },
  {
    key: 'bitumen-removal',
    label: 'Удаление битума и металлических вкраплений',
    match: /^удаление битумных загрязнений/i,
  },
  { key: 'midge-removal', label: 'Удаление мошек', match: /^удаление мошек/i },
  {
    key: 'skid-plate-removal',
    label: 'Снятие и установка защиты двигателя/днища',
    match: /^снятие и установка защиты/i,
  },
];

const labels = new Map(serviceCatalog.map(({ key, label }) => [key, label]));

export function serviceKey(domain, service) {
  const name = service.name_original.trim();
  return serviceCatalog.find(({ match }) => match.test(name))?.key ?? `${domain}:${service.id}`;
}

// The catalog label of a unified key; undefined for a site's own `<domain>:<id>` key.
export const serviceLabel = (key) => labels.get(key);

// Sets `service_key` right after each service's `id`, keeping the other fields in their order.
export function withServiceKeys(domain, comparison) {
  return {
    ...comparison,
    services: comparison.services.map((service) => {
      const key = serviceKey(domain, service);
      return Object.fromEntries(
        Object.entries(service).flatMap(([name, value]) => {
          if (name === 'service_key') return [];
          return name === 'id'
            ? [
                [name, value],
                ['service_key', key],
              ]
            : [[name, value]];
        }),
      );
    }),
  };
}
