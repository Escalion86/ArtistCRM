import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLink, faUnlink } from '@fortawesome/free-solid-svg-icons'
import windowDimensionsNumSelector from '@state/selectors/windowDimensionsNumSelector'
import { useAtomValue } from 'jotai'

const TransactionRelationToggleButtons = ({ value, onChange }) => {
  const windowDimensionsNum = useAtomValue(windowDimensionsNumSelector)

  const handleToggle = (key) => {
    const next = { ...value, [key]: !value[key] }
    if (!next.linked && !next.unlinked) {
      const fallbackKey = key === 'linked' ? 'unlinked' : 'linked'
      next[fallbackKey] = true
    }
    onChange(next)
  }

  return (
    <ButtonGroup size={windowDimensionsNum < 2 ? 'small' : undefined}>
      <Button
        onClick={() => handleToggle('linked')}
        variant={value.linked ? 'contained' : 'outlined'}
        color="inherit"
        sx={{
          color: value.linked ? '#ffffff' : '#2563eb',
          borderColor: '#2563eb',
          backgroundColor: value.linked ? '#2563eb' : 'transparent',
          '&:hover': {
            borderColor: '#1d4ed8',
            backgroundColor: value.linked ? '#1d4ed8' : '#eff6ff',
          },
        }}
      >
        <span className="flex items-center gap-1.5">
          <FontAwesomeIcon icon={faLink} className="h-3.5 w-3.5" />
          Связь
        </span>
      </Button>
      <Button
        onClick={() => handleToggle('unlinked')}
        variant={value.unlinked ? 'contained' : 'outlined'}
        color="inherit"
        sx={{
          color: value.unlinked ? '#ffffff' : '#64748b',
          borderColor: '#64748b',
          backgroundColor: value.unlinked ? '#64748b' : 'transparent',
          '&:hover': {
            borderColor: '#475569',
            backgroundColor: value.unlinked ? '#475569' : '#f8fafc',
          },
        }}
      >
        <span className="flex items-center gap-1.5">
          <FontAwesomeIcon icon={faUnlink} className="h-3.5 w-3.5" />
          Без связи
        </span>
      </Button>
    </ButtonGroup>
  )
}

export default TransactionRelationToggleButtons
