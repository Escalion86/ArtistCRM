export const shouldShowAdditionalEventsAction = ({
  typeOfItem,
  status,
}) => typeOfItem === 'event' && status !== 'closed'
