import AppButton from '@components/AppButton'
import Notice from '@components/Notice'

const RequisitesWarning = ({
  missingArtistRequisites = false,
  missingClientRequisites = false,
  onEditArtistRequisites,
  onEditClient,
  canEditClient = false,
}) => {
  if (!missingArtistRequisites && !missingClientRequisites) return null

  return (
    <Notice tone="error" className="flex flex-col gap-2 rounded">
      {missingArtistRequisites ? (
        <div className="text-xs">
          Необходимо заполнить реквизиты артиста
        </div>
      ) : null}
      {missingClientRequisites ? (
        <div className="text-xs">
          Необходимо заполнить реквизиты в карточке клиента
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {missingArtistRequisites ? (
          <AppButton
            variant="danger"
            size="sm"
            className="rounded"
            onClick={onEditArtistRequisites}
          >
            Редактировать реквизиты
          </AppButton>
        ) : null}
        {missingClientRequisites ? (
          <AppButton
            variant="danger"
            size="sm"
            className="rounded"
            disabled={!canEditClient}
            onClick={canEditClient ? onEditClient : undefined}
          >
            Редактировать клиента
          </AppButton>
        ) : null}
      </div>
    </Notice>
  )
}

export default RequisitesWarning

