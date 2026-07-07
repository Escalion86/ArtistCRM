export const moveServicesFromGroupToUngrouped = (services, groupId) => {
  if (!Array.isArray(services) || !groupId) return services

  return services.map((service) =>
    String(service?.groupId || '') === String(groupId)
      ? { ...service, groupId: null }
      : service
  )
}
