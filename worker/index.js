self.addEventListener('push', (event) => {
  let payload = {}

  try {
    payload = event.data ? event.data.json() : {}
  } catch (error) {
    payload = {
      title: 'Новое уведомление',
      body: event.data ? String(event.data.text()) : '',
    }
  }

  const title = payload?.title || 'Новое уведомление'
  const options = {
    body: payload?.body || '',
    icon: payload?.icon || '/icons/AppImages/android/android-launchericon-192-192.png',
    badge:
      payload?.badge || '/icons/AppImages/android/android-launchericon-192-192.png',
    tag: payload?.tag || undefined,
    data: payload?.data || {},
    renotify: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event?.notification?.data?.url || '/cabinet/eventsUpcoming'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(
      (clients) => {
        const sameClient = clients.find((client) => {
          if (!client || !client.url) return false
          try {
            const clientUrl = new URL(client.url)
            const nextUrl = new URL(targetUrl, self.location.origin)
            return clientUrl.origin === nextUrl.origin
          } catch (error) {
            return false
          }
        })

        if (sameClient) {
          sameClient.focus()
          if (targetUrl) sameClient.navigate(targetUrl)
          return null
        }

        return self.clients.openWindow(targetUrl)
      }
    )
  )
})
