'use client'

import { faBoxArchive, faPencilAlt } from '@fortawesome/free-solid-svg-icons'
import CardButton from '@components/CardButton'
import PartyCard, { PartyCardActions, PartyCardHeader } from '@components/party/PartyCard'

const roleLabels = {
  owner: 'Владелец',
  admin: 'Администратор',
  performer: 'Исполнитель',
}

const specializationLabels = {
  animator: 'Аниматор',
  magician: 'Фокусник',
  host: 'Ведущий',
  photographer: 'Фотограф',
  workshop: 'Мастер-класс',
  other: 'Другое',
}

const StaffCard = ({ person, canManage, onArchive, onEdit }) => {
  const displayName =
    [person.secondName, person.firstName].filter(Boolean).join(' ') ||
    person.phone ||
    person.email ||
    'Без имени'

  return (
    <PartyCard onClick={() => onEdit && onEdit(person)}>
      <PartyCardHeader>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{displayName}</p>
          <p className="mt-1 text-sm text-black/60">
            {roleLabels[person.role] || person.role} ·{' '}
            {[person.phone, person.email].filter(Boolean).join(' · ') ||
              'контакты не указаны'}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {!person.authUserId && (
              <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-700">
                Подрядчик без аккаунта
              </span>
            )}
            {person.specialization && (
              <span className="px-2 py-1 text-xs font-semibold rounded bg-sky-50 text-sky-700">
                {specializationLabels[person.specialization] || person.specialization}
              </span>
            )}
          </div>
          {person.description && (
            <p className="mt-2 text-sm leading-6 text-slate-500 line-clamp-2">
              {person.description}
            </p>
          )}
        </div>
        {canManage && (
          <PartyCardActions>
            <CardButton
              icon={faPencilAlt}
              onClick={() => onEdit && onEdit(person)}
              color="blue"
              tooltipText="Редактировать"
            />
            <CardButton
              icon={faBoxArchive}
              onClick={() => onArchive(person._id)}
              color="red"
              tooltipText="Архив"
            />
          </PartyCardActions>
        )}
      </PartyCardHeader>
    </PartyCard>
  )
}

export default function StaffList({
  staff,
  canManage,
  onArchive,
  onEdit,
  onCreateClick,
  staffCount,
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Сотрудники</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-black/55">{staffCount}</span>
          {canManage && (
            <button
              type="button"
              onClick={onCreateClick}
              className="grid h-10 w-10 place-items-center rounded-md bg-sky-600 text-2xl font-semibold leading-none text-white transition-colors hover:bg-sky-700"
              aria-label="Добавить сотрудника"
              title="Добавить сотрудника"
            >
              +
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 mt-5">
        {staff.length === 0 && (
          <p className="text-sm text-black/55">Сотрудники еще не добавлены.</p>
        )}
        {staff.map((person) => (
          <StaffCard
            key={person._id}
            person={person}
            canManage={canManage}
            onArchive={onArchive}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  )
}
