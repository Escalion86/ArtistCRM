const withoutDateQuery = {
  $and: [
    { $or: [{ dateEnd: null }, { dateEnd: { $exists: false } }] },
    { $or: [{ eventDate: null }, { eventDate: { $exists: false } }] },
  ],
}

export const buildPastCompletionQuery = (cutoffDate) => ({
  $or: [
    { dateEnd: { $lt: cutoffDate } },
    {
      $and: [
        { $or: [{ dateEnd: null }, { dateEnd: { $exists: false } }] },
        { eventDate: { $lt: cutoffDate } },
      ],
    },
    {
      $and: [{ status: 'canceled' }, ...withoutDateQuery.$and],
    },
  ],
})

export const buildUpcomingCompletionQuery = (nowDate) => ({
  $and: [
    { status: { $ne: 'canceled' } },
    {
      $or: [
        { dateEnd: { $gte: nowDate } },
        {
          $and: [
            { $or: [{ dateEnd: null }, { dateEnd: { $exists: false } }] },
            { eventDate: { $gte: nowDate } },
          ],
        },
        withoutDateQuery,
      ],
    },
  ],
})
