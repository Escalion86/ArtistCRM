import LabeledContainer from '@components/LabeledContainer'
import {
  faClipboard,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons'
import IconActionButton from '@components/IconActionButton'
import {
  getClipboardLinkAddResult,
  isClickableLink,
} from '@helpers/linksListEditor'

const LinksListEditor = ({ label, links = [], onChange, noMargin = false }) => {
  const safeLinks = Array.isArray(links) ? links : []

  const handleRemoveLink = (index) => {
    if (!window.confirm('Удалить ссылку?')) return
    onChange?.(safeLinks.filter((_, idx) => idx !== index))
  }

  const handleAddLink = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      const result = getClipboardLinkAddResult({
        links: safeLinks,
        clipboardText,
      })

      if (!result.ok) {
        window.alert(result.error)
        return
      }

      onChange?.(result.links)
    } catch {
      window.alert('Не удалось прочитать буфер обмена')
    }
  }

  return (
    <LabeledContainer label={label} noMargin={noMargin}>
      <div className="flex flex-col gap-2">
        {safeLinks.map((link, index) => (
          <div
            key={`${label}-link-${index}`}
            className="flex items-center gap-2"
          >
            <div className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm text-gray-900">
              {isClickableLink(link) ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-general block truncate underline"
                  title={link}
                >
                  {link}
                </a>
              ) : (
                <span className="block truncate" title={link}>
                  {link}
                </span>
              )}
            </div>
            <IconActionButton
              icon={faTrashAlt}
              onClick={() => handleRemoveLink(index)}
              title="Удалить ссылку"
              variant="danger"
              size="xs"
            />
          </div>
        ))}
        <IconActionButton
          icon={faClipboard}
          onClick={handleAddLink}
          title="Вставить ссылку из буфера обмена"
          label="Из буфера"
          size="xs"
          variant="success"
          className="w-fit px-2"
        />
      </div>
    </LabeledContainer>
  )
}

export default LinksListEditor
