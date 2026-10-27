export interface ServiceGroupRule {
  id: string;
  label: string;
  match: RegExp;
}

// Maps each site's service names to one comparable service. Rules are checked in order against
// the start of `name_original`; the first match wins. Services that match nothing are shown
// under their own (trimmed) name, as offered by a single company. Add rules when a new site
// names an existing service differently.
export const serviceGroups: ServiceGroupRule[] = [
  {
    id: 'anticorrosion-full',
    label: 'Полная антикоррозийная обработка',
    // Whole-car treatment as each site names it: "Полная обработка", "Полный комплекс…",
    // "Комплексная защита/обработка" or a bare "Антикоррозийная обработка (автомобиля)".
    match:
      /^(полная обработка|(базовый )?полный комплекс|комплексн(ая|ую) (защит|обработк)|антикорр?ози[йо]н+ая обработка(\s+автомобил(я|ей))?$)/i,
  },
  {
    id: 'anticorrosion-underbody',
    label: 'Антикор днища',
    match: /^(обработка днища|антикорр?ози[йо]н+ая обработка днища|днище$)/i,
  },
  {
    id: 'anticorrosion-body',
    label: 'Антикор кузова',
    match: /^антикорр?ози[йо]н+ая обработка кузова/i,
  },
  {
    id: 'anticorrosion-sills-arches',
    label: 'Антикор порогов и арок',
    match: /^антикорр?ози[йо]н+ая обработка порогов и арок/i,
  },
  {
    id: 'anticorrosion-sills',
    label: 'Антикор порогов',
    match: /^(антикорр?ози[йо]н+ая обработка порогов|пороги$)/i,
  },
  {
    id: 'anticorrosion-arches',
    label: 'Антикор арок',
    match: /^(антикорр?ози[йо]н+ая обработка арок|арки и крылья$)/i,
  },
  {
    id: 'anticorrosion-cavities',
    label: 'Антикор скрытых полостей',
    match: /^(антикорр?ози[йо]н+ая обработка скрытых полостей|скрытые полости$)/i,
  },
  {
    id: 'anticorrosion-hood',
    label: 'Антикор капота',
    match: /^(антикорр?ози[йо]н+ая обработка капота|капот$)/i,
  },
  {
    id: 'anticorrosion-ev',
    label: 'Антикор электромобилей',
    match: /^антикор(р?ози[йо]н+ая обработка)? электромобилей/i,
  },
  {
    id: 'inspection',
    label: 'Осмотр и оценка состояния днища',
    match: /^(антикорр?ози[йо]н+ая экспертиза|бесплатная оценка стоимости|диагностик[уа] днища)/i,
  },
  {
    id: 'sandblasting',
    label: 'Пескоструйная обработка',
    match:
      /^((пескоструй|пескоструйная обработка)$|пескоструйная (очистка днища|обработка кузова))/i,
  },
  {
    id: 'laser-cleaning',
    label: 'Лазерная очистка от ржавчины',
    match: /^лазерн(ая|ое) (чистка|очистка|удаление коррозии)(\s+(металла|кузова)|$)/i,
  },
  { id: 'welding', label: 'Сварочные работы', match: /^сварочн(ые|ых) работ/i },
  // antikorr.by sells the same four anticorrosion packages with two material brands.
  ...['Dinitrol', 'Noxudol'].flatMap((brand) =>
    [
      [1, 'Комплекс №1'],
      [2, 'Комплекс №2'],
      [3, 'Комплекс №3 «Бесшумка» Эко'],
      [4, 'Комплекс №4 «Бесшумка»'],
    ].map(([number, title]) => ({
      id: `anticorrosion-complex-${number}-${brand.toLowerCase()}`,
      label: `Антикор: ${title} (${brand})`,
      match: new RegExp(`^комплекс №\\s?${number}\\b.*\\(${brand}\\)`, 'i'),
    })),
  ),
  {
    id: 'anticorrosion-repeat',
    label: 'Повторная антикор обработка',
    match: /^повторная обработка/i,
  },
  { id: 'wax-protection', label: 'Защита кузова воском', match: /^покрытие автомобиля .*воском/i },
  { id: 'soundproofing', label: 'Шумоизоляция', match: /^шумоизоляция/i },
  {
    id: 'underbody-wash-antisalt',
    label: 'Мойка днища с антисолью',
    match: /^мойка днища с "?антисолью/i,
  },
  {
    id: 'underbody-wash-heavy',
    label: 'Мойка сильно загрязнённого днища',
    match: /^мойка сильно загрязн[её]нного днища/i,
  },
  {
    id: 'underbody-wash',
    label: 'Мойка днища',
    match: /^мойка днища( и арок| автомобиля| на подъ[её]мнике)/i,
  },
  {
    id: 'body-wash-antisalt',
    label: 'Мойка кузова с антисолью',
    match: /^мойка кузова с "?антисолью/i,
  },
  // KROWN car-wash packages. Matching the wash description (or "Стандарт" inside "Комплекс")
  // keeps them apart from anticorrosion packages that other sites also call "Стандарт".
  {
    id: 'wash-standard-plus',
    label: 'Мойка «Стандарт плюс»',
    match: /^стандарт плюс\s+двухфазная/i,
  },
  { id: 'wash-standard', label: 'Мойка «Стандарт»', match: /^стандарт\s+двухфазная/i },
  {
    id: 'wash-complex-1',
    label: 'Мойка «Комплекс №1»',
    match: /^комплекс №\s?1\s*["“«]?стандарт/i,
  },
  {
    id: 'wash-complex-2',
    label: 'Мойка «Комплекс №2»',
    match: /^комплекс №\s?2\s*["“«]?стандарт/i,
  },
  { id: 'engine-wash-top', label: 'Мойка двигателя сверху', match: /^мойка двигателя сверху/i },
  { id: 'engine-wash-bottom', label: 'Мойка двигателя снизу', match: /^мойка двигателя снизу/i },
  {
    id: 'antirain-front-hemisphere',
    label: 'Антидождь: передняя полусфера',
    match: /^антидождь \(aquapel\) передняя полусфера/i,
  },
  { id: 'antirain-glass', label: 'Антидождь на лобовое/заднее стекло', match: /^антидождь на/i },
  {
    id: 'interior-cleaning-heavy',
    label: 'Уборка салона от шерсти и сложных загрязнений',
    match: /^уборка салона от шерсти/i,
  },
  { id: 'interior-cleaning', label: 'Уборка салона', match: /^уборка салона/i },
  { id: 'mats-wash', label: 'Мойка ковриков (4 шт.)', match: /^мойка резиновых ковриков/i },
  { id: 'glass-wash', label: 'Мойка стёкол и зеркал', match: /^мойка ст[её]кол и зеркал/i },
  { id: 'ozonation', label: 'Озонирование салона', match: /^озонирование салона/i },
  { id: 'paint-deep-cleaning', label: 'Глубокая чистка ЛКП', match: /^глубокая чистка лкп/i },
  { id: 'wheel-cleaning', label: 'Отбеливание дисков (за 1 диск)', match: /^отбеливание дисков/i },
  {
    id: 'bitumen-removal',
    label: 'Удаление битума и металлических вкраплений',
    match: /^удаление битумных загрязнений/i,
  },
  { id: 'midge-removal', label: 'Удаление мошек', match: /^удаление мошек/i },
  {
    id: 'skid-plate-removal',
    label: 'Снятие и установка защиты двигателя/днища',
    match: /^снятие и установка защиты/i,
  },
];
