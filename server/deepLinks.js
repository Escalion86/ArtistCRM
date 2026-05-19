/**
 * Server-side Deep Link URL Builder
 *
 * Generates deep link URLs for push notifications and other server-side uses.
 * Follows the schema defined in DEEP_LINK_SCHEMA.md.
 */

const BASE_URL = process.env.DEEP_LINK_BASE_URL || 'https://crm.escalion.ru'
const VERSION = 'v1'

/**
 * Build a deep link URL for an event card.
 * @param {string} eventId - MongoDB ObjectId of the event
 * @param {string} orgId - Organization/tenant identifier
 * @param {object} [options] - Optional params
 * @param {string} [options.tab] - Tab to open: details, lineup, guests
 * @param {string} [options.date] - ISO date (YYYY-MM-DD) to scroll to
 * @returns {string} Deep link URL
 */
export const buildEventDeepLink = (eventId, orgId, options = {}) => {
  if (!eventId) return null
  const params = new URLSearchParams()
  params.set('event_id', String(eventId))
  if (orgId) params.set('org_id', String(orgId))
  if (options.tab) params.set('tab', options.tab)
  if (options.date) params.set('date', options.date)
  return `${BASE_URL}/${VERSION}/event?${params.toString()}`
}

/**
 * Build a deep link URL for a request card.
 * @param {string} requestId - MongoDB ObjectId of the request (draft event)
 * @param {string} orgId - Organization/tenant identifier
 * @param {object} [options] - Optional params
 * @param {string} [options.tab] - Tab to open: details, chat, history
 * @param {string} [options.action] - Pre-trigger action: accept, decline, assign
 * @returns {string} Deep link URL
 */
export const buildRequestDeepLink = (requestId, orgId, options = {}) => {
  if (!requestId) return null
  const params = new URLSearchParams()
  params.set('request_id', String(requestId))
  if (orgId) params.set('org_id', String(orgId))
  if (options.tab) params.set('tab', options.tab)
  if (options.action) params.set('action', options.action)
  return `${BASE_URL}/${VERSION}/request?${params.toString()}`
}

/**
 * Build a deep link URL for a push notification payload.
 * Uses the web URL format that the service worker can navigate to.
 * Falls back to relative URL if orgId is not available.
 * @param {string} eventId - MongoDB ObjectId
 * @param {string} [orgId] - Organization/tenant identifier
 * @param {string} [resource='event'] - Resource type: event or request
 * @returns {string} URL for push notification data.url
 */
export const buildPushDeepLinkUrl = (eventId, orgId, resource = 'event') => {
  if (!eventId) return '/cabinet/eventsUpcoming'
  if (orgId) {
    return buildEventDeepLink(eventId, orgId)
  }
  return `/cabinet/eventsUpcoming?openEvent=${eventId}`
}
