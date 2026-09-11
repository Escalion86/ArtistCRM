import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

const emptyServiceBase = {
  description: '',
  images: [],
  duration: 0,
  price: 0,
  groupId: null,
}

export const ONBOARDING_ACTIVITY_PRESETS = Object.freeze([
  {
    key: 'events',
    title: 'Мероприятия и сцена',
    shortTitle: 'Мероприятия',
    description: 'Ведущий, артист, DJ, музыкант, группа, шоу-программа.',
    starterServices: [
      {
        title: 'Ведение мероприятия',
        description: 'Основная услуга для подтвержденного события.',
        duration: 240,
        price: 0,
      },
      {
        title: 'Выступление / шоу-программа',
        description: 'Отдельный номер, концерт или программа.',
        duration: 60,
        price: 0,
      },
      {
        title: 'DJ-сет / музыкальное сопровождение',
        description: 'Музыка, сет или сопровождение события.',
        duration: 180,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Корпоратив',
      description:
        'Учебная заявка: клиент уточняет дату, формат и стоимость. Пока заказ не подтвержден, это заявка.',
      nextActionTitle: 'Связаться с клиентом',
      nextActionDescription: 'Уточнить формат, площадку и решение по заказу.',
    },
  },
  {
    key: 'photo_video',
    title: 'Фото, видео, контент',
    shortTitle: 'Фото / видео',
    description: 'Фотограф, видеограф, контент-съемка.',
    starterServices: [
      {
        title: 'Фотосъемка 2 часа',
        description: 'Базовая съемка для частного события или контента.',
        duration: 120,
        price: 0,
      },
      {
        title: 'Видеосъемка',
        description: 'Съемка события, ролика или материала для соцсетей.',
        duration: 180,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Съемка дня рождения',
      description:
        'Учебная заявка: клиент спрашивает свободна ли дата, сколько стоит съемка и когда будет готов материал.',
      nextActionTitle: 'Уточнить детали съемки',
      nextActionDescription:
        'Согласовать дату, место, длительность и формат результата.',
    },
  },
  {
    key: 'custom_products',
    title: 'Изделия и заказы',
    shortTitle: 'Изделия',
    description: 'Торты, декор, подарки, одежда, ручная работа.',
    starterServices: [
      {
        title: 'Торт на заказ',
        description: 'Индивидуальный заказ под дату клиента.',
        duration: 0,
        price: 0,
      },
      {
        title: 'Набор / маленький заказ',
        description: 'Капкейки, подарочный набор или небольшой заказ.',
        duration: 0,
        price: 0,
      },
      {
        title: 'Доставка',
        description: 'Отдельная услуга доставки или передачи заказа.',
        duration: 0,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Торт на день рождения',
      description:
        'Учебная заявка: клиент уточняет дату, вес, начинку, оформление и стоимость.',
      nextActionTitle: 'Уточнить параметры заказа',
      nextActionDescription:
        'Спросить вес, оформление, дату выдачи и нужен ли задаток.',
    },
  },
  {
    key: 'beauty',
    title: 'Красота и персональные услуги',
    shortTitle: 'Красота',
    description: 'Визаж, прически, стилист, мастер.',
    starterServices: [
      {
        title: 'Макияж',
        description: 'Базовая услуга для клиента.',
        duration: 90,
        price: 0,
      },
      {
        title: 'Укладка',
        description: 'Отдельная услуга или часть комплексного образа.',
        duration: 60,
        price: 0,
      },
      {
        title: 'Образ под ключ',
        description: 'Комплексная услуга для события или съемки.',
        duration: 150,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Образ для фотосессии',
      description:
        'Учебная заявка: клиент уточняет дату, время, место и состав услуги.',
      nextActionTitle: 'Уточнить образ',
      nextActionDescription:
        'Уточнить время, место, референсы и подтверждение записи.',
    },
  },
  {
    key: 'consulting',
    title: 'Консультации и обучение',
    shortTitle: 'Консультации',
    description: 'Наставник, репетитор, тренер, консультант.',
    starterServices: [
      {
        title: 'Разовая консультация',
        description: 'Одна встреча или созвон по запросу клиента.',
        duration: 60,
        price: 0,
      },
      {
        title: 'Пакет занятий',
        description: 'Несколько встреч или уроков в одном заказе.',
        duration: 60,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Консультация клиента',
      description:
        'Учебная заявка: клиент описал задачу и выбирает удобное время для первой встречи.',
      nextActionTitle: 'Назначить время',
      nextActionDescription: 'Предложить слоты и уточнить формат встречи.',
    },
  },
  {
    key: 'repair_home',
    title: 'Ремонт, монтаж и бытовые услуги',
    shortTitle: 'Ремонт и монтаж',
    description: 'Электрик, маляр, сантехник, сборщик мебели, мастер по ремонту, клининг.',
    starterServices: [
      {
        title: 'Ремонтные и монтажные работы',
        description: 'Укажите свои работы: электромонтаж, покраска стен, сантехника или сборка мебели.',
        duration: 0,
        price: 0,
      },
      {
        title: 'Выезд и диагностика',
        description: 'Осмотр объекта, замеры и согласование объёма работ.',
        duration: 60,
        price: 0,
      },
      {
        title: 'Бытовые услуги',
        description: 'Уборка, мелкий ремонт или другая помощь по дому.',
        duration: 0,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Работы в квартире',
      description: 'Учебная заявка: клиент хочет заказать работы в квартире. Нужно уточнить адрес, объём, материалы, сроки и стоимость.',
      nextActionTitle: 'Уточнить объём работ',
      nextActionDescription: 'Уточнить адрес, объём работ и материалы, согласовать выезд и условия оплаты.',
    },
  },
  {
    key: 'transport_delivery',
    title: 'Перевозки и доставка',
    shortTitle: 'Перевозки',
    description: 'Грузоперевозчик, курьер, помощь с переездом.',
    starterServices: [
      {
        title: 'Перевозка / доставка',
        description: 'Уточните маршрут, состав груза и условия доставки.',
        duration: 0,
        price: 0,
      },
      {
        title: 'Помощь с переездом',
        description: 'Перевозка вещей с согласованием объёма и времени.',
        duration: 0,
        price: 0,
      },
      {
        title: 'Погрузка и разгрузка',
        description: 'Дополнительная помощь с учётом веса, этажей и наличия лифта.',
        duration: 0,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Перевозка мебели',
      description: 'Учебная заявка: клиент хочет перевезти мебель. Нужно уточнить адреса, состав груза, этажи, время и стоимость.',
      nextActionTitle: 'Уточнить маршрут и груз',
      nextActionDescription: 'Согласовать адреса, объём груза, погрузку, время подачи и условия оплаты.',
    },
  },
  {
    key: 'digital_services',
    title: 'Дизайн, разработка и маркетинг',
    shortTitle: 'Дизайн и IT',
    description: 'Дизайнер, разработчик сайтов, SMM-специалист, маркетолог.',
    starterServices: [
      {
        title: 'Работа над проектом',
        description: 'Назовите свою услугу: дизайн, разработка сайта или продвижение.',
        duration: 0,
        price: 0,
      },
      {
        title: 'Обсуждение задачи / бриф',
        description: 'Встреча для уточнения целей, объёма работ, сроков и бюджета.',
        duration: 60,
        price: 0,
      },
      {
        title: 'Сопровождение проекта',
        description: 'Поддержка, обновления или ведение продвижения за согласованный период.',
        duration: 0,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Обсуждение нового проекта',
      description: 'Учебная заявка: клиент хочет заказать проект. Нужно уточнить задачу, результат, сроки, бюджет и этапы оплаты.',
      nextActionTitle: 'Согласовать бриф',
      nextActionDescription: 'Уточнить задачу, материалы клиента, сроки, бюджет и условия предоплаты.',
    },
  },
  {
    key: 'other',
    title: 'Другое / настрою сам',
    shortTitle: 'Другое',
    description: 'Нейтральный пример для любой сферы.',
    starterServices: [
      {
        title: 'Основная услуга',
        description: 'Переименуйте под то, что чаще всего заказывают клиенты.',
        duration: 0,
        price: 0,
      },
    ],
    demo: {
      eventType: 'Заказ от клиента',
      description:
        'Учебная заявка: клиент заинтересовался услугой, но еще не подтвердил заказ.',
      nextActionTitle: 'Связаться с клиентом',
      nextActionDescription: 'Уточнить детали, стоимость и следующий шаг.',
    },
  },
])

const presetsByKey = new Map(
  ONBOARDING_ACTIVITY_PRESETS.map((preset) => [preset.key, preset])
)

export const getOnboardingPreset = (key) =>
  presetsByKey.get(key) || presetsByKey.get('other')

export const getStarterServicesForPreset = (key) =>
  getOnboardingPreset(key).starterServices.map((service) => ({
    ...emptyServiceBase,
    ...service,
    groupId: null,
    images: [],
  }))

export const areOnboardingServicesValid = (services) =>
  Boolean(
    services?.length &&
      services.every(
        (service) =>
          String(service?.title ?? '').trim() &&
          Number.isFinite(Number(service?.price)) &&
          Number(service.price) >= 0 &&
          Number.isFinite(Number(service?.duration)) &&
          Number(service.duration) >= 0
      )
  )

export const buildDemoEventPayload = (
  key,
  serviceIds = [],
  { now = new Date(), timeZone = dayjs.tz.guess() } = {}
) => {
  const preset = getOnboardingPreset(key)
  const tomorrow = dayjs(now).tz(timeZone).add(1, 'day').format('YYYY-MM-DD')
  const atHour = (hour) =>
    dayjs.tz(`${tomorrow} ${hour}:00:00`, timeZone).toISOString()

  return {
    eventType: preset.demo.eventType,
    description: preset.demo.description,
    status: 'draft',
    servicesIds: serviceIds.filter(Boolean).slice(0, 1),
    requestCreatedAt: new Date(now).toISOString(),
    eventDate: atHour(14),
    dateEnd: atHour(15),
    contractSum: 0,
    waitDeposit: false,
    depositDueAt: null,
    depositExpectedAmount: null,
    isTransferred: false,
    isByContract: false,
    importedFromCalendar: false,
    calendarImportChecked: false,
    calendarSyncError: '',
    additionalEvents: [
      {
        title: preset.demo.nextActionTitle,
        description: preset.demo.nextActionDescription,
        date: atHour(12),
        done: false,
      },
    ],
  }
}

export const getStatusEducationItems = (key) => {
  const preset = getOnboardingPreset(key)
  const confirmedWord =
    ['custom_products', 'repair_home', 'transport_delivery', 'digital_services', 'other'].includes(preset.key)
      ? 'заказ'
      : 'мероприятие'

  return [
    {
      status: 'draft',
      title: 'Заявка',
      description:
        'Клиент проявил интерес, но еще не подтвердил условия. На этом этапе важно поставить следующий контакт.',
    },
    {
      status: 'active',
      title: 'Подтверждено',
      description: `Клиент подтвердил ${confirmedWord}, дату или условия. Теперь это работа, которую нужно вести в календаре, финансах и документах.`,
    },
    {
      status: 'closed',
      title: 'Закрыто',
      description:
        'Работа завершена, оплаты и документы доведены до конца. Закрытая карточка больше не требует действий.',
    },
    {
      status: 'canceled',
      title: 'Отменено',
      description: 'Заказ не состоялся и не должен считаться активной работой.',
    },
  ]
}
