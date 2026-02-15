import InputWrapper from '@components/InputWrapper'
import { faPlus, faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const LinksListEditor = ({ label, links = [], onChange, noMargin = false }) => {
  const safeLinks = Array.isArray(links) ? links : []

  const handleUpdateLink = (index, value) => {
    onChange?.(safeLinks.map((item, idx) => (idx === index ? value : item)))
  }

  const handleRemoveLink = (index) => {
    onChange?.(safeLinks.filter((_, idx) => idx !== index))
  }

  const handleAddLink = () => {
    onChange?.([...safeLinks, ''])
  }

  return (
    <InputWrapper label={label} noMargin={noMargin}>
      <div className="flex flex-col gap-2">
        {safeLinks.map((link, index) => (
          <div key={`${label}-link-${index}`} className="flex items-center gap-2">
            <input
              className="focus:border-general h-8 w-full rounded border border-gray-200 px-2 text-sm text-gray-900 focus:outline-none"
              type="text"
              value={link}
              placeholder="Введите ссылку"
              onChange={(event) => handleUpdateLink(index, event.target.value)}
            />
            <button
              type="button"
              className="action-icon-button action-icon-button--danger flex h-8 w-8 cursor-pointer items-center justify-center rounded"
              onClick={() => handleRemoveLink(index)}
              title="Удалить ссылку"
            >
              <FontAwesomeIcon icon={faTrashAlt} className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="action-icon-button action-icon-button--success flex h-8 w-8 cursor-pointer items-center justify-center rounded"
          onClick={handleAddLink}
          title="Добавить ссылку"
        >
          <FontAwesomeIcon className="h-4 w-4" icon={faPlus} />
        </button>
      </div>
    </InputWrapper>
  )
}

export default LinksListEditor

