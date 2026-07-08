const normalizeId = (value) => (value ? String(value) : '')

export const applyUserEventStats = (users = [], stats = []) => {
  const statsByTenantId = new Map()

  ;(Array.isArray(stats) ? stats : []).forEach((item) => {
    const tenantId = normalizeId(item?.tenantId)
    if (!tenantId) return

    const current = statsByTenantId.get(tenantId) ?? {
      eventsCount: 0,
      requestsCount: 0,
    }
    const count = Number(item?.count ?? 0)

    if (item?.status === 'draft') {
      current.requestsCount += Number.isFinite(count) ? count : 0
    } else {
      current.eventsCount += Number.isFinite(count) ? count : 0
    }

    statsByTenantId.set(tenantId, current)
  })

  return (Array.isArray(users) ? users : []).map((user) => {
    const counts = statsByTenantId.get(normalizeId(user?._id)) ?? {
      eventsCount: 0,
      requestsCount: 0,
    }

    return {
      ...user,
      eventsCount: counts.eventsCount,
      requestsCount: counts.requestsCount,
    }
  })
}
