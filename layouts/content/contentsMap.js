import EventsContent from './EventsContent'
import ClientsContent from './ClientsContent'
import RequestsContent from './RequestsContent'
import DevContent from './DevContent'
import TransactionsContent from './TransactionsContent'
import SettingsContent from './SettingsContent'
import StatisticsContent from './StatisticsContent'
import ServicesContent from './ServicesContent'
import UsersContent from './UsersContent'
import ProfileContent from './ProfileContent'
import TariffsContent from './TariffsContent'
import TariffSelectContent from './TariffSelectContent'

const UpcomingEventsContent = () => <EventsContent filter="upcoming" />
const PastEventsContent = () => <EventsContent filter="past" />

export const CONTENTS = Object.freeze({
  requests: {
    Component: RequestsContent,
    name: 'Заявки',
  },
  eventsUpcoming: {
    Component: UpcomingEventsContent,
    name: 'Предстоящие мероприятия',
  },
  eventsPast: {
    Component: PastEventsContent,
    name: 'Прошедшие мероприятия',
  },
  clients: {
    Component: ClientsContent,
    name: 'Клиенты',
  },
  transactions: {
    Component: TransactionsContent,
    name: 'Транзакции',
  },
  events: {
    Component: UpcomingEventsContent,
    name: 'Мероприятия',
  },
  dev: {
    Component: DevContent,
    name: 'Разработчик',
  },
  settings: {
    Component: SettingsContent,
    name: 'Настройки',
  },
  tariffs: {
    Component: TariffsContent,
    name: 'Тарифы',
  },
  'tariff-select': {
    Component: TariffSelectContent,
    name: 'Выбор тарифа',
  },
  services: {
    Component: ServicesContent,
    name: 'Услуги',
  },
  statistics: {
    Component: StatisticsContent,
    name: 'Статистика',
  },
  users: {
    Component: UsersContent,
    name: 'Пользователи',
  },
  profile: {
    Component: ProfileContent,
    name: 'Профиль',
  },
  questionnaire: {
    Component: ProfileContent,
    name: 'Профиль',
  },
})
