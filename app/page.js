import Link from 'next/link'
import Image from 'next/image'
import dbConnect from '@server/dbConnect'
import Tariffs from '@models/Tariffs'
import { getServerSession } from 'next-auth'
import authOptions from './api/auth/[...nextauth]/_options'
import { redirect } from 'next/navigation'
import ThemeToggleButton from '@components/ThemeToggleButton'

export const metadata = {
  title: 'ArtistCRM - CRM для артистов',
  description:
    'Управляйте заявками, финансами, клиентами и календарем в одной системе для артистов.',
}

export const dynamic = 'force-dynamic'

const formatPrice = (price) => {
  if (!price || Number(price) === 0) return 'Бесплатно'
  return `${Number(price).toLocaleString('ru-RU')} ₽/мес`
}

const formatEventsLimit = (limit) => {
  if (!Number.isFinite(limit) || Number(limit) === 0) {
    return 'Без ограничений по мероприятиям'
  }
  return `До ${limit} мероприятий в месяц`
}

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (session?.user?._id) {
    redirect('/cabinet')
  }
  let tariffs = []
  try {
    await dbConnect()
    tariffs = await Tariffs.find({ hidden: { $ne: true } })
      .sort({ price: 1, title: 1 })
      .lean()
  } catch (error) {
    tariffs = []
  }

  const publicTariffs = tariffs ?? []
  return (
    <main className="home-page relative overflow-hidden">
      <div className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6">
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-3"
        >
          <Image
            src="/img/logo.png"
            alt="ArtistCRM"
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover"
            priority
          />
          <span className="text-sm font-semibold tracking-wide text-black">
            ArtistCRM
          </span>
        </Link>
        <Link
          href="/login"
          className="cursor-pointer rounded-full bg-general px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
        >
          Войти в систему
        </Link>
      </div>

      <div className="home-hero-bg absolute inset-0 pointer-events-none">
        <div className="absolute right-0 rounded-full from-general/40 -top-24 h-72 w-72 bg-gradient-to-br via-white/10 to-transparent blur-3xl" />
        <div className="via-general/20 absolute bottom-0 left-0 h-80 w-80 rounded-full bg-gradient-to-tr from-[#c9a86a]/30 to-transparent blur-3xl" />
        <div className="absolute inset-x-0 top-40 mx-auto h-64 w-[80%] bg-[radial-gradient(circle_at_center,rgba(201,168,106,0.22),transparent_60%)]" />
      </div>

      <section className="relative flex flex-col max-w-6xl gap-10 px-6 pt-20 pb-16 mx-auto lg:flex-row lg:items-center">
        <div className="flex-1">
          <p className="landing-reveal text-general text-sm font-semibold tracking-[0.3em] uppercase">
            CRM для артистов
          </p>
          <h1 className="mt-5 text-4xl font-semibold text-black landing-reveal font-futuraPT sm:text-5xl lg:text-6xl">
            Соберите все заявки, финансы и клиентов в одном понятном месте
          </h1>
          <p className="max-w-xl mt-6 text-base text-gray-700 landing-reveal sm:text-lg">
            ArtistCRM помогает артистам контролировать заявки, вести учет
            доходов, держать связь с клиентами и закрывать документы по каждому
            мероприятию без хаоса и табличек.
          </p>
          <p className="max-w-xl mt-3 text-sm text-gray-600 landing-reveal sm:text-base">
            CRM — это система, где артист хранит клиентов, заявки, оплаты и
            историю выступлений в одном месте.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600 landing-reveal">
            <span className="home-chip rounded-full bg-white/80 px-4 py-2 shadow-sm">
              Все данные сохраняются в облаке и доступны с любого устройства
            </span>
            <div className="home-chip flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 shadow-sm">
              <span>Светлая / тёмная тема</span>
              <ThemeToggleButton />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-8 landing-reveal">
            <Link
              href="/login"
              className="px-6 py-3 text-sm font-semibold text-white transition rounded-full shadow-lg cursor-pointer bg-general hover:shadow-xl"
            >
              Войти в систему
            </Link>
            <Link
              href="#pricing"
              className="px-6 py-3 text-sm font-semibold text-black transition border rounded-full cursor-pointer border-general/30 hover:border-general/60 hover:text-general"
            >
              Посмотреть тарифы
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 mt-10 text-sm text-gray-600 landing-reveal">
            <span className="home-chip px-4 py-2 rounded-full shadow-sm bg-white/80">
              Учет заявок и статусов
            </span>
            <span className="home-chip px-4 py-2 rounded-full shadow-sm bg-white/80">
              Финансовая картина по месяцам
            </span>
            <span className="home-chip px-4 py-2 rounded-full shadow-sm bg-white/80">
              Храните документы и чеки
            </span>
          </div>
        </div>

        <div className="relative flex-1">
          <div className="home-panel hidden p-5 border shadow-lg landing-reveal w-full rounded-3xl border-white/70 bg-white/80 backdrop-blur lg:mt-6 lg:block lg:max-w-xs">
            <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
              Синхронизация
            </p>
            <p className="mt-2 text-lg font-semibold text-black">
              Google Calendar
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Мероприятия сразу в вашем расписании и напоминаниях.
            </p>
          </div>
        </div>
      </section>

      <section className="relative max-w-6xl px-6 pb-16 mx-auto">
        <div className="home-panel p-8 shadow-lg landing-reveal rounded-3xl bg-white/70 backdrop-blur sm:p-10">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <p className="text-general text-sm font-semibold tracking-[0.3em] uppercase">
                Ключевые моменты
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-black font-futuraPT">
                Полный контроль над артистическим бизнесом
              </h2>
              <p className="mt-4 text-sm text-gray-600">
                Данные по заявкам, доходам, клиентам и документам собираются в
                единую понятную картину.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              {[
                'Учет всех поступающих заявок',
                'Контроль финансов и доходов',
                'Ведение статистики по мероприятиям',
                'Работа с клиентами и история общения',
                'Синхронизация с Google календарем',
                'Документооборот: счета и чеки',
                'API для подключения сайта и автоматического приема заявок с уведомлениями',
              ].map((item, index) => (
                <div
                  key={item}
                  className="home-mini-card px-4 py-4 text-sm text-gray-700 bg-white border shadow-sm landing-stagger rounded-2xl border-gray-200/60"
                  style={{ '--delay': `${index * 120 + 120}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="w-3 h-3 mt-1 rounded-full bg-general" />
                    <span className="font-medium text-gray-900">{item}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative max-w-6xl px-6 pb-16 mx-auto">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="home-panel home-panel--light p-8 border shadow-lg landing-reveal border-general/20 to-general/10 rounded-3xl bg-gradient-to-br from-white via-white">
            <p className="text-general text-sm font-semibold tracking-[0.3em] uppercase">
              Как это работает
            </p>
            <h3 className="mt-4 text-2xl font-semibold text-black font-futuraPT">
              Простая логика без перегруженного интерфейса
            </h3>
            <ol className="mt-6 space-y-4 text-sm text-gray-700">
              {[
                'Фиксируете входящие заявки в одном списке.',
                'Система автоматически показывает финансовую картину.',
                'Клиентская история собирается по каждому событию.',
                'Документы и чеки привязываются к мероприятию.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 mt-1 text-xs font-semibold rounded-full bg-general/15 text-general">
                    ✓
                  </span>
                  <span className="font-medium text-gray-900">{item}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="home-panel p-8 border shadow-lg landing-reveal rounded-3xl border-white/70 bg-white/70 backdrop-blur">
            <p className="text-general text-sm font-semibold tracking-[0.3em] uppercase">
              Работа с клиентами
            </p>
            <h3 className="mt-4 text-2xl font-semibold text-black font-futuraPT">
              Звонки, мессенджеры и важные контакты — рядом с заявкой
            </h3>
            <p className="mt-4 text-sm text-gray-600">
              Вы видите, кто и когда обращался, какое мероприятие обсуждалось, и
              на каком этапе сейчас находится сделка.
            </p>
            <div className="home-mini-card px-4 py-4 mt-6 text-sm text-gray-700 bg-white border rounded-2xl border-gray-200/60">
              <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase">
                В планах
              </p>
              <p className="mt-2 text-base font-semibold text-black">
                Контроль звонков и карточка клиента при входящем вызове
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Система подскажет ключевую информацию о клиенте прямо во время
                разговора.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative max-w-6xl px-6 pb-20 mx-auto">
        <div className="flex flex-col items-start gap-6 landing-reveal sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-general text-sm font-semibold tracking-[0.3em] uppercase">
              Тарифы
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-black font-futuraPT">
              Выберите формат работы
            </h2>
            <p className="mt-3 text-sm text-gray-600">
              Подберите вариант, который подходит по объему мероприятий и
              доступным функциям.
            </p>
          </div>
          <Link
            href="/login"
            className="px-6 py-3 text-sm font-semibold text-white transition rounded-full shadow-lg cursor-pointer bg-general hover:shadow-xl"
          >
            Попробовать бесплатно
          </Link>
        </div>

        <div className="grid gap-6 mt-8 lg:grid-cols-2">
          {publicTariffs.length > 0 ? (
            publicTariffs.map((tariff, index) => {
              const isFree = Number(tariff?.price ?? 0) === 0
              const features = isFree
                ? [
                    'Создание заявок без ограничений',
                    'Ведение клиентов без ограничений',
                    'Учет полученных оплат от клиентов',
                  ]
                : [
                    'Все что в бесплатном тарифе',
                    'Синхронизация с Google календарем',
                    'Просмотр статистики',
                    'Счета и чеки по мероприятиям',
                  ]
              return (
              <div
                key={tariff._id}
                className={`landing-reveal rounded-3xl border ${
                  index % 2 === 0
                    ? 'home-panel border-gray-200/70 bg-white'
                    : 'home-panel border-general/30 bg-gradient-to-br from-general/10 via-white to-white'
                } p-8 shadow-lg`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-2xl font-semibold text-black font-futuraPT">
                    {tariff.title || 'Тариф'}
                  </h3>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-general/15 text-general">
                    {formatPrice(tariff.price)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {formatEventsLimit(tariff.eventsPerMonth)}
                </p>
                <ul className="mt-6 space-y-3 text-sm text-gray-700">
                  {features.map((name) => (
                    <li key={name} className="flex items-start gap-3">
                      <span className="w-2 h-2 mt-1 rounded-full bg-general" />
                      <span className="font-medium text-gray-900">{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
            })
          ) : (
            <div className="home-panel p-8 text-sm text-gray-500 bg-white border shadow-lg rounded-3xl border-gray-200/70">
              Тарифы пока не настроены. Скоро здесь появятся варианты
              подписки.
            </div>
          )}
        </div>
      </section>

      <footer className="home-footer border-t border-gray-200/70 bg-white/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ArtistCRM</span>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/privacy"
              className="text-general"
              target="_blank"
              rel="noreferrer"
            >
              Политика конфиденциальности
            </Link>
            <Link
              href="/terms"
              className="text-general"
              target="_blank"
              rel="noreferrer"
            >
              Пользовательское соглашение
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
