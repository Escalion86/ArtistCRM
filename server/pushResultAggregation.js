export const aggregatePushResults = (web = {}, expo = {}) => ({
  ok: Boolean(web?.ok || expo?.ok),
  sent: Number(web?.sent || 0) + Number(expo?.sent || 0),
  failed: Number(web?.failed || 0) + Number(expo?.failed || 0),
  deactivated: Number(web?.deactivated || 0) + Number(expo?.invalid || 0),
  channels: {
    web: {
      ok: Boolean(web?.ok),
      sent: Number(web?.sent || 0),
      failed: Number(web?.failed || 0),
    },
    expo: {
      ok: Boolean(expo?.ok),
      sent: Number(expo?.sent || 0),
      failed: Number(expo?.failed || 0),
    },
  },
})
