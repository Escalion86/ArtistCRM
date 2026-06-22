export const shouldShowAdditionalEventsAction = ({
  typeOfItem,
  status,
  enabled = true,
}) => enabled && typeOfItem === 'event' && status !== 'closed'
