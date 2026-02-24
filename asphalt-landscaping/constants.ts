
import { Resource, Category, Project, Milestone, ServiceCategory, AsphaltWorkType, AIKnowledgeSection } from './types';

export const INITIAL_RESOURCES: Resource[] = [
  // ═══════════════════════════════════════════════════════════
  // МАТЕРИАЛЫ — Асфальтобетон
  // ═══════════════════════════════════════════════════════════
  { id: 'm1', name: 'Смесь а/б мелкозернистая тип Б марка II, ГОСТ 9128-2013 (франко-завод, без доставки)', category: Category.MATERIAL, unit: 'т', costPerUnit: 4900, serviceCategory: ServiceCategory.ASPHALT, subGroup: 'Асфальтобетон' },
  { id: 'm2', name: 'Доставка а/б смеси автотранспортом, плечо до 30 км', category: Category.MATERIAL, unit: 'т', costPerUnit: 550, serviceCategory: ServiceCategory.ASPHALT, subGroup: 'Асфальтобетон' },
  { id: 'm24', name: 'Смесь а/б крупнозернистая тип А марка I, ГОСТ 9128-2013 (франко-завод, без доставки)', category: Category.MATERIAL, unit: 'т', costPerUnit: 5200, serviceCategory: ServiceCategory.ASPHALT, subGroup: 'Асфальтобетон' },
  { id: 'm25', name: 'Смесь а/б песчаная тип Д марка II, ГОСТ 9128-2013 (франко-завод, без доставки)', category: Category.MATERIAL, unit: 'т', costPerUnit: 4500, serviceCategory: ServiceCategory.ASPHALT, subGroup: 'Асфальтобетон' },
  { id: 'm26', name: 'Смесь ЩМА-15, ГОСТ 31015-2002 (франко-завод, без доставки)', category: Category.MATERIAL, unit: 'т', costPerUnit: 6200, serviceCategory: ServiceCategory.ASPHALT, subGroup: 'Асфальтобетон' },
  { id: 'm15', name: 'Подгрунтовка основания битумной эмульсией катионной ЭБК-1, ГОСТ Р 52128-2003, расход 0.5 л/м²', category: Category.MATERIAL, unit: 'л', costPerUnit: 45, serviceCategory: ServiceCategory.ASPHALT, subGroup: 'Асфальтобетон' },

  // ═══════════════════════════════════════════════════════════
  // МАТЕРИАЛЫ — Щебень
  // ═══════════════════════════════════════════════════════════
  { id: 'm3', name: 'Щебень гранитный фр. 20-40 мм, М1200, ГОСТ 8267-93, F300', category: Category.MATERIAL, unit: 'м³', costPerUnit: 5500, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Щебень' },
  { id: 'm16', name: 'Щебень гравийный фр. 20-40 мм, М800, ГОСТ 8267-93', category: Category.MATERIAL, unit: 'м³', costPerUnit: 4500, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Щебень' },
  { id: 'm17', name: 'Щебень известняковый фр. 20-40 мм, М600, ГОСТ 8267-93', category: Category.MATERIAL, unit: 'м³', costPerUnit: 3300, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Щебень' },
  { id: 'm18', name: 'Щебень вторичный (дроблёный бетон) фр. 20-40 мм, ТУ', category: Category.MATERIAL, unit: 'м³', costPerUnit: 2500, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Щебень' },
  { id: 'm36', name: 'Щебень гранитный фр. 5-20 мм (расклинцовка), М1200', category: Category.MATERIAL, unit: 'м³', costPerUnit: 5800, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Щебень' },

  // ═══════════════════════════════════════════════════════════
  // МАТЕРИАЛЫ — Песок и геоматериалы
  // ═══════════════════════════════════════════════════════════
  { id: 'm4', name: 'Песок строительный среднезернистый, Мкр≥2.0, Кф≥5 м/сут, ГОСТ 8736-2014', category: Category.MATERIAL, unit: 'м³', costPerUnit: 1300, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Песок и геоматериалы' },
  { id: 'm5', name: 'Геотекстиль иглопробивной, плотн. 200 г/м², ГОСТ Р 56338-2015, разделительный слой', category: Category.MATERIAL, unit: 'м²', costPerUnit: 60, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Песок и геоматериалы' },
  { id: 'm32', name: 'ПГС (песчано-гравийная смесь) фр. 0-40 мм, для устройства оснований', category: Category.MATERIAL, unit: 'м³', costPerUnit: 1800, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Песок и геоматериалы' },
  { id: 'm33', name: 'Геотекстиль иглопробивной, плотн. 300 г/м², армирующий/разделительный слой', category: Category.MATERIAL, unit: 'м²', costPerUnit: 90, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Песок и геоматериалы' },
  { id: 'm37', name: 'Песок карьерный (для обратной засыпки траншей и пазух)', category: Category.MATERIAL, unit: 'м³', costPerUnit: 800, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Песок и геоматериалы' },

  // ═══════════════════════════════════════════════════════════
  // МАТЕРИАЛЫ — Бордюры
  // ═══════════════════════════════════════════════════════════
  { id: 'm7', name: 'Бордюр дорожный БР 100.30.18, ГОСТ 6665-91, серый', category: Category.MATERIAL, unit: 'шт', costPerUnit: 500, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Бордюры' },
  { id: 'm19', name: 'Бордюр садовый БР 100.20.8, ГОСТ 6665-91, серый', category: Category.MATERIAL, unit: 'шт', costPerUnit: 250, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Бордюры' },
  { id: 'm31', name: 'Бетон товарный В15 (М200), для основания бордюра и фундаментных работ', category: Category.MATERIAL, unit: 'м³', costPerUnit: 5500, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Бордюры' },

  // ═══════════════════════════════════════════════════════════
  // МАТЕРИАЛЫ — Плитка и мощение
  // ═══════════════════════════════════════════════════════════
  { id: 'm6', name: 'Плитка тротуарная вибропрессованная, толщ. 60 мм, кл. В22.5, F200, ГОСТ 17608-2017', category: Category.MATERIAL, unit: 'м²', costPerUnit: 900, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Плитка и мощение' },
  { id: 'm30', name: 'ЦПС (цементно-песчаная смесь) М150, подстилающий слой под плитку/бордюр', category: Category.MATERIAL, unit: 'м³', costPerUnit: 3500, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Плитка и мощение' },

  // ═══════════════════════════════════════════════════════════
  // МАТЕРИАЛЫ — Озеленение
  // ═══════════════════════════════════════════════════════════
  { id: 'm8', name: 'Грунт плодородный растительный, ГОСТ 25100-2020, с доставкой', category: Category.MATERIAL, unit: 'м³', costPerUnit: 1500, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Озеленение' },
  { id: 'm9', name: 'Газон рулонный из мятлика лугового, 1 сорт, толщ. дёрна ≥ 20 мм', category: Category.MATERIAL, unit: 'м²', costPerUnit: 250, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Озеленение' },
  { id: 'm10', name: 'Саженцы деревьев лиственных крупномерных, h=2.0–2.5 м, с комом ∅0.5 м', category: Category.MATERIAL, unit: 'шт', costPerUnit: 3500, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Озеленение' },
  { id: 'm34', name: 'Семена газонных трав (мятлик + овсяница), расход 30-40 г/м²', category: Category.MATERIAL, unit: 'кг', costPerUnit: 350, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Озеленение' },

  // ═══════════════════════════════════════════════════════════
  // МАТЕРИАЛЫ — Ливневая канализация
  // ═══════════════════════════════════════════════════════════
  { id: 'm20', name: 'Дождеприёмник ДБ пластиковый 300×300 мм, с решёткой чугунной кл. В125', category: Category.MATERIAL, unit: 'шт', costPerUnit: 3500, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },
  { id: 'm21', name: 'Лоток водоотводной бетонный DN100 с решёткой стальной оцинкованной кл. А15', category: Category.MATERIAL, unit: 'п.м', costPerUnit: 1200, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },
  { id: 'm22', name: 'Труба ПВХ канализационная наружная ∅110 мм, SN4, ГОСТ 32413-2013', category: Category.MATERIAL, unit: 'п.м', costPerUnit: 350, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },
  { id: 'm23', name: 'Пескоуловитель пластиковый 500×160 мм, с корзиной для мусора', category: Category.MATERIAL, unit: 'шт', costPerUnit: 4200, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },
  { id: 'm27', name: 'Колодец смотровой полимерный ∅400 мм, с крышкой, глубина до 1.5 м (новое строительство)', category: Category.MATERIAL, unit: 'шт', costPerUnit: 18000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },
  { id: 'm28', name: 'Кольцо удлинительное (надставка) для регулировки высоты колодца, полимерное', category: Category.MATERIAL, unit: 'шт', costPerUnit: 3500, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },
  { id: 'm29', name: 'Люк полимерно-композитный для колодца, кл. нагрузки А15/В125', category: Category.MATERIAL, unit: 'шт', costPerUnit: 4500, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },
  { id: 'm35', name: 'Труба ПВХ канализационная наружная ∅160 мм, SN4, ГОСТ 32413-2013', category: Category.MATERIAL, unit: 'п.м', costPerUnit: 550, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },

  // ═══════════════════════════════════════════════════════════
  // ТЕХНИКА — Асфальтирование
  // ═══════════════════════════════════════════════════════════
  { id: 'eq1', name: 'Асфальтоукладчик гусеничный, ширина укладки 2.5–5.0 м', category: Category.MACHINERY, unit: 'м/см', costPerUnit: 110000, serviceCategory: ServiceCategory.ASPHALT, subGroup: 'Асфальтирование' },
  { id: 'eq2', name: 'Каток вибрационный тандемный 4 т (асфальтовый), ширина вальца 1.2 м, с доставкой на объект', category: Category.MACHINERY, unit: 'м/см', costPerUnit: 25000, serviceCategory: ServiceCategory.ASPHALT, subGroup: 'Асфальтирование' },
  { id: 'eq8', name: 'Доставка а/б смеси самосвалом до 30 т', category: Category.MACHINERY, unit: 'рейс', costPerUnit: 15000, serviceCategory: ServiceCategory.ASPHALT, subGroup: 'Асфальтирование' },
  { id: 'eq14', name: 'Доставка асфальтоукладчика на объект и обратно (тралом)', category: Category.MACHINERY, unit: 'компл.', costPerUnit: 50000, serviceCategory: ServiceCategory.ASPHALT, subGroup: 'Асфальтирование' },
  // eq15 убран — доставка катка 4т включена в стоимость аренды (eq2)

  // ═══════════════════════════════════════════════════════════
  // ТЕХНИКА — Демонтаж
  // ═══════════════════════════════════════════════════════════
  { id: 'eq11', name: 'Фрезерование а/б покрытия, дорожная фреза (работа 75 ₽/м² + доставка 50 000)', category: Category.MACHINERY, unit: 'м²', costPerUnit: 75, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Демонтаж' },
  { id: 'eq12', name: 'Доставка дорожной фрезы на объект и обратно', category: Category.MACHINERY, unit: 'компл.', costPerUnit: 50000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Демонтаж' },
  { id: 'eq13', name: 'Гидромолот на базе экскаватора, демонтаж покрытий малый объём', category: Category.MACHINERY, unit: 'м/см', costPerUnit: 35000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Демонтаж' },
  { id: 'eq18', name: 'Доставка гидромолота на объект и обратно', category: Category.MACHINERY, unit: 'компл.', costPerUnit: 40000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Демонтаж' },

  // ═══════════════════════════════════════════════════════════
  // ТЕХНИКА — Земляные работы
  // ═══════════════════════════════════════════════════════════
  { id: 'eq3', name: 'Экскаватор-погрузчик JCB 3CX, ёмкость ковша 1.0 м³, глубина копания до 4.7 м (приезжает своим ходом, без доставки)', category: Category.MACHINERY, unit: 'м/см', costPerUnit: 28000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Земляные работы' },
  { id: 'eq10', name: 'Экскаватор гусеничный 20 т, ёмкость ковша 1.2 м³', category: Category.MACHINERY, unit: 'м/см', costPerUnit: 27000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Земляные работы' },
  { id: 'eq4', name: 'Самосвал, вывоз грунта / строит. мусора, кузов 20 м³, плечо до 30 км', category: Category.MACHINERY, unit: 'рейс', costPerUnit: 14000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Земляные работы' },
  { id: 'eq9', name: 'Каток грунтовый вибрационный тяжёлый 10+ т, уплотнение основания — песок, щебень', category: Category.MACHINERY, unit: 'м/см', costPerUnit: 25000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Земляные работы' },
  { id: 'eq6', name: 'Автогрейдер, планировка основания на площади > 1000 м²', category: Category.MACHINERY, unit: 'м/см', costPerUnit: 35000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Земляные работы' },
  { id: 'eq7', name: 'Погрузчик фронтальный, перемещение сыпучих материалов', category: Category.MACHINERY, unit: 'м/см', costPerUnit: 22000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Земляные работы' },
  { id: 'eq16', name: 'Доставка катка грунтового на объект и обратно (тралом)', category: Category.MACHINERY, unit: 'компл.', costPerUnit: 60000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Земляные работы' },
  { id: 'eq17', name: 'Доставка экскаватора гусеничного на объект и обратно (тралом)', category: Category.MACHINERY, unit: 'компл.', costPerUnit: 50000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Земляные работы' },
  { id: 'eq19', name: 'Доставка автогрейдера на объект и обратно (тралом)', category: Category.MACHINERY, unit: 'компл.', costPerUnit: 55000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Земляные работы' },

  // ═══════════════════════════════════════════════════════════
  // ТЕХНИКА — Благоустройство
  // ═══════════════════════════════════════════════════════════
  { id: 'eq5', name: 'Виброплита реверсивная, усилие 55 кН, глубина уплотнения до 60 см', category: Category.MACHINERY, unit: 'м/см', costPerUnit: 3000, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Благоустройство' },

  // ═══════════════════════════════════════════════════════════
  // ПЕРСОНАЛ — Руководство и специалисты
  // ═══════════════════════════════════════════════════════════
  { id: 'l1', name: 'Производитель работ (прораб), 6 разряд, руководство бригадой, контроль качества', category: Category.LABOR, unit: 'чел/см', costPerUnit: 5000, subGroup: 'Руководство и специалисты' },
  { id: 'l6', name: 'Геодезист, разбивка осей, нивелирование, контроль отметок, исполнит. съёмка', category: Category.LABOR, unit: 'выезд', costPerUnit: 15000, subGroup: 'Руководство и специалисты' },

  // ═══════════════════════════════════════════════════════════
  // ПЕРСОНАЛ — Дорожные работы
  // ═══════════════════════════════════════════════════════════
  { id: 'l2', name: 'Дорожный рабочий, 4 разряд, выполнение основных строительно-дорожных работ', category: Category.LABOR, unit: 'чел/см', costPerUnit: 2500, subGroup: 'Дорожные работы' },
  { id: 'l5', name: 'Швабрист (асфальтобетонщик), 5 разряд, ручное разравнивание а/б смеси', category: Category.LABOR, unit: 'чел/см', costPerUnit: 15000, serviceCategory: ServiceCategory.ASPHALT, subGroup: 'Дорожные работы' },

  // ═══════════════════════════════════════════════════════════
  // ПЕРСОНАЛ — Благоустройство
  // ═══════════════════════════════════════════════════════════
  { id: 'l7', name: 'Укладка бордюра дорожного БР 100.30.18 на бетонное основание, работа', category: Category.LABOR, unit: 'п.м', costPerUnit: 500, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Благоустройство' },
  { id: 'l8', name: 'Укладка бордюра садового БР 100.20.8 на бетонное основание, работа', category: Category.LABOR, unit: 'п.м', costPerUnit: 300, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Благоустройство' },
  { id: 'l3', name: 'Рабочий зелёного строительства, 4 разряд, озеленение, посадка, устройство газонов', category: Category.LABOR, unit: 'чел/см', costPerUnit: 2800, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Благоустройство' },
  { id: 'l4', name: 'Мостовщик-плиточник, 5 разряд, мощение тротуарной плиткой, установка бортового камня', category: Category.LABOR, unit: 'чел/см', costPerUnit: 3500, serviceCategory: ServiceCategory.LANDSCAPING, subGroup: 'Благоустройство' },

  // ═══════════════════════════════════════════════════════════
  // ПЕРСОНАЛ — Ливневая канализация
  // ═══════════════════════════════════════════════════════════
  { id: 'l9', name: 'Монтаж нового смотрового колодца (выемка, установка, обратная засыпка, уплотнение)', category: Category.LABOR, unit: 'шт', costPerUnit: 15000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },
  { id: 'l10', name: 'Регулировка высоты существующего колодца (наращивание/подрезка горловины, замена люка)', category: Category.LABOR, unit: 'шт', costPerUnit: 8000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },
  { id: 'l11', name: 'Демонтаж (вывод) старого колодца (разборка, засыпка котлована, уплотнение)', category: Category.LABOR, unit: 'шт', costPerUnit: 12000, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },
  { id: 'l12', name: 'Монтаж трубопровода ливневой канализации ∅110–160 мм (траншея, укладка, обсыпка)', category: Category.LABOR, unit: 'п.м', costPerUnit: 900, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },
  { id: 'l13', name: 'Установка дождеприёмника с подключением к трубопроводу', category: Category.LABOR, unit: 'шт', costPerUnit: 3500, serviceCategory: ServiceCategory.EARTHWORK, subGroup: 'Ливневая канализация' },
];

const DEFAULT_MILESTONES: Milestone[] = [
  { id: 'ms1', title: 'Подготовительные работы', description: 'Разбивка осей, снятие растительного слоя, устройство корыта, вывоз грунта', status: 'completed', date: Date.now() - 86400000 * 2, serviceCategory: ServiceCategory.EARTHWORK, sortOrder: 0 },
  { id: 'ms2', title: 'Устройство основания', description: 'Укладка геотекстиля, устройство песчаного и щебёночного слоёв, послойное уплотнение Ку≥0.98', status: 'current', serviceCategory: ServiceCategory.EARTHWORK, sortOrder: 1 },
  { id: 'ms3', title: 'Устройство покрытия', description: 'Подгрунтовка основания, укладка а/б смеси тип Б марка II, толщ. 50 мм, уплотнение катком', status: 'pending', serviceCategory: ServiceCategory.ASPHALT, sortOrder: 2 },
  { id: 'ms4', title: 'Благоустройство территории', description: 'Установка бортового камня, мощение плиткой, устройство газона, посадка деревьев, уборка', status: 'pending', serviceCategory: ServiceCategory.LANDSCAPING, sortOrder: 3 },
];

export const MOCK_PROJECT: Project = {
  id: 'demo-1',
  name: 'Парковка ТЦ "Лето"',
  manager: 'Алексей Смирнов',
  client: 'ООО "Вектор"',
  clientPhone: '+7 (999) 123-45-67',
  clientEmail: 'vektor@mail.ru',
  address: 'г. Москва, ул. Ленина 45',
  areaSize: 500,
  contractPrice: 1200000,
  items: [
    { resourceId: 'm1', category: Category.MATERIAL, quantity: 120, totalCost: 588000 },
    { resourceId: 'm2', category: Category.MATERIAL, quantity: 120, totalCost: 66000 },
    { resourceId: 'eq1', category: Category.MACHINERY, quantity: 2, totalCost: 280000 },
    { resourceId: 'eq2', category: Category.MACHINERY, quantity: 2, totalCost: 50000 },
    { resourceId: 'l2', category: Category.LABOR, quantity: 4, totalCost: 24000 },
    { resourceId: 'l5', category: Category.LABOR, quantity: 2, totalCost: 30000 },
  ],
  status: 'active',
  progress: 45,
  createdAt: Date.now() - 86400000 * 5,
  serviceCategories: [ServiceCategory.ASPHALT, ServiceCategory.EARTHWORK, ServiceCategory.LANDSCAPING],
  workTypes: [AsphaltWorkType.PAVING, AsphaltWorkType.BASE_LAYER, AsphaltWorkType.CURB_INSTALL],
  startDate: Date.now() - 86400000 * 5,
  endDate: Date.now() + 86400000 * 14,
  milestones: DEFAULT_MILESTONES,
  chat: [
    { id: 'c1', sender: 'Менеджер', role: 'manager', text: 'Завтра приедет лаборатория проверять уплотнение щебня.', timestamp: Date.now() - 3600000 },
  ],
  expenses: [
    { id: 'e1', description: 'Заправка техники', amount: 4200, category: 'fuel', date: Date.now(), status: 'pending' },
  ],
  photos: [
    { id: 'p1', url: 'https://images.unsplash.com/photo-1596627685746-8cf59600a94e?auto=format&fit=crop&q=80&w=600', description: 'Основание готово к приемке', uploadedBy: 'foreman', timestamp: Date.now() - 86400000, stage: 'Подготовка', beforeAfter: 'after', milestoneId: 'ms1' },
  ],
  documents: [
    { id: 'd1', name: 'Договор подряда.pdf', type: 'contract', date: Date.now() - 400000000, signStatus: 'signed' },
    { id: 'd2', name: 'Смета утверждённая.pdf', type: 'estimate', date: Date.now() - 350000000, signStatus: 'signed' },
  ],
  checklists: [],
  dailyReports: [],
  paymentSchedule: [
    { id: 'ps1', stage: 'Предоплата 30%', amount: 360000, percentage: 30, status: 'paid', paidAt: Date.now() - 86400000 * 4, paidAmount: 360000 },
    { id: 'ps2', stage: 'После асфальтирования 50%', amount: 600000, percentage: 50, status: 'upcoming' },
    { id: 'ps3', stage: 'Финальный расчёт 20%', amount: 240000, percentage: 20, status: 'upcoming' },
  ],
  materialDeliveries: [],
  clientEstimateItems: [],
  contractAmendments: [],
};

// Шаблоны чек-листов по видам работ
export const CHECKLIST_TEMPLATES: Record<string, string[]> = {
  'Подготовительные работы': [
    'Проверить геодезическую разбивку осей и отметок',
    'Организовать временное ограждение объекта по СП 48.13330',
    'Проверить наличие паспортов/сертификатов на материалы',
    'Проверить исправность и допуск техники (путевые листы)',
    'Провести инструктаж по ОТ и ТБ с подписью в журнале',
    'Согласовать схему движения транспорта на объекте',
  ],
  'Устройство основания': [
    'Контроль толщины и отметок песчаного слоя (нивелир)',
    'Замер Ку песчаного слоя ≥ 0.95 (динамический плотномер)',
    'Контроль фракции и марки щебня (паспорт карьера)',
    'Замер Ку щебёночного слоя ≥ 0.98 (статическое нагружение)',
    'Проверить поперечные уклоны основания ≥ 15‰',
    'Фотофиксация основания перед укладкой покрытия',
  ],
  'Устройство покрытия': [
    'Проверить температуру а/б смеси при выгрузке ≥ 110°C',
    'Контроль толщины уложенного слоя (вырубка/керн)',
    'Замер коэффициента уплотнения покрытия Ку≥0.99',
    'Контроль ровности покрытия (3-м рейка, просвет ≤ 5 мм)',
    'Проверить поперечные и продольные уклоны покрытия',
    'Фотофиксация до/после укладки',
    'Замер площади уложенного покрытия (исполнительная схема)',
  ],
  'Благоустройство территории': [
    'Установка бортового камня по нивелиру с контролем отметок',
    'Контроль толщины подстилающего слоя под плитку',
    'Проверить соответствие рисунка мощения проекту',
    'Подготовка грунта под озеленение (h плодородного слоя ≥ 150 мм)',
    'Контроль приживаемости посадок (полив, подвязка)',
    'Уборка территории от строительного мусора',
    'Составить исполнительную документацию (акты скрытых работ)',
  ],
};

// ═══════════════════════════════════════════════════════════
// Справочник типовых работ для КП клиента
// ═══════════════════════════════════════════════════════════
export interface ClientWorkCatalogItem {
  name: string;
  unit: string;
  section: string;
  recommendedPrice?: number;
}

export const CLIENT_WORK_CATALOG: ClientWorkCatalogItem[] = [
  // ═══ Асфальтирование ═══
  { name: 'Устройство покрытия из а/б смеси мелкозернистой тип Б марка II, ГОСТ 9128-2013, толщ. 50 мм, Ку≥0.99', unit: 'м²', section: 'Асфальтирование', recommendedPrice: 1100 },
  { name: 'Устройство покрытия из а/б смеси мелкозернистой тип Б марка II, ГОСТ 9128-2013, толщ. 40 мм, Ку≥0.99', unit: 'м²', section: 'Асфальтирование', recommendedPrice: 950 },
  { name: 'Устройство покрытия из а/б смеси крупнозернистой тип А марка I, ГОСТ 9128-2013, толщ. 60 мм, Ку≥0.99', unit: 'м²', section: 'Асфальтирование', recommendedPrice: 1300 },
  { name: 'Устройство двухслойного а/б покрытия (нижний слой — крупнозерн. 40 мм + верхний — мелкозерн. 40 мм), ГОСТ 9128-2013', unit: 'м²', section: 'Асфальтирование', recommendedPrice: 1800 },
  { name: 'Устройство покрытия из ЩМА-15, ГОСТ 31015-2002, толщ. 50 мм, модуль упругости ≥3200 МПа', unit: 'м²', section: 'Асфальтирование', recommendedPrice: 1500 },
  { name: 'Фрезерование асфальтобетонного покрытия, глубина до 50 мм, с вывозом фрезерованного материала', unit: 'м²', section: 'Асфальтирование', recommendedPrice: 250 },
  { name: 'Фрезерование асфальтобетонного покрытия, глубина до 100 мм, с вывозом фрезерованного материала', unit: 'м²', section: 'Асфальтирование', recommendedPrice: 400 },
  { name: 'Ямочный ремонт а/б покрытия литой а/б смесью, ГОСТ 9128-2013, с нарезкой карт, очисткой и подгрунтовкой', unit: 'м²', section: 'Асфальтирование', recommendedPrice: 2500 },
  { name: 'Устройство подгрунтовки основания битумной эмульсией катионной ЭБК-1, ГОСТ Р 52128-2003, расход 0.3–0.5 л/м²', unit: 'м²', section: 'Асфальтирование', recommendedPrice: 70 },
  { name: 'Нанесение горизонтальной дорожной разметки термопластиком, ГОСТ 51256-2018, толщ. 2–4 мм', unit: 'п.м', section: 'Асфальтирование', recommendedPrice: 350 },
  { name: 'Нанесение горизонтальной дорожной разметки краской, ГОСТ 51256-2018', unit: 'п.м', section: 'Асфальтирование', recommendedPrice: 150 },
  { name: 'Устройство деформационного шва герметиком горячего применения, СП 78.13330.2012', unit: 'п.м', section: 'Асфальтирование' },

  // ═══ Устройство основания ═══
  { name: 'Устройство подстилающего слоя из песка средней крупности Мкр≥2.0, ГОСТ 8736-2014, толщ. 150 мм, Ку≥0.95', unit: 'м²', section: 'Устройство основания', recommendedPrice: 250 },
  { name: 'Устройство подстилающего слоя из песка средней крупности Мкр≥2.0, ГОСТ 8736-2014, толщ. 200 мм, Ку≥0.95', unit: 'м²', section: 'Устройство основания', recommendedPrice: 330 },
  { name: 'Устройство подстилающего слоя из песка средней крупности Мкр≥2.0, ГОСТ 8736-2014, толщ. 300 мм, Ку≥0.95', unit: 'м²', section: 'Устройство основания', recommendedPrice: 480 },
  { name: 'Устройство основания из щебня гранитного фр. 20–40 мм М1200, ГОСТ 8267-93, толщ. 150 мм, Ку≥0.98, Еd≥130 МПа', unit: 'м²', section: 'Устройство основания', recommendedPrice: 500 },
  { name: 'Устройство основания из щебня гранитного фр. 20–40 мм М1200, ГОСТ 8267-93, толщ. 200 мм, Ку≥0.98, Еd≥130 МПа', unit: 'м²', section: 'Устройство основания', recommendedPrice: 650 },
  { name: 'Устройство основания из щебня гравийного фр. 20–40 мм М800, ГОСТ 8267-93, толщ. 200 мм, Ку≥0.98', unit: 'м²', section: 'Устройство основания', recommendedPrice: 500 },
  { name: 'Устройство основания из щебня вторичного (дроблёный бетон) фр. 20–40 мм, ТУ, толщ. 200 мм, Ку≥0.95', unit: 'м²', section: 'Устройство основания', recommendedPrice: 350 },
  { name: 'Устройство основания из щебня известнякового фр. 20–40 мм М600, ГОСТ 8267-93, толщ. 150 мм, Ку≥0.98', unit: 'м²', section: 'Устройство основания', recommendedPrice: 450 },
  { name: 'Устройство основания из щебня известнякового фр. 20–40 мм М600, ГОСТ 8267-93, толщ. 200 мм, Ку≥0.98', unit: 'м²', section: 'Устройство основания', recommendedPrice: 580 },
  { name: 'Устройство основания из ПГС (песчано-гравийная смесь), ГОСТ 23735-2014, толщ. 200 мм, Ку≥0.95', unit: 'м²', section: 'Устройство основания', recommendedPrice: 400 },
  // Сыпучие материалы — справочные цены за м³
  { name: 'Песок средней крупности Мкр≥2.0, ГОСТ 8736-2014 (материал + доставка + укладка)', unit: 'м³', section: 'Устройство основания', recommendedPrice: 1300 },
  { name: 'Щебень гранитный фр. 20–40 мм М1200, ГОСТ 8267-93 (материал + доставка + укладка)', unit: 'м³', section: 'Устройство основания', recommendedPrice: 4200 },
  { name: 'Щебень известняковый фр. 20–40 мм М600, ГОСТ 8267-93 (материал + доставка + укладка)', unit: 'м³', section: 'Устройство основания', recommendedPrice: 3300 },
  { name: 'Щебень гравийный фр. 20–40 мм М800, ГОСТ 8267-93 (материал + доставка + укладка)', unit: 'м³', section: 'Устройство основания', recommendedPrice: 3500 },
  { name: 'Щебень вторичный (дроблёный бетон) фр. 20–40 мм, ТУ (материал + доставка + укладка)', unit: 'м³', section: 'Устройство основания', recommendedPrice: 2000 },
  { name: 'Укладка геотекстиля иглопробивного плотн. 200 г/м², ГОСТ Р 56338-2015, разделительный слой', unit: 'м²', section: 'Устройство основания', recommendedPrice: 80 },
  { name: 'Укладка геотекстиля иглопробивного плотн. 300 г/м², ГОСТ Р 56338-2015, армирующий слой', unit: 'м²', section: 'Устройство основания', recommendedPrice: 120 },
  { name: 'Укладка георешётки полимерной, высота ячейки 100 мм, армирование слабого основания', unit: 'м²', section: 'Устройство основания', recommendedPrice: 350 },
  { name: 'Устройство основания методом ресайклинга старого покрытия с добавлением цемента М400', unit: 'м²', section: 'Устройство основания', recommendedPrice: 600 },

  // ═══ Земляные работы ═══
  { name: 'Планировка территории механизированная, автогрейдером, допуск отметок ±20 мм', unit: 'м²', section: 'Земляные работы', recommendedPrice: 80 },
  { name: 'Разработка грунта II категории экскаватором с погрузкой в самосвал и вывозом на полигон, плечо до 30 км', unit: 'м³', section: 'Земляные работы', recommendedPrice: 800 },
  { name: 'Разработка грунта III категории экскаватором с погрузкой в самосвал и вывозом на полигон, плечо до 30 км', unit: 'м³', section: 'Земляные работы', recommendedPrice: 1000 },
  { name: 'Обратная засыпка привозным грунтом (песок) с послойным уплотнением, слой ≤300 мм, Ку≥0.95', unit: 'м³', section: 'Земляные работы', recommendedPrice: 900 },
  { name: 'Устройство земляного корыта под дорожную одежду, глубина 300–500 мм, с вывозом грунта', unit: 'м²', section: 'Земляные работы', recommendedPrice: 350 },
  { name: 'Снятие растительного слоя толщ. 200 мм с перемещением в отвал', unit: 'м²', section: 'Земляные работы', recommendedPrice: 120 },
  { name: 'Корчёвка пней ∅ до 40 см с вывозом порубочных остатков', unit: 'шт', section: 'Земляные работы', recommendedPrice: 3500 },
  { name: 'Демонтаж существующего асфальтобетонного покрытия толщ. до 100 мм с погрузкой и вывозом', unit: 'м²', section: 'Земляные работы', recommendedPrice: 250 },
  { name: 'Демонтаж бетонного покрытия/отмостки толщ. до 150 мм с погрузкой и вывозом', unit: 'м²', section: 'Земляные работы', recommendedPrice: 400 },
  { name: 'Вертикальная планировка территории с формированием уклонов ≥5‰, СП 82.13330.2016', unit: 'м²', section: 'Земляные работы', recommendedPrice: 150 },

  // ═══ Благоустройство — бордюры ═══
  { name: 'Установка бортового камня дорожного БР 100.30.18, ГОСТ 6665-91, на бетонное основание М200, с обоймой', unit: 'п.м', section: 'Благоустройство', recommendedPrice: 1200 },
  { name: 'Установка бортового камня садового БР 100.20.8, ГОСТ 6665-91, на бетонное основание М200', unit: 'п.м', section: 'Благоустройство', recommendedPrice: 800 },
  { name: 'Установка бортового камня магистрального БР 100.45.18, ГОСТ 6665-91, на бетонное основание М200', unit: 'п.м', section: 'Благоустройство', recommendedPrice: 1800 },
  { name: 'Демонтаж бортового камня с погрузкой и вывозом', unit: 'п.м', section: 'Благоустройство', recommendedPrice: 300 },

  // ═══ Благоустройство — плитка ═══
  { name: 'Мощение тротуарной плиткой вибропрессованной кл. В22.5 F200, ГОСТ 17608-2017, толщ. 60 мм, на ЦПС', unit: 'м²', section: 'Благоустройство', recommendedPrice: 1800 },
  { name: 'Мощение тротуарной плиткой вибропрессованной кл. В30 F300, ГОСТ 17608-2017, толщ. 80 мм, на ЦПС', unit: 'м²', section: 'Благоустройство', recommendedPrice: 2200 },
  { name: 'Устройство монтажного слоя из ЦПС М150, толщ. 30–50 мм, под тротуарную плитку', unit: 'м²', section: 'Благоустройство', recommendedPrice: 250 },
  { name: 'Демонтаж тротуарной плитки с сортировкой и складированием', unit: 'м²', section: 'Благоустройство', recommendedPrice: 200 },

  // ═══ Озеленение ═══
  { name: 'Устройство газона посевного из смеси мятлика лугового и овсяницы красной, расход семян 40 г/м²', unit: 'м²', section: 'Озеленение', recommendedPrice: 450 },
  { name: 'Устройство газона рулонного из мятлика лугового, 1 сорт, толщ. дёрна ≥ 20 мм, с прикаткой', unit: 'м²', section: 'Озеленение', recommendedPrice: 700 },
  { name: 'Подготовка грунтового основания под газон: планировка, внесение плодородного грунта толщ. ≥150 мм', unit: 'м²', section: 'Озеленение', recommendedPrice: 300 },
  { name: 'Посадка деревьев лиственных крупномерных h=2.0–2.5 м с комом ∅0.5 м, с подвязкой и поливом', unit: 'шт', section: 'Озеленение', recommendedPrice: 12000 },
  { name: 'Посадка деревьев хвойных h=1.5–2.0 м с комом ∅0.4 м, с подвязкой и поливом', unit: 'шт', section: 'Озеленение', recommendedPrice: 15000 },
  { name: 'Посадка кустарников декоративных h=0.4–0.8 м, с подготовкой посадочной ямы и поливом', unit: 'шт', section: 'Озеленение', recommendedPrice: 2500 },
  { name: 'Устройство цветника из многолетних растений, с подготовкой грунта и мульчированием', unit: 'м²', section: 'Озеленение', recommendedPrice: 3500 },

  // ═══ Инженерные сети (ливневая канализация) ═══
  { name: 'Устройство ливневой канализации из труб ПВХ ∅110 мм SN4, ГОСТ 32413-2013, с земляными работами', unit: 'п.м', section: 'Инженерные сети', recommendedPrice: 2500 },
  { name: 'Устройство ливневой канализации из труб ПВХ ∅160 мм SN4, ГОСТ 32413-2013, с земляными работами', unit: 'п.м', section: 'Инженерные сети', recommendedPrice: 3500 },
  { name: 'Установка дождеприёмника ДБ 300×300 мм с решёткой чугунной кл. В125, с подключением к коллектору', unit: 'шт', section: 'Инженерные сети', recommendedPrice: 8000 },
  { name: 'Монтаж лотка водоотводного бетонного DN100 с решёткой стальной оцинкованной кл. А15, на бетонное основание', unit: 'п.м', section: 'Инженерные сети', recommendedPrice: 4500 },
  { name: 'Монтаж лотка водоотводного полимербетонного DN150 с чугунной решёткой кл. С250', unit: 'п.м', section: 'Инженерные сети', recommendedPrice: 7000 },
  { name: 'Установка пескоуловителя пластикового 500×160 мм, с корзиной для мусора', unit: 'шт', section: 'Инженерные сети', recommendedPrice: 5000 },
  { name: 'Устройство дренажной системы из перфорированной трубы ∅110 мм в фильтре из геотекстиля и щебня', unit: 'п.м', section: 'Инженерные сети', recommendedPrice: 3000 },
  { name: 'Устройство смотрового колодца ∅400 мм полимерного, с крышкой, глубина до 1.5 м', unit: 'шт', section: 'Инженерные сети', recommendedPrice: 25000 },
  { name: 'Регулировка высоты существующего колодца (наращивание/подрезка горловины, замена люка)', unit: 'шт', section: 'Инженерные сети', recommendedPrice: 15000 },
  { name: 'Демонтаж (вывод) существующего колодца с засыпкой котлована и уплотнением', unit: 'шт', section: 'Инженерные сети', recommendedPrice: 20000 },

  // ═══ Прочие работы ═══
  { name: 'Мобилизация / демобилизация строительной техники на объект, включая доставку трейлером', unit: 'компл.', section: 'Прочие работы', recommendedPrice: 50000 },
  { name: 'Геодезические работы: разбивка осей, нивелирование, контроль отметок, исполнительная съёмка', unit: 'компл.', section: 'Прочие работы', recommendedPrice: 35000 },
  { name: 'Уборка территории от строительного мусора с вывозом на полигон', unit: 'м²', section: 'Прочие работы', recommendedPrice: 50 },
  { name: 'Устройство временного ограждения объекта из сетки-рабицы на металлических стойках', unit: 'п.м', section: 'Прочие работы', recommendedPrice: 600 },
  { name: 'Устройство временного ограждения объекта из профлиста Н=2.0 м', unit: 'п.м', section: 'Прочие работы', recommendedPrice: 1200 },
  { name: 'Составление исполнительной документации (акты скрытых работ, исполнительные схемы)', unit: 'компл.', section: 'Прочие работы', recommendedPrice: 25000 },
  { name: 'Лабораторный контроль качества: отбор кернов, определение Ку, модуля упругости, ГОСТ 12801-98', unit: 'компл.', section: 'Прочие работы', recommendedPrice: 20000 },
];

// Порядок подгрупп в справочнике
export const SUBGROUP_ORDER: Record<Category, string[]> = {
  [Category.MATERIAL]: ['Асфальтобетон', 'Щебень', 'Песок и геоматериалы', 'Бордюры', 'Плитка и мощение', 'Озеленение', 'Ливневая канализация'],
  [Category.MACHINERY]: ['Асфальтирование', 'Демонтаж', 'Земляные работы', 'Благоустройство'],
  [Category.LABOR]: ['Руководство и специалисты', 'Дорожные работы', 'Благоустройство', 'Ливневая канализация'],
};

// ═══════════════════════════════════════════════════════════
// База знаний ИИ — дефолтные секции system prompt
// ═══════════════════════════════════════════════════════════
export const DEFAULT_AI_KNOWLEDGE: AIKnowledgeSection[] = [
  // ─── 1. РОЛЬ ───
  {
    id: 'role',
    title: 'Роль ИИ',
    category: 'system',
    order: 1,
    content: `Ты — эксперт-сметчик по дорожному строительству и благоустройству в России. Твоя задача — на основе входных параметров от пользователя сформировать полную разбивку расходов (себестоимость) на объект: материалы, техника, персонал, логистика, накладные расходы.

Ты формируешь СЕБЕСТОИМОСТЬ для подрядчика, а не коммерческое предложение.`,
  },

  // ─── 2. НОРМЫ РАСХОДА МАТЕРИАЛОВ ───
  {
    id: 'material_norms',
    title: 'Нормы расхода материалов',
    category: 'norms',
    order: 2,
    content: `НОРМЫ РАСХОДА (используй для расчёта количеств):

А/Б СМЕСЬ (каждый слой отдельно):
  Плотность уплотнённого а/б = 2.5 т/м³ (≈125 кг/м² на каждые 50 мм толщины)
  asphalt_tons = площадь × толщина(м) × 2.5 т/м³
  Пример: 1000 м² × 0.05 м × 2.5 = 125 т (слой 50 мм)
  Если 2 слоя: нижний слой (крупнозерн.) + верхний (мелкозерн.), каждый отдельно
  Если 1 слой: только мелкозернистая
  Доставка а/б: = тоннам смеси (1 т доставки = 1 т смеси)

ПОДГРУНТОВКА битумной эмульсией:
  primer_liters = площадь × 0.5 л/м²
  primer_tons = primer_liters / 1000
  При 2 слоях: подгрунтовка МЕЖДУ слоями тоже → ×2

ОСНОВАНИЕ (коэффициенты по СНиП 3.06.03-85, СП 78.13330):
  Песок: площадь × толщина(м) × 1.20 (коэфф. уплотнения 20%) м³
  Щебень: площадь × толщина(м) × 1.30 (коэфф. уплотнения по ГОСТ, щебень фр.20-40) м³
  Если щебень > 200 мм: нижний слой фр.40-70 (150мм) + верхний фр.20-40 (остаток)
  Геотекстиль: площадь × 1.15 (нахлёст 15%) м²
  Вода для проливки щебня: площадь × 0.05 м³ (~50 л/м²)

БОРДЮРЫ:
  Количество штук: длина(п.м) / 1.0 м
  Бетон для установки: длина × 0.05 м³/п.м
  ЦПС для посадки: длина × 0.02 м³/п.м
  Доставка: 1 рейс = ~100 шт дорожных или ~200 садовых

ПЛИТКА:
  Плитка с запасом: площадь × 1.05 (5% на подрезку) м²
  ЦПС под плитку: площадь × 0.05 × 1.5 м³ (слой 50 мм)
  Щебень основания под плитку: площадь × 0.10 × 1.3 м³
  Геотекстиль: площадь × 1.15 м²

ДЕМОНТАЖ:
  Объём: площадь × толщина × 1.30 (разрыхление асфальта/бетона)
  Рейсы вывоза: ceil(объём / 20) (самосвал 20 м³; для мусора ≤15 м³ полезного — ceil/15)
  Фрезерование: объём = площадь × глубина × 1.15 (асфальтовая крошка менее рыхлая)

ОЗЕЛЕНЕНИЕ:
  Растительный грунт: площадь × 0.15 × 1.2 м³ (слой 15-20 см)
  Семена газона: площадь × 0.05 кг (50 г/м²)

КОЛОДЦЫ (ливневая канализация):
  Новый колодец: 1 шт колодца (m27) + 1 люк (m29) + земляные работы (экскаватор ~0.5 смены на колодец)
  Регулировка высоты: 1 кольцо удлинительное (m28) на колодец + 1 люк (m29) если требуется замена
  Демонтаж колодца: земляные работы (экскаватор ~0.3 смены) + вывоз мусора (1 рейс на 2-3 колодца) + засыпка грунтом/щебнем

РАЗМЕТКА:
  Краска: длина × ширина_линии × 0.4 кг/м²`,
  },

  // ─── 3. ТЕХНИКА — СМЕНЫ ───
  {
    id: 'equipment_shifts',
    title: 'Техника — расчёт смен',
    category: 'norms',
    order: 3,
    content: `РАСЧЁТ КОЛИЧЕСТВА СМЕН ТЕХНИКИ (1 смена = 8 часов):

ВАЖНО: В проекте 2 РАЗНЫХ катка — не путать!
  eq2 = Каток вибрационный 4 т (АСФАЛЬТОВЫЙ) — только на укладку асфальта
  eq9 = Каток грунтовый тяжёлый 10+ т (ГРУНТОВЫЙ) — только на уплотнение основания (песок, щебень)

═══ ТЕХНИКА ДЛЯ ОСНОВАНИЯ (земляные работы) ═══

ЭКСКАВАТОР (eq3 или eq10):
  Производительность: 200-300 м³/смена (погрузчик) или 300-500 м³/смена (гусеничный)
  Формула: ceil(объём_выемки / 250)
  + если ливнёвка: ceil(длина_труб / 40) доп. смен на траншеи
  area ≤ 1500: eq3 (погрузчик JCB) достаточно
  area > 1500 или глубина > 1.5м: eq10 (гусеничный)

КАТОК ГРУНТОВЫЙ eq9 (10+ т) — УПЛОТНЕНИЕ ПЕСКА И ЩЕБНЯ:
  area ≥ 500: ОБЯЗАТЕЛЬНО для качественного уплотнения основания
  Смены = дни_основания (на ВСЕ дни укладки песка и щебня!)
  Песок: послойное уплотнение катком с проливкой водой
  Щебень: уплотнение катком + расклинка мелкой фракцией
  Формула: ceil(объём_песка / 180) + ceil(объём_щебня / 150)
  Пример: 1750 м², песок 200мм + щебень 150мм → ~5 смен катка грунтового
  area < 500: виброплита (eq5) вместо грунтового катка

ВИБРОПЛИТА eq5:
  area < 500: ВМЕСТО грунтового катка
  Формула: ceil(площадь / 400) на каждый слой (песок + щебень)

САМОСВАЛ eq4 (грузоподъёмность кузова 20 м³):
  Вывоз грунта: ceil(объём_с_разрыхлением / 20) рейсов
  Коэфф. разрыхления грунта (СНиП 3.02.01-87):
    I категория (песок, супесь): Кр = 1.10-1.15
    II категория (суглинок, глина): Кр = 1.20-1.27
    III категория (тяжёлая глина, мёрзлый): Кр = 1.25-1.35
  Типовой расчёт: объём_в_ковше = площадь × глубина(м) × Кр (обычно 1.25 для суглинка)
  Пример: 1500 м² × 0.3 м × 1.25 = 562 м³ → ceil(562 / 20) = 29 рейсов

═══ ТЕХНИКА ДЛЯ АСФАЛЬТИРОВАНИЯ ═══

АСФАЛЬТОУКЛАДЧИК eq1 (ТОЛЬКО method=machine!):
  Производительность: до 3000 м²/день (рабочий день с переработкой)
  Формула: ceil(площадь / 3000) × кол-во_слоёв
  1 слой = 1 смена (до 3000 м²), 2 слоя = 2 смены
  НЕ включать при method="manual"!

КАТОК АСФАЛЬТОВЫЙ eq2 (4 т, тандемный) — УПЛОТНЕНИЕ АСФАЛЬТА:
  ВСЕГДА при укладке асфальта (любой метод!)
  Работает параллельно с укладчиком/бригадой
  Формула: = дни_асфальта (= ceil(площадь / 3000) × слои при укладчике, или ceil(площадь / 150) × слои вручную)
  При method=manual: ceil(площадь / 800) × кол-во_слоёв

ДОСТАВКА А/Б САМОСВАЛОМ eq8 (грузоподъёмность 30 т):
  Рейсы: ceil(тонны_а/б / 30)
  Пример: 625 т → ceil(625 / 30) = 21 рейс

═══ ПРОЧАЯ ТЕХНИКА ═══

ФРЕЗА eq11 (при демонтаже фрезой):
  Оплата: площадь × 75 ₽/м²
  + доставка фрезы eq12 = 50 000 ₽

АВТОГУДРОНАТОР (area > 1000):
  Механическая подгрунтовка
  Формула: ceil(площадь / 4000)

ГИДРОМОЛОТ eq13 (при демонтаже молотом):
  Для малых объёмов (< 1000 м²)

═══ СВОДНАЯ ТАБЛИЦА ПРИВЯЗКИ ═══
  Основание (песок/щебень) → eq9 грунтовый каток ИЛИ eq5 виброплита
  Асфальт              → eq2 асфальтовый каток + eq1 укладчик (если machine)
  Выемка грунта        → eq3 или eq10 экскаватор + eq4 самосвал
  Ливнёвка             → eq3 экскаватор (доп. смены)
  Демонтаж             → eq11 фреза ИЛИ eq13 гидромолот`,
  },

  // ─── 4. ПЕРСОНАЛ ───
  {
    id: 'personnel',
    title: 'Персонал — расчёт',
    category: 'norms',
    order: 4,
    content: `РАСЧЁТ ПЕРСОНАЛА И ПРОДОЛЖИТЕЛЬНОСТИ РАБОТ:

═══ РАСЧЁТ ДНЕЙ ПО ЭТАПАМ (1 смена = 8 часов) ═══

ЭТАП 1 — ВЫЕМКА ГРУНТА (корыто):
  Производительность экскаватора: 200-300 м³/смена
  Объём = площадь × глубина_корыта(м) × 1.2 (рыхление)
  дни_выемки = ceil(объём / 250)
  Пример: 1750 м², корыто 0.35м → 1750×0.35×1.2=735 м³ → 3 дня

ЭТАП 2 — ОСНОВАНИЕ (геотекстиль + песок + щебень + уплотнение):
  Песок: производительность укладки ~150-200 м³/смена (с планировкой и уплотнением)
  Щебень: производительность ~120-180 м³/смена (с расклинкой и уплотнением)
  дни_основания = ceil(объём_песка / 180) + ceil(объём_щебня / 150)
  Геотекстиль укладывается за 0.5-1 день (входит в дни основания)
  Пример: 1750 м², песок 200мм=525 м³, щебень 150мм=341 м³ → 3+3=6 дней (можно совмещать → 4-5 дней)

ЭТАП 3 — ЛИВНЕВАЯ КАНАЛИЗАЦИЯ (параллельно или до основания):
  Траншеи: 30-50 п.м/смена (с укладкой труб)
  Колодцы: 1-2 шт/смена
  дни_ливнёвки = ceil(длина_труб / 40) + ceil(кол-во_колодцев / 1.5)
  Пример: 50 п.м труб + 2 колодца → 2+2=4 дня (можно частично совмещать с выемкой)

ЭТАП 4 — УКЛАДКА АСФАЛЬТА:
  Укладчиком: до 3000 м²/день (рабочий день с переработкой, непрерывная подача смеси самосвалами)
  Вручную: 100-200 м²/смена (бригада 5-6 чел. с швабристами)
  дни_асфальта = ceil(площадь / 3000) × кол-во_слоёв (при method=machine)
  дни_асфальта = ceil(площадь / 150) × кол-во_слоёв (при method=manual)
  ВАЖНО: 1 слой = 1 день (при площади до 3000 м²), 2 слоя = 2 дня
  Пример: 1750 м², 2 слоя, укладчиком → 2 дня (по 1 дню на слой)
  Пример: 5000 м², 1 слой, укладчиком → 2 дня

total_work_days = дни_выемки + дни_основания + дни_ливнёвки + дни_асфальта
Пример: 1750 м² полный цикл → 3+5+3+2 = 13 рабочих дней

═══ ПЕРСОНАЛ ═══

ПРОРАБ (ВСЕГДА): 1 чел. на ВСЕ рабочие дни (total_work_days)

ГЕОДЕЗИСТ:
  area ≤ 500: 2 выезда (разбивка + исполнительная)
  area ≤ 2000: 3 выезда (разбивка + контроль основания + исполнительная после асфальта)
  area ≤ 5000: 4 выезда (разбивка + контроль корыта + контроль основания + исполнительная)
  area > 5000: 5+ выездов

ДОРОЖНЫЕ РАБОЧИЕ НА ЗЕМЛЯНЫХ РАБОТАХ И ОСНОВАНИИ:
  area ≤ 500: 2 чел.
  area ≤ 1500: 3 чел.
  area ≤ 3000: 4 чел.
  area > 3000: 5-6 чел.
  Кол-во чел/смен = кол-во_чел × (дни_выемки + дни_основания)
  Они же помогают при ливнёвке — добавить + дни_ливнёвки если есть

ДОРОЖНЫЕ РАБОЧИЕ НА УКЛАДКЕ АСФАЛЬТА:
  method=machine: 5-6 чел. (2 на раскладке, 1-2 на подаче, 1-2 подсобка)
  method=manual: max(4, min(8, ceil(площадь/150))) чел.
  Кол-во чел/смен = кол-во_чел × дни_асфальта
  ВАЖНО: это БОЛЬШЕ чем на земляных работах, потому что асфальт требует слаженной бригады

ШВАБРИСТ (при асфальте):
  area ≤ 500: 1 чел.
  area ≤ 2000: 1-2 чел. (оптимально 2)
  area > 2000: 2 чел.
  Кол-во чел/смен = кол-во_швабристов × дни_асфальта

МАШИНИСТ УКЛАДЧИКА: ТОЛЬКО при method=machine, кол-во = смены_укладчика
МАШИНИСТ КАТКА: ВСЕГДА при асфальте, кол-во = смены_катка
МАШИНИСТ ЭКСКАВАТОРА: при земляных работах, кол-во = дни_выемки + дни_ливнёвки (если есть)

ПЛИТОЧНИКИ (при плитке):
  кол-во = max(2, ceil(площадь_плитки / 500))
  смены = ceil(площадь / (кол-во × 20)) — 20 м²/чел/смена

БОРДЮРЩИК (при бордюрах):
  кол-во = max(1, ceil(длина / 200))
  смены = ceil(длина / (кол-во × 40)) — 40 п.м/чел/смена

═══ ПРИМЕР: 1750 м², выемка + основание (песок 200 + щебень 150 + геотекстиль) + асфальт 1 слой укладчиком + ливнёвка 50 п.м ═══
  Этап 1 (выемка): 3 дня, экскаватор 3 см., 3 рабочих + прораб
  Этап 2 (основание): 5 дней, каток/виброплита, 3-4 рабочих + прораб
  Этап 3 (ливнёвка): 3 дня (параллельно с основанием частично), 2-3 рабочих + экскаватор
  Этап 4 (асфальт): 2 дня, укладчик+каток, 5-6 рабочих + 2 швабриста + прораб
  Геодезист: 3 выезда
  Итого: ~13 рабочих дней, прораб 13 смен`,
  },

  // ─── 5. ДЕМОНТАЖ ───
  {
    id: 'demolition',
    title: 'Демонтаж и фрезерование',
    category: 'norms',
    order: 5,
    content: `ДЕМОНТАЖ:

ЭКСКАВАТОРОМ:
  Объём = площадь × толщина × 1.3 (разрыхление)
  Рейсы вывоза = ceil(объём / 15)
  Включить: экскаватор-погрузчик + самосвал + вывоз мусора

ФРЕЗЕРОВАНИЕ:
  Стоимость = площадь × 75 ₽/м²
  + Доставка фрезы = 50 000 ₽ (единоразово)
  Объём отходов = площадь × глубина × 1.2
  Рейсы вывоза = ceil(объём / 15)

НАРЕЗКА КАРТ (ямочный ремонт):
  Нарезчик швов: 1 смена
  Компрессор с отбойником: для мелких объёмов`,
  },

  // ─── 6. ЛОГИКА ВКЛЮЧЕНИЯ РЕСУРСОВ ───
  {
    id: 'inclusion_rules',
    title: 'Правила включения ресурсов',
    category: 'rules',
    order: 6,
    content: `ПРАВИЛА ВКЛЮЧЕНИЯ РЕСУРСОВ:

=== АСФАЛЬТ ===
Если есть укладка асфальта:
  ВСЕГДА: а/б смесь, подгрунтовка, доставка а/б, каток АСФАЛЬТОВЫЙ eq2 (4т) + доставка, швабрист 1-2 чел., 5-6 дорожных рабочих
  Если 2 слоя: + а/б смесь крупнозернистая (нижний), подгрунтовка ×2
  Если method=machine: + асфальтоукладчик eq1 + доставка
  Если method=manual: НЕ добавлять укладчик! Увеличить дорожных рабочих
  ВАЖНО: НЕ путать eq2 (асфальтовый каток) с eq9 (грунтовый каток)!

=== ОСНОВАНИЕ ===
Если НЕ "existing":
  ВСЕГДА: песок, щебень, геотекстиль, вода, доставка, экскаватор, 3-4 дорожных рабочих
  area ≥ 500: + каток ГРУНТОВЫЙ eq9 (10+ т) на ВСЕ дни основания + доставка (50 000 ₽)
  area < 500: + виброплита eq5 вместо грунтового катка
  Если щебень > 200 мм: + щебень фр.40-70 (крупная фракция)
  ВАЖНО: грунтовый каток нужен на КАЖДЫЙ день укладки песка и щебня!

=== БОРДЮРЫ ===
  Бордюр (дорожный или садовый) + бетон + ЦПС + доставка + бордюрщик

=== ПЛИТКА ===
  Плитка + ЦПС + щебень + геотекстиль + доставка + плиточники

=== ЗЕМЛЯНЫЕ РАБОТЫ / ОСНОВАНИЕ ===
  Дорожные рабочие: 3-4 чел. × дни (выемка + основание), помощь экскаватору, планировка, уплотнение
  Если есть ливнёвка: те же рабочие + дни_ливнёвки

=== ВСЕГДА ВКЛЮЧАТЬ ===
  Прораб на ВСЕ рабочие дни
  Геодезист минимум 2-3 выезда (area > 500)
  Дорожные рабочие на КАЖДЫЙ этап (земля, основание, ливнёвка, асфальт)
  Обеды бригады, СИЗ, расходные инструменты
  Погодный резерв 5%, непредвиденные 5%, питьевая вода

=== ЛИВНЕВАЯ КАНАЛИЗАЦИЯ ===
Если есть ливнёвка:
  ВСЕГДА: трубы ПВХ (m22), дождеприёмники (m20), пескоуловитель (m23), экскаватор для траншей, дорожные рабочие
  Если новые колодцы: + колодец (m27) + люк (m29) + земляные работы
  Если регулировка высоты: + кольцо удлинительное (m28) + люк (m29) если замена + работы по регулировке
  Если демонтаж колодцев: + экскаватор + вывоз мусора + засыпка

=== АВТОГУДРОНАТОР ===
  area > 1000: включить (механическая подгрунтовка)
  area ≤ 1000: ручная подгрунтовка (в работе бригады)`,
  },

  // ─── 7. СПЕЦИАЛЬНЫЕ СЦЕНАРИИ ───
  {
    id: 'special_scenarios',
    title: 'Специальные сценарии',
    category: 'rules',
    order: 7,
    content: `СПЕЦИАЛЬНЫЕ СЦЕНАРИИ:

ЯМОЧНЫЙ РЕМОНТ (pothole_repair):
  Метод = ВСЕГДА "manual"
  Асфальт: только 1 слой
  Основание: обычно "existing"
  + Нарезчик швов (1 смена)
  + Компрессор с отбойником (малые объёмы)
  Каток: если карты < 2 м² → виброплита, иначе малый каток
  Мин. бригада: 1 прораб, 2-3 дорожных рабочих, 1 швабрист, 1-2 разнорабочих

БОЛЬШОЙ ОБЪЕКТ (area > 5000 м²):
  Поэтапная укладка — несколько дней завоза а/б
  Доп. прорабский состав (мастер)
  Лаборатория контроля качества (выезд)
  Поливочная машина для пылеподавления
  2-3 самосвала одновременно
  Ночные работы → надбавка к персоналу 20%

ЗИМНИЙ ПЕРИОД (октябрь — апрель):
  ВНИМАНИЕ: температура < +5°С
  Горячая а/б смесь с добавками: +10-15% к стоимости
  Увеличить потери при транспортировке (остывание)
  Скорость работы -20-30%
  Увеличить смены техники и персонала на 25%`,
  },

  // ─── 8. НАКЛАДНЫЕ РАСХОДЫ ───
  {
    id: 'overhead',
    title: 'Накладные расходы',
    category: 'norms',
    order: 8,
    content: `НАКЛАДНЫЕ / НЕУЧТЁННЫЕ РАСХОДЫ:

  Обеды бригады: кол-во_людей × кол-во_смен × 500 ₽/чел
  СИЗ (перчатки, жилеты, каски): кол-во_людей × 300 ₽/чел
  Расходные инструменты: лопаты, грабли, гладилки, шланги — компл.
  Временные знаки и ограждения: при работе на проезжей части — компл.
  ГСМ (доп. расходы): 3-5% от техники (если не входит в стоимость смены)
  Погодный резерв: 5% от общей суммы (простои из-за дождя)
  Непредвиденные расходы: 5-10% (доп. объёмы, скрытые работы)
  Вода питьевая: 200 ₽/смена на бригаду

ФИКСИРОВАННЫЕ ЦЕНЫ:
  Фреза: 75 ₽/м² + доставка 50 000 ₽
  Тяжёлый каток: 25 000 ₽/смена + доставка 50 000 ₽
  Вывоз мусора: 15 000 ₽/рейс (самосвал 20 м³)
  Обеды: 500 ₽/чел/смена
  СИЗ: 300 ₽/чел (разово)
  Питьевая вода: 200 ₽/смена`,
  },

  // ─── 9. ДОСТАВКА И ЛОГИСТИКА ───
  {
    id: 'logistics',
    title: 'Доставка и логистика',
    category: 'norms',
    order: 9,
    content: `ДОСТАВКА ТЕХНИКИ (единоразово):
  Асфальтоукладчик (трал): из прайс-листа — только при method=machine
  Каток вибрационный (трал): из прайс-листа — всегда при укладке
  Каток тяжёлый (трал): 50 000 ₽ — при area ≥ 500 м²
  Экскаватор (трал): из прайс-листа — при земляных работах
  Дорожная фреза (трал): 50 000 ₽ — при фрезеровании
  Виброплита: из прайс-листа — при area < 500

ЛОГИСТИКА МАТЕРИАЛОВ:
  Доставка а/б смеси: привязана к тоннажу (1 т доставки = 1 т смеси)
  Доставка щебня: ceil(объём / 12) рейсов (12 м³ в самосвале)
  Доставка песка: ceil(объём / 12) рейсов
  Доставка бордюров: ceil(штук / 100) рейсов (дорожные) или /200 (садовые)
  Доставка плитки: из прайс-листа

ВЫВОЗ ГРУНТА И МУСОРА (самосвал 20 м³):
  Грунт: 20 м³/рейс × 15 000 ₽/рейс
  Строительный мусор (демонтаж): 15-20 м³/рейс (зависит от фракции)
  Коэфф. разрыхления при выемке: ×1.25 (суглинок/глина по СНиП)
  Рейсы = ceil(объём_выемки × Кр / 20)`,
  },

  // ─── 10. КОНТРОЛЬНЫЕ ПРОВЕРКИ ───
  {
    id: 'checklist',
    title: 'Контроль результата',
    category: 'rules',
    order: 10,
    content: `ЧЕКЛИСТ ПРОВЕРКИ РЕЗУЛЬТАТА:

✓ Все количества округлены вверх (ceil)
✓ Доставка техники на тралах — единоразово (1 компл.)
✓ Доставка материалов — в рейсах или тоннах
✓ При method="manual" — НЕТ асфальтоукладчика
✓ Швабрист включён при ЛЮБОЙ укладке асфальта
✓ Разнорабочие включены ВСЕГДА
✓ Прораб включён ВСЕГДА
✓ Геодезист включён (минимум 2-3 выезда при area > 500)
✓ Вывоз грунта/мусора: самосвал 20 м³, 15 000 ₽/рейс, с учётом Кр разрыхления
✓ Фреза = 75 ₽/м² + доставка 50 000 ₽
✓ Каток ГРУНТОВЫЙ eq9 (основание) ≠ каток АСФАЛЬТОВЫЙ eq2 (асфальт) — это 2 РАЗНЫХ катка!
✓ Грунтовый каток eq9: смены = дни_основания (на ВСЕ дни песка/щебня), 25 000/см + доставка 50 000
✓ Асфальтовый каток eq2: смены = дни_асфальта × слои, 25 000/см
✓ Подгрунтовка между слоями учтена (при 2 слоях)
✓ Геотекстиль с нахлёстом +15%
✓ Плитка с запасом +5%
✓ Обеды и СИЗ на ВСЕХ работников
✓ Погодный резерв 5% включён
✓ Непредвиденные расходы 5% включены
✓ Питьевая вода включена
✓ Количество людей и дней логически согласованы
✓ Рабочие на земляных работах: минимум 3 чел. при area > 500
✓ Рабочие на асфальте: минимум 5-6 чел. при method=machine
✓ Швабристов 2 при area > 500
✓ Дни по этапам посчитаны отдельно (выемка → основание → ливнёвка → асфальт)
✓ Прораб на ВСЕ рабочие дни
✓ Все resourceId из каталога (не выдуманные)
✓ Блоки: materials, equipment, delivery, personnel, overhead, waste`,
  },

  // ─── 11. ПРАВИЛА ГЕНЕРАЦИИ ───
  {
    id: 'generation_rules',
    title: 'Правила генерации',
    category: 'rules',
    order: 11,
    content: `ПРАВИЛА ГЕНЕРАЦИИ СМЕТЫ:

1. Получи входные параметры от пользователя
2. Определи тип работ и активируй правила включения ресурсов
3. Рассчитай количества материалов по формулам (нормы расхода)
4. Рассчитай количество смен техники (производительность)
5. Рассчитай персонал (бригады, специалисты)
6. Рассчитай логистику (рейсы доставки/вывоза)
7. Добавь накладные расходы
8. Проверь по чеклисту
9. Сформируй JSON по формату
10. Покажи расчёты в поле "calculation"

ВАЖНО:
- Не пропускай ни один ресурс
- Все расчёты показывай в поле "calculation"
- При сомнениях — округляй ВВЕРХ
- Цены подставляются из приложения (кроме фиксированных)
- Используй ТОЛЬКО resourceId из списка ресурсов`,
  },

  // ─── 12. ФОРМАТ ОТВЕТА ───
  {
    id: 'output_format',
    title: 'Формат ответа',
    category: 'format',
    order: 12,
    content: `Верни JSON объект с полями:
- areaSize (число, м²)
- projectName (строка, лаконичное название объекта)
- items (массив объектов с полями resourceId и quantity)

Пример:
{
  "areaSize": 2500,
  "projectName": "Асфальтирование двора ул. Ленина 15",
  "items": [
    {"resourceId": "m1", "quantity": 288},
    {"resourceId": "m2", "quantity": 288},
    {"resourceId": "m4", "quantity": 563},
    {"resourceId": "m3", "quantity": 488}
  ]
}

ВАЖНО: resourceId должны совпадать с ID из каталога ресурсов (m1, m2, eq1, l1 и т.д.)`,
  },
];
