import Input from '@components/Input'
import InputWrapper from '@components/InputWrapper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons/faPencilAlt'
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus'

const OtherContactsPicker = ({
  contacts = [],
  clients = [],
  onSelectContact,
  onChangeComment,
  onRemoveContact,
  onEditContact,
  onAddContact,
  label = 'Прочие контакты',
}) => (
  <InputWrapper label={label} fullWidth centerLabel>
    <div className="flex w-full flex-col gap-2">
      {contacts.map((contact, index) => {
        const contactClient = clients.find(
          (client) => client._id === contact.clientId
        )
        const contactName =
          [contactClient?.firstName, contactClient?.secondName]
            .filter(Boolean)
            .join(' ') || 'Выберите клиента'
        return (
          <div
            key={`other-contact-${index}`}
            className="tablet:flex-row tablet:items-start flex gap-2 rounded border border-gray-200 bg-gray-50 p-2"
          >
            <div className="tablet:grid tablet:grid-cols-2 flex w-full flex-1 flex-col gap-2">
              <button
                type="button"
                className="hover:shadow-card flex w-full cursor-pointer items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition"
                onClick={() => onSelectContact?.(index)}
              >
                <span className="font-semibold text-gray-900">
                  {contactName}
                </span>
                <span className="text-xs text-gray-500">
                  {contactClient?.phone
                    ? `+${contactClient.phone}`
                    : 'Телефон не указан'}
                </span>
              </button>
              <Input
                label="Кем является"
                value={contact.comment}
                onChange={(value) => onChangeComment?.(index, value)}
                noMargin
                fullWidth
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="action-icon-button flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-orange-600 bg-orange-50 text-orange-500 shadow-sm transition hover:bg-orange-100 hover:text-orange-600"
                onClick={() => onEditContact?.(index)}
                title="Редактировать клиента"
              >
                <FontAwesomeIcon icon={faPencilAlt} className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="action-icon-button flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-red-200 text-red-600 transition hover:bg-red-50"
                onClick={() => onRemoveContact?.(index)}
                title="Удалить"
              >
                <FontAwesomeIcon icon={faTrashAlt} className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
      {/* <button
        type="button"
        className="px-3 text-sm font-semibold text-gray-700 transition bg-white border border-gray-300 rounded shadow-sm cursor-pointer h-9 w-fit hover:bg-gray-50"
        onClick={onAddContact}
      >
        Добавить контакт
      </button> */}
      <div className="flex w-full justify-end">
        <button
          type="button"
          className="action-icon-button flex h-10 w-10 cursor-pointer items-center justify-center rounded border border-emerald-600 bg-emerald-50 text-emerald-600 shadow-sm transition hover:bg-emerald-100 hover:text-emerald-700"
          onClick={onAddContact}
          title="Добавить контакт"
        >
          <FontAwesomeIcon className="h-5 w-5" icon={faPlus} />
        </button>
      </div>
    </div>
  </InputWrapper>
)

export default OtherContactsPicker
