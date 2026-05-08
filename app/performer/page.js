import Link from 'next/link'

export const metadata = {
  title: 'PartyCRM - кабинет исполнителя',
  robots: {
    index: false,
    follow: false,
  },
}

export default function PerformerPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#171512]">
      <header className="border-b border-black/10 bg-white">
        <div className="flex items-center justify-between max-w-5xl px-5 py-4 mx-auto">
          <Link href="/party" className="text-lg font-semibold cursor-pointer">
            PartyCRM
          </Link>
          <Link href="/company" className="cursor-pointer ui-btn ui-btn-secondary">
            Кабинет компании
          </Link>
        </div>
      </header>

      <section className="max-w-5xl px-5 py-10 mx-auto">
        <p className="text-sm font-semibold uppercase text-general">
          Performer workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold font-futuraPT sm:text-4xl">
          Кабинет исполнителя
        </h1>
        <p className="max-w-2xl mt-4 leading-7 text-black/70">
          Здесь будет отдельный рабочий интерфейс исполнителя: только назначенные
          события, время, адрес, программа, комментарий администратора и сумма
          выплаты исполнителю без полной клиентской сметы.
        </p>

        <div className="mt-8 overflow-hidden bg-white border rounded-lg border-black/10">
          <div className="grid gap-px bg-black/10 sm:grid-cols-3">
            {[
              ['Сегодня', '2 заказа'],
              ['Завтра', '1 заказ'],
              ['К выплате', '8 000 ₽'],
            ].map(([title, value]) => (
              <div key={title} className="p-5 bg-white">
                <p className="text-sm text-black/55">{title}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
