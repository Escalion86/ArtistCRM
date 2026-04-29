self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      let registration = self.registration
      if (!registration?.pushManager) return

      let currentSubscription = event.newSubscription || null

      if (!currentSubscription) {
        try {
          const keyResponse = await fetch('/api/push/public-key', {
            method: 'GET',
            headers: { Accept: 'application/json' },
          })
          const keyPayload = await keyResponse.json().catch(() => ({}))
          const publicKey = keyPayload?.data?.publicKey
          if (!keyResponse.ok || !publicKey) return

          const padding = '='.repeat((4 - (publicKey.length % 4)) % 4)
          const base64 = (publicKey + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/')
          const rawData = atob(base64)
          const outputArray = new Uint8Array(rawData.length)

          for (let i = 0; i < rawData.length; i += 1) {
            outputArray[i] = rawData.charCodeAt(i)
          }

          currentSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: outputArray,
          })
        } catch (error) {
          return
        }
      }

      if (!currentSubscription) return

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ subscription: currentSubscription.toJSON() }),
      }).catch(() => null)
    })()
  )
})

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
    renotify: Boolean(payload?.renotify),
    requireInteraction: Boolean(payload?.requireInteraction),
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
