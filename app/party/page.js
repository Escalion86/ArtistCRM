import Link from 'next/link'

const rawPartyDomain = process.env.PARTYCRM_DOMAIN || 'partycrm.ru'
const partyUrl = rawPartyDomain.startsWith('http')
  ? rawPartyDomain
  : `https://${rawPartyDomain}`

export const metadata = {
  title: 'PartyCRM - CRM для праздничных агентств и event-команд',
  description:
    'PartyCRM помогает компаниям управлять заявками, площадками, администраторами, исполнителями, бронированиями и оплатами.',
  alternates: {
    canonical: `${partyUrl.replace(/\/$/, '')}/`,
  },
  robots: {
    index: true,
    follow: true,
  },
}

const featureGroups = [
  {
    title: 'Заявки',
    text: 'Единый поток заказов, клиентов, предоплат и документов.',
  },
  {
    title: 'Площадки',
    text: 'Точки, залы, выездные адреса и контроль пересечений.',
  },
  {
    title: 'Команда',
    text: 'Администраторы, исполнители, назначения и выплаты.',
  },
]

export default function PartyCrmLandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#171512]">
      <header className="border-b border-black/10 bg-white">
        <div className="flex items-center justify-between max-w-6xl px-5 py-4 mx-auto">
          <Link href="/party" className="text-lg font-semibold cursor-pointer">
            PartyCRM
          </Link>
          <Link href="/company" className="cursor-pointer ui-btn ui-btn-primary">
            Кабинет компании
          </Link>
        </div>
      </header>

      <section className="max-w-6xl px-5 py-12 mx-auto">
        <p className="text-sm font-semibold uppercase text-general">
          CRM для event-компаний
        </p>
        <h1 className="max-w-3xl mt-4 text-4xl font-semibold leading-tight font-futuraPT sm:text-5xl">
          Управление заявками, площадками и исполнителями в одном кабинете
        </h1>
        <p className="max-w-2xl mt-5 text-base leading-7 text-black/70 sm:text-lg">
          PartyCRM создается как отдельный продукт для праздничных агентств,
          детских игровых, фотостудий, площадок и команд, где важно
          контролировать бронирования, роли, оплаты и подготовку заказов.
        </p>

        <div className="flex flex-col gap-3 mt-8 sm:flex-row">
          <Link href="/company" className="cursor-pointer ui-btn ui-btn-primary">
            Открыть company preview
          </Link>
          <Link href="/performer" className="cursor-pointer ui-btn ui-btn-secondary">
            Кабинет исполнителя
          </Link>
        </div>
      </section>

      <section className="bg-white border-y border-black/10">
        <div className="grid max-w-6xl gap-4 px-5 py-10 mx-auto md:grid-cols-3">
          {featureGroups.map((item) => (
            <div key={item.title} className="p-5 border rounded-lg border-black/10">
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-black/65">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
