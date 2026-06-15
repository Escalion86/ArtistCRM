import Link from 'next/link'

const siteUrl = (process.env.DOMAIN || 'https://artistcrm.ru').replace(
  /\/$/,
  ''
)
const pageUrl = `${siteUrl}/privacy`
const ogImage = `${siteUrl}/og-image.jpg`

export const metadata = {
  title: 'Политика конфиденциальности — ArtistCRM',
  description: 'Политика конфиденциальности сервиса ArtistCRM.',
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: pageUrl,
    siteName: 'ArtistCRM',
    title: 'Политика конфиденциальности — ArtistCRM',
    description: 'Политика конфиденциальности сервиса ArtistCRM.',
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'ArtistCRM — Политика конфиденциальности',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Политика конфиденциальности — ArtistCRM',
    description: 'Политика конфиденциальности сервиса ArtistCRM.',
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
}

const EffectiveDate = '20.01.2026'

export default function PrivacyPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12 text-sm text-gray-700">
        <div className="flex flex-col gap-2">
          <p className="text-general text-xs font-semibold tracking-[0.2em] uppercase">
            Документы
          </p>
          <h1 className="font-futuraPT text-3xl font-semibold text-black">
            Политика конфиденциальности
          </h1>
          <p className="text-sm text-gray-500">Действует с: {EffectiveDate}</p>
        </div>

        <p>
          ИП Белинский Алексей Алексеевич (ИНН 245727560982, ОГРНИП
          319246800103511), адрес: РФ, Красноярский край, г. Красноярск, ул. 4
          Продольная 34 (далее — «Оператор») соблюдает требования
          законодательства РФ о персональных данных и обрабатывает персональные
          данные пользователей сервиса ArtistCRM (далее — «Сервис»).
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black">
            1. Общие положения
          </h2>
          <p>
            1.1. Политика определяет порядок обработки и защиты персональных
            данных пользователей Сервиса.
          </p>
          <p>
            1.2. Используя Сервис, пользователь выражает согласие с настоящей
            Политикой.
          </p>
          <p>
            1.3. Контакты Оператора для вопросов по персональным данным:{' '}
            <a href="mailto:Escalion86@gmail.com" className="text-general">
              Escalion86@gmail.com
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black">
            2. Какие данные мы собираем
          </h2>
          <p>
            2.1. Персональные данные пользователей Сервиса: ФИО, номер телефона.
          </p>
          <p>
            2.2. Данные, которые пользователь вносит в CRM: ФИО и телефон
            клиентов, а также иная информация, которую пользователь решит
            хранить в Сервисе.
          </p>
          <p>
            2.3. Технические данные: стандартные данные, передаваемые браузером
            при обращении к серверу (IP, user-agent, дата/время запросов).
          </p>
          <p>
            2.4. В production-версии Сервис использует Яндекс Метрику, включая
            Вебвизор, карту кликов и отслеживание переходов по ссылкам. При этом
            могут обрабатываться технические сведения об устройстве и браузере,
            IP-адрес, источник перехода, посещенные страницы и действия в
            интерфейсе. Обработка этих данных выполняется для анализа работы и
            улучшения Сервиса.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black">
            3. Цели обработки
          </h2>
          <p>3.1. Предоставление доступа к Сервису и его функциональности.</p>
          <p>3.2. Сохранение и отображение данных пользователей в CRM.</p>
          <p>3.3. Техническая поддержка и связь с пользователем.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black">
            4. Правовые основания обработки
          </h2>
          <p>
            4.1. Обработка осуществляется на основании согласия пользователя и
            исполнения договора (оферты) по предоставлению Сервиса.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black">
            5. Передача третьим лицам
          </h2>
          <p>
            5.1. Данные могут передаваться внешним сервисам, необходимым для
            работы Сервиса:
          </p>
          <p>— Google Calendar (OAuth) — по инициативе пользователя.</p>
          <p>
            — Яндекс Метрика — для анализа посещаемости, технического состояния
            и использования Сервиса.
          </p>
          <p>
            — Платежный сервис ЮKassa — при оплате подписки (планируется
            использование).
          </p>
          <p>
            5.2. Оператор не продает и не передает данные третьим лицам для
            рекламы.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black">
            6. Данные Google Calendar
          </h2>
          <p>
            6.1. Интеграция подключается пользователем добровольно через OAuth.
            Для ее работы Сервис получает и хранит OAuth-токены доступа и
            обновления, срок действия токена, предоставленный Google набор прав,
            дату подключения, а также идентификатор и название выбранного
            календаря. Идентификатор календаря может совпадать с адресом
            электронной почты аккаунта Google. Сервис не запрашивает пароль от
            аккаунта Google.
          </p>
          <p>
            6.2. Сервис читает список календарей, доступных пользователю, чтобы
            показать его в настройках и позволить выбрать календарь для
            синхронизации. Сервис также может читать и импортировать события из
            выбранного Google Calendar в CRM и создавать, обновлять и удалять
            события Google Calendar при экспорте и синхронизации.
          </p>
          <p>
            6.3. В Google Calendar могут передаваться выбранные пользователем
            данные мероприятий CRM: название и тип мероприятия, услуги, даты и
            время, статус, описание, адрес и ссылки на навигацию, имя и контакты
            клиента, прочие контакты и данные коллеги, договорная сумма,
            финансовый комментарий, сведения о транзакциях, дополнительные
            события и ссылка на мероприятие в ArtistCRM. Конкретный состав
            зависит от настроек синхронизации пользователя.
          </p>
          <p>
            6.4. Данные Google используются исключительно для предоставления и
            улучшения пользовательской функции интеграции с Google Calendar. Они
            не продаются, не используются для рекламы и не передаются для
            определения кредитоспособности или иных целей, не связанных с этой
            функцией.
          </p>
          <p>
            6.5. Использование и передача Сервисом информации, полученной из API
            Google, соответствует{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
              className="text-general"
            >
              Google API Services User Data Policy
            </a>
            , включая требования Limited Use.
          </p>
          <p>
            6.6. Пользователь может отключить интеграцию в настройках ArtistCRM.
            После отключения OAuth-токены и данные авторизации удаляются из
            учетной записи Сервиса. Идентификатор календаря удаляется, поэтому
            активный доступ к Google Calendar прекращается. Название календаря может
            сохраняться как отображаемая и диагностическая информация до выбора
            другого календаря или удаления учетной записи. Пользователь также
            может отозвать доступ ArtistCRM в настройках безопасности аккаунта
            Google. Уже созданные в Google Calendar события могут потребовать
            отдельного удаления пользователем.
          </p>
          <p>
            6.7. Для удаления учетной записи ArtistCRM и связанных с ней данных,
            включая сохраненные данные интеграции Google Calendar, пользователь
            может направить запрос на{' '}
            <a href="mailto:Escalion86@gmail.com" className="text-general">
              Escalion86@gmail.com
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black">
            7. Хранение и защита
          </h2>
          <p>
            7.1. Данные хранятся столько, сколько необходимо для предоставления
            Сервиса и выполнения обязательств.
          </p>
          <p>
            7.2. Оператор принимает разумные технические и организационные меры
            защиты данных от несанкционированного доступа.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black">
            8. Права пользователя
          </h2>
          <p>
            8.1. Пользователь вправе запросить доступ, исправление или удаление
            своих данных, направив запрос на{' '}
            <a href="mailto:Escalion86@gmail.com" className="text-general">
              Escalion86@gmail.com
            </a>
            .
          </p>
          <p>
            8.2. Пользователь вправе отозвать согласие на обработку данных, что
            может повлечь невозможность дальнейшего использования Сервиса.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black">
            9. Возрастные ограничения
          </h2>
          <p>9.1. Сервис предназначен для лиц старше 18 лет.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black">
            10. Изменения Политики
          </h2>
          <p>
            10.1. Оператор вправе обновлять Политику. Актуальная версия
            публикуется на сайте{' '}
            <Link href="/" className="text-general">
              https://artistcrm.ru
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
