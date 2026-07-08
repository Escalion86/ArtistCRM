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

export const buildDemoEventPayload = (key, serviceIds = []) => {
  const preset = getOnboardingPreset(key)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(12, 0, 0, 0)

  return {
    eventType: preset.demo.eventType,
    description: preset.demo.description,
    status: 'draft',
    servicesIds: serviceIds.filter(Boolean),
    requestCreatedAt: new Date().toISOString(),
    eventDate: null,
    dateEnd: null,
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
        date: tomorrow.toISOString(),
        done: false,
      },
    ],
  }
}

export const getStatusEducationItems = (key) => {
  const preset = getOnboardingPreset(key)
  const confirmedWord =
    preset.key === 'custom_products' || preset.key === 'other'
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
