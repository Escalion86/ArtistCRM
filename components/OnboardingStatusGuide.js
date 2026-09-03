import Notice from '@components/Notice'
import { getFirstRunStatusEducationItems } from '@helpers/firstRunWizard.mjs'

const statusItems = getFirstRunStatusEducationItems()

const OnboardingStatusGuide = () => (
  <Notice tone="neutral" className="cursor-default rounded-md">
    <h3 className="font-semibold">Краткая справка по статусам</h3>
    <p className="mt-1">
      Здесь ничего выбирать не нужно. Ознакомьтесь с пояснениями и нажмите
      «Далее».
    </p>
    <p className="mt-3">
      Обычный путь: Заявка → Подтверждено → Закрыто. Если заказ сорвался —
      Отменено.
    </p>
    <dl className="mt-4 space-y-4">
      {statusItems.map((item) => (
        <div key={item.status}>
          <dt className="font-semibold">{item.title}</dt>
          <dd className="mt-1">{item.description}</dd>
        </div>
      ))}
    </dl>
  </Notice>
)

export default OnboardingStatusGuide
