import isObject from '@helpers/isObject'
import Button from '@components/Button'
import Divider from '@components/Divider'

const ModalButtons = ({
  confirmName = 'Подтвердить',
  confirmName2 = 'Действие',
  declineName = 'Отмена',
  closeButtonName = 'Закрыть',
  onConfirmClick,
  onConfirm2Click,
  onDeclineClick,
  // showConfirm = true,
  // showConfirm2,
  // showDecline,
  disableConfirm = false,
  disableDecline = false,
  children,
  closeButtonShow,
  declineButtonShow,
  closeModal,
  bottomLeftButton,
  bottomLeftComponent,
  declineButtonBgClassName = 'bg-danger',
}) => {
  if (
    !onConfirmClick &&
    !onConfirm2Click &&
    !onDeclineClick &&
    !closeButtonShow
  )
    return null

  return (
    <>
      <Divider light thin />
      <div className="flex flex-wrap justify-between px-2 tablet:px-3 tablet:pt-1">
        {children}
        <div className="flex flex-1 flex-wrap justify-end gap-1 tablet:gap-x-2">
          {isObject(bottomLeftButton) ? (
            <div className="flex-1">{<Button {...bottomLeftButton} />}</div>
          ) : null}
          {isObject(bottomLeftComponent) ? (
            <div className="flex-1">{bottomLeftComponent}</div>
          ) : null}
          {onConfirm2Click && (
            <Button
              name={confirmName2}
              classBgColor="bg-general"
              className="modal-action-button"
              onClick={onConfirm2Click}
              disabled={disableConfirm}
            />
          )}
          {onConfirmClick && (
            <Button
              name={confirmName}
              classBgColor="bg-general"
              className="modal-action-button"
              onClick={onConfirmClick}
              disabled={disableConfirm}
            />
          )}
          {declineButtonShow &&
          (onConfirmClick || onConfirm2Click || onDeclineClick) ? (
            <Button
              name={declineName}
              classBgColor={declineButtonBgClassName}
              className="modal-action-button"
              onClick={
                typeof onDeclineClick === 'function'
                  ? onDeclineClick
                  : closeModal
              }
              disabled={disableDecline}
            />
          ) : (
            closeButtonShow && (
              <Button
                name={closeButtonName}
                classBgColor="bg-general"
                className="modal-action-button"
                onClick={closeModal}
              />
            )
          )}
        </div>
      </div>
    </>
  )
}

export default ModalButtons
