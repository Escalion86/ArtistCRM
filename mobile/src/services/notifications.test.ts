import { resolveNotificationUrl } from './notifications'

describe('support notification navigation', () => {
  test('prefers mobileUrl for support ticket notifications', () => {
    expect(resolveNotificationUrl({
      url: '/cabinet/feedback?ticketId=123',
      mobileUrl: '/support/123',
    })).toBe('/support/123')
  })

  test('keeps legacy url navigation working', () => {
    expect(resolveNotificationUrl({ url: '/events/123' })).toBe('/events/123')
  })
})
