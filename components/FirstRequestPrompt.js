'use client'

import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import { modalsFuncAtom } from '@state/atoms'
import eventsAtom from '@state/atoms/eventsAtom'
import siteSettingsAtom from '@state/atoms/siteSettingsAtom'
import { getData } from '@helpers/CRUD'

export default function FirstRequestPrompt() {
  const events = useAtomValue(eventsAtom)
  const settings = useAtomValue(siteSettingsAtom)
  const modals = useAtomValue(modalsFuncAtom)
  const [empty, setEmpty] = useState(false)
  const eligible =
    settings?.custom?.firstRunWizardCompleted === true &&
    settings?.custom?.firstRunWizardStep === null &&
    Array.isArray(events) &&
    events.length === 0
  useEffect(() => {
    if (!eligible) return
    let active = true
    // The attention page only loads upcoming events; check the past as well.
    getData(
      '/api/events',
      { scope: 'past', countOnly: '1' },
      null,
      null,
      true
    ).then((result) => {
      if (active) setEmpty(result?.meta?.totalCount === 0)
    })
    return () => {
      active = false
    }
  }, [eligible])
  if (!eligible || !empty) return null
  return (
    <section className="first-run first-run-card mb-4 flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Начните со своей первой заявки</h2>
      <p className="text-sm">
        Сохраните запрос клиента и назначьте следующий контакт. Здесь появятся
        ваши ближайшие действия.
      </p>
      <button
        className="first-run-primary"
        type="button"
        disabled={!modals.event?.create}
        onClick={() => modals.event.create('draft')}
      >
        Создать свою первую заявку
      </button>
      <button
        className="first-run-link self-start"
        type="button"
        onClick={() => modals.user?.firstRunTour?.()}
      >
        Посмотреть учебный пример
      </button>
    </section>
  )
}
