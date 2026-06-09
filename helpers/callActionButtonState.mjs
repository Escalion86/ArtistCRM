export const getCallActionButtonState = ({
  activeAction,
  callId,
  type,
  idleLabel,
  loadingLabel,
  disabled = false,
}) => {
  const isLoading =
    Boolean(activeAction?.callId) &&
    String(activeAction.callId) === String(callId) &&
    activeAction.type === type

  return {
    isLoading,
    disabled: disabled || isLoading,
    label: isLoading ? loadingLabel : idleLabel,
  }
}
