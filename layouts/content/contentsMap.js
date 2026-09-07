import EventsContent from './EventsContent'
import AttentionContent from './AttentionContent'
import ClientsContent from './ClientsContent'
import CallsContent from './CallsContent'
import DevContent from './DevContent'
import TransactionsContent from './TransactionsContent'
import SettingsContent from './SettingsContent'
import IntegrationsContent from './IntegrationsContent'
import ImportExportContent from './ImportExportContent'
import DocumentsContent from './DocumentsContent'
import ListsContent from './ListsContent'
import NotificationsContent from './NotificationsContent'
import ReferralsContent from './ReferralsContent'
import SiteReferralSettingsContent from './SiteReferralSettingsContent'
import AiUsageAdminContent from './AiUsageAdminContent'
import RegistrationTrialSettingsContent from './RegistrationTrialSettingsContent'
import SiteContactsSettingsContent from './SiteContactsSettingsContent'
import StatisticsContent from './StatisticsContent'
import ServicesContent from './ServicesContent'
import UsersContent from './UsersContent'
import ProfileContent from './ProfileContent'
import TariffsContent from './TariffsContent'
import TariffSelectContent from './TariffSelectContent'
import HistoryContent from './HistoryContent'
import FeedbackContent from './FeedbackContent'

const UpcomingEventsContent = (props) => (
  <EventsContent filter="upcoming" {...props} />
)
const PastEventsContent = (props) => <EventsContent filter="past" {...props} />

export const CONTENTS = Object.freeze({
  eventsUpcoming: {
    Component: UpcomingEventsContent,
    name: 'Предстоящие мероприятия',
  },
  eventsPast: {
    Component: PastEventsContent,
    name: 'Прошедшие мероприятия',
  },
  attention: {
    Component: AttentionContent,
    name: 'Важное',
  },
  clients: {
    Component: ClientsContent,
    name: 'Клиенты',
  },
  calls: {
    Component: CallsContent,
    name: 'Звонки',
  },
  transactions: {
    Component: TransactionsContent,
    name: 'Транзакции',
  },
  history: {
    Component: HistoryContent,
    name: 'История действий',
  },
  feedback: {
    Component: FeedbackContent,
    name: 'Обратная связь',
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
  integrations: {
    Component: IntegrationsContent,
    name: 'Интеграции',
  },
  import: {
    Component: ImportExportContent,
    name: 'Импорт и экспорт',
  },
  documents: {
    Component: DocumentsContent,
    name: 'Документы',
  },
  lists: {
    Component: ListsContent,
    name: 'Списки',
  },
  notifications: {
    Component: NotificationsContent,
    name: 'Уведомления',
  },
  referrals: {
    Component: ReferralsContent,
    name: 'Реферальная система',
  },
  'site-referrals': {
    Component: SiteReferralSettingsContent,
    name: 'Настройки сайта / Реферальная система',
  },
  'ai-usage': {
    Component: AiUsageAdminContent,
    name: 'Настройки сайта / ИИ и расходы',
  },
  'registration-trial': {
    Component: RegistrationTrialSettingsContent,
    name: 'Настройки сайта / Пробный тариф',
  },
  'site-contacts': {
    Component: SiteContactsSettingsContent,
    name: 'Настройки сайта / Контакты',
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
    name: 'Мои услуги',
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
