import test from 'node:test'
import assert from 'node:assert/strict'

const originalNavigator = global.navigator
const originalWindow = global.window

const setGlobalValue = (key, value) => {
  Object.defineProperty(global, key, {
    configurable: true,
    writable: true,
    value,
  })
}

const restoreGlobals = () => {
  setGlobalValue('navigator', originalNavigator)
  setGlobalValue('window', originalWindow)
}

test.afterEach(() => {
  restoreGlobals()
  delete process.env.NODE_ENV
})

test('getPushRegistration returns existing registration when serviceWorker.ready never resolves', async () => {
  process.env.NODE_ENV = 'production'

  const existingRegistration = {
    active: { state: 'activated' },
    pushManager: {
      getSubscription: async () => null,
    },
  }

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: function Notification() {},
    setTimeout,
    clearTimeout,
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      getRegistration: async () => existingRegistration,
      register: async () => null,
      ready: new Promise(() => {}),
    },
  })

  const { getPushRegistration } = await import(`./pushClient.js?test=${Date.now()}`)
  const result = await Promise.race([
    getPushRegistration(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('getPushRegistration timed out')), 50)
    ),
  ])

  assert.equal(result, existingRegistration)
})

test('getPushRegistration prefers ready registration when it becomes active', async () => {
  process.env.NODE_ENV = 'production'

  const readyRegistration = {
    active: { state: 'activated' },
    pushManager: {
      getSubscription: async () => null,
    },
  }

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: function Notification() {},
    setTimeout,
    clearTimeout,
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      getRegistration: async () => null,
      register: async () => null,
      ready: Promise.resolve(readyRegistration),
    },
  })

  const { getPushRegistration } = await import(`./pushClient.js?test=${Date.now()}`)
  const result = await getPushRegistration()

  assert.equal(result, readyRegistration)
})

test('getPushRegistration waits for a newly registered service worker to activate', async () => {
  process.env.NODE_ENV = 'production'

  const listeners = new Map()
  const installingWorker = {
    state: 'installing',
    addEventListener: (event, handler) => {
      listeners.set(event, handler)
    },
    removeEventListener: (event) => {
      listeners.delete(event)
    },
  }
  const registeredWorker = {
    pushManager: {
      getSubscription: async () => null,
    },
    installing: installingWorker,
    waiting: null,
    active: null,
  }

  const originalSetTimeout = setTimeout
  const originalClearTimeout = clearTimeout

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: function Notification() {},
    setTimeout: (handler, timeout, ...args) =>
      originalSetTimeout(handler, timeout === 3000 ? 5 : timeout, ...args),
    clearTimeout: originalClearTimeout,
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      getRegistration: async () => null,
      register: async () => registeredWorker,
      ready: new Promise((resolve) => {
        originalSetTimeout(() => {
          registeredWorker.active = { state: 'activated' }
          installingWorker.state = 'activated'
          const stateChange = listeners.get('statechange')
          if (stateChange) stateChange()
          resolve(registeredWorker)
        }, 15)
      }),
    },
  })

  const { getPushRegistration } = await import(`./pushClient.js?test=${Date.now()}`)
  const result = await getPushRegistration()

  assert.equal(result, registeredWorker)
})

test('getPushRegistrationWithDetails returns registration failure reason', async () => {
  process.env.NODE_ENV = 'production'

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: function Notification() {},
    setTimeout,
    clearTimeout,
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      getRegistration: async () => null,
      register: async () => {
        throw new Error('script evaluation failed')
      },
      ready: Promise.resolve(null),
    },
  })

  const { getPushRegistrationWithDetails } = await import(
    `./pushClient.js?test=${Date.now()}`
  )
  const result = await getPushRegistrationWithDetails()

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'registration_failed')
  assert.match(result.message, /script evaluation failed/i)
})

test('getPushRegistrationWithDetails returns activation timeout reason', async () => {
  process.env.NODE_ENV = 'production'

  const registeredWorker = {
    pushManager: {
      getSubscription: async () => null,
    },
    installing: {
      state: 'installing',
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    waiting: null,
    active: null,
  }

  const originalSetTimeout = setTimeout
  const originalClearTimeout = clearTimeout

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: function Notification() {},
    setTimeout: (handler, timeout, ...args) =>
      originalSetTimeout(handler, timeout === 60000 ? 5 : timeout, ...args),
    clearTimeout: originalClearTimeout,
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      getRegistration: async () => null,
      register: async () => registeredWorker,
      ready: new Promise(() => {}),
    },
  })

  const { getPushRegistrationWithDetails } = await import(
    `./pushClient.js?test=${Date.now()}`
  )
  const result = await getPushRegistrationWithDetails()

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'activation_timeout')
  assert.match(result.message, /не активировался/i)
})

test('getPushRegistrationWithDetails includes service worker states in activation timeout message', async () => {
  process.env.NODE_ENV = 'production'

  const registeredWorker = {
    scope: 'https://artistcrm.ru/',
    pushManager: {
      getSubscription: async () => null,
    },
    installing: {
      state: 'installing',
      scriptURL: 'https://artistcrm.ru/sw.js',
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    waiting: null,
    active: null,
  }

  const originalSetTimeout = setTimeout
  const originalClearTimeout = clearTimeout

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: function Notification() {},
    location: {
      href: 'https://artistcrm.ru/cabinet/notifications',
      origin: 'https://artistcrm.ru',
    },
    setTimeout: (handler, timeout, ...args) => {
      if (timeout === 250) return originalSetTimeout(handler, 1, ...args)
      if (timeout === 60000) return originalSetTimeout(handler, 5, ...args)
      return originalSetTimeout(handler, timeout, ...args)
    },
    clearTimeout: originalClearTimeout,
  })
  setGlobalValue('location', {
    href: 'https://artistcrm.ru/cabinet/notifications',
    origin: 'https://artistcrm.ru',
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      controller: null,
      getRegistration: async () => registeredWorker,
      getRegistrations: async () => [registeredWorker],
      register: async () => registeredWorker,
      ready: new Promise(() => {}),
    },
  })

  const { getPushRegistrationWithDetails } = await import(
    `./pushClient.js?test=${Date.now()}`
  )
  const result = await getPushRegistrationWithDetails()

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'activation_timeout')
  assert.match(result.message, /installing=installing/i)
  assert.match(result.message, /waiting=нет/i)
  assert.match(result.message, /active=нет/i)
  assert.match(result.message, /controller=нет/i)
})

test('getPushRegistrationWithDetails replaces empty stale registration before waiting for activation', async () => {
  process.env.NODE_ENV = 'production'

  let unregisterCalled = false
  let registerCalled = false
  const staleRegistration = {
    scope: 'https://artistcrm.ru/',
    active: null,
    waiting: null,
    installing: null,
    pushManager: {
      getSubscription: async () => null,
    },
    unregister: async () => {
      unregisterCalled = true
      return true
    },
  }
  const activeRegistration = {
    scope: 'https://artistcrm.ru/',
    active: { state: 'activated', scriptURL: 'https://artistcrm.ru/sw.js' },
    waiting: null,
    installing: null,
    pushManager: {
      getSubscription: async () => null,
    },
  }

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: function Notification() {},
    location: {
      href: 'https://artistcrm.ru/cabinet/notifications',
      origin: 'https://artistcrm.ru',
    },
    setTimeout,
    clearTimeout,
  })
  setGlobalValue('location', {
    href: 'https://artistcrm.ru/cabinet/notifications',
    origin: 'https://artistcrm.ru',
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      controller: null,
      getRegistration: async () => staleRegistration,
      getRegistrations: async () => [staleRegistration],
      register: async () => {
        registerCalled = true
        return activeRegistration
      },
      ready: Promise.resolve(activeRegistration),
    },
  })

  const { getPushRegistrationWithDetails } = await import(
    `./pushClient.js?test=${Date.now()}`
  )
  const result = await getPushRegistrationWithDetails()

  assert.equal(result.ok, true)
  assert.equal(result.registration, activeRegistration)
  assert.equal(unregisterCalled, true)
  assert.equal(registerCalled, true)
})

test('syncPushSubscription returns activation timeout without subscribe call', async () => {
  process.env.NODE_ENV = 'production'

  let subscribeCalled = false
  const registeredWorker = {
    pushManager: {
      getSubscription: async () => null,
      subscribe: async () => {
        subscribeCalled = true
        return { toJSON: () => ({}) }
      },
    },
    installing: {
      state: 'installing',
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    waiting: null,
    active: null,
  }

  const originalSetTimeout = setTimeout
  const originalClearTimeout = clearTimeout

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: {
      permission: 'granted',
    },
    setTimeout: (handler, timeout, ...args) =>
      originalSetTimeout(handler, timeout === 60000 ? 5 : timeout, ...args),
    clearTimeout: originalClearTimeout,
  })
  setGlobalValue('Notification', {
    permission: 'granted',
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      getRegistration: async () => null,
      register: async () => registeredWorker,
      ready: new Promise(() => {}),
    },
  })

  const { syncPushSubscription } = await import(`./pushClient.js?test=${Date.now()}`)
  const result = await syncPushSubscription({
    ensureLocalSubscription: true,
  })

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'activation_timeout')
  assert.equal(subscribeCalled, false)
})

test('getPushRegistrationWithDetails keeps waiting when activation is slower than old timeout', async () => {
  process.env.NODE_ENV = 'production'

  const listeners = new Map()
  const installingWorker = {
    state: 'installing',
    addEventListener: (event, handler) => {
      listeners.set(event, handler)
    },
    removeEventListener: (event) => {
      listeners.delete(event)
    },
  }
  const registeredWorker = {
    pushManager: {
      getSubscription: async () => null,
    },
    installing: installingWorker,
    waiting: null,
    active: null,
  }

  const originalSetTimeout = setTimeout
  const originalClearTimeout = clearTimeout

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: function Notification() {},
    setTimeout: (handler, timeout, ...args) => {
      if (timeout === 3000) {
        return originalSetTimeout(handler, 5, ...args)
      }
      if (timeout === 60000) {
        return originalSetTimeout(handler, 10, ...args)
      }
      return originalSetTimeout(handler, timeout, ...args)
    },
    clearTimeout: originalClearTimeout,
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      getRegistration: async () => null,
      register: async () => registeredWorker,
      ready: new Promise(() => {}),
    },
  })

  originalSetTimeout(() => {
    registeredWorker.active = { state: 'activated' }
    installingWorker.state = 'activated'
    const stateChange = listeners.get('statechange')
    if (stateChange) stateChange()
  }, 20)

  const { getPushRegistrationWithDetails } = await import(
    `./pushClient.js?test=${Date.now()}`
  )
  const result = await getPushRegistrationWithDetails()

  assert.equal(result.ok, true)
  assert.equal(result.registration, registeredWorker)
})

test('getPushRegistrationWithDetails falls back to existing registration from getRegistrations', async () => {
  process.env.NODE_ENV = 'production'

  const activeRegistration = {
    scope: 'https://artistcrm.ru/',
    active: { state: 'activated', scriptURL: 'https://artistcrm.ru/sw.js' },
    installing: null,
    waiting: null,
    pushManager: {
      getSubscription: async () => null,
    },
  }

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: function Notification() {},
    location: {
      href: 'https://artistcrm.ru/cabinet/notifications',
      origin: 'https://artistcrm.ru',
    },
    setTimeout,
    clearTimeout,
  })

  setGlobalValue('location', {
    href: 'https://artistcrm.ru/cabinet/notifications',
    origin: 'https://artistcrm.ru',
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      getRegistration: async (scope) => (scope ? null : activeRegistration),
      getRegistrations: async () => [activeRegistration],
      register: async () => null,
      ready: new Promise(() => {}),
    },
  })

  const { getPushRegistrationWithDetails } = await import(
    `./pushClient.js?test=${Date.now()}`
  )
  const result = await getPushRegistrationWithDetails()

  assert.equal(result.ok, true)
  assert.equal(result.registration, activeRegistration)
})

test('showLocalTestNotification displays notification via active service worker', async () => {
  process.env.NODE_ENV = 'production'

  let shown = null
  const activeRegistration = {
    scope: 'https://artistcrm.ru/',
    active: { state: 'activated', scriptURL: 'https://artistcrm.ru/sw.js' },
    installing: null,
    waiting: null,
    pushManager: {
      getSubscription: async () => null,
    },
    showNotification: async (title, options) => {
      shown = { title, options }
    },
  }

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: {
      permission: 'granted',
    },
    location: {
      href: 'https://artistcrm.ru/cabinet/notifications',
      origin: 'https://artistcrm.ru',
    },
    setTimeout,
    clearTimeout,
  })
  setGlobalValue('Notification', {
    permission: 'granted',
  })
  setGlobalValue('location', {
    href: 'https://artistcrm.ru/cabinet/notifications',
    origin: 'https://artistcrm.ru',
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      getRegistration: async () => activeRegistration,
      getRegistrations: async () => [activeRegistration],
      register: async () => activeRegistration,
      ready: Promise.resolve(activeRegistration),
    },
  })

  const { showLocalTestNotification } = await import(
    `./pushClient.js?test=${Date.now()}`
  )
  const result = await showLocalTestNotification()

  assert.equal(result.ok, true)
  assert.equal(shown?.title, 'Локальный тест push')
  assert.equal(shown?.options?.body, 'Проверка уведомления напрямую на устройстве')
  assert.equal(shown?.options?.data?.type, 'push_local_test')
})

test('getPushRegistrationWithDetails prefers active registration over waiting one', async () => {
  process.env.NODE_ENV = 'production'

  const activeRegistration = {
    scope: 'https://artistcrm.ru/',
    active: { state: 'activated', scriptURL: 'https://artistcrm.ru/sw.js' },
    installing: null,
    waiting: null,
    pushManager: {
      getSubscription: async () => null,
    },
  }
  const waitingRegistration = {
    scope: 'https://artistcrm.ru/',
    active: null,
    installing: null,
    waiting: { state: 'installed', scriptURL: 'https://artistcrm.ru/sw.js' },
    pushManager: {
      getSubscription: async () => null,
    },
  }

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: function Notification() {},
    location: {
      href: 'https://artistcrm.ru/cabinet/notifications',
      origin: 'https://artistcrm.ru',
    },
    setTimeout,
    clearTimeout,
  })
  setGlobalValue('location', {
    href: 'https://artistcrm.ru/cabinet/notifications',
    origin: 'https://artistcrm.ru',
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      getRegistration: async (scope) => (scope ? null : null),
      getRegistrations: async () => [waitingRegistration, activeRegistration],
      register: async () => null,
      ready: new Promise(() => {}),
    },
  })

  const { getPushRegistrationWithDetails } = await import(
    `./pushClient.js?test=${Date.now()}`
  )
  const result = await getPushRegistrationWithDetails()

  assert.equal(result.ok, true)
  assert.equal(result.registration, activeRegistration)
})

test('getPushRegistrationWithDetails asks waiting registration to activate', async () => {
  process.env.NODE_ENV = 'production'

  const listeners = new Map()
  const waitingRegistration = {
    scope: 'https://artistcrm.ru/',
    active: null,
    installing: null,
    waiting: {
      state: 'installed',
      scriptURL: 'https://artistcrm.ru/sw.js',
      addEventListener: (event, handler) => {
        listeners.set(event, handler)
      },
      removeEventListener: (event) => {
        listeners.delete(event)
      },
      postMessage: (message) => {
        if (message?.type !== 'SKIP_WAITING') return
        setTimeout(() => {
          waitingRegistration.active = {
            state: 'activated',
            scriptURL: 'https://artistcrm.ru/sw.js',
          }
          waitingRegistration.waiting.state = 'activated'
          const stateChange = listeners.get('statechange')
          if (stateChange) stateChange()
        }, 1)
      },
    },
    pushManager: {
      getSubscription: async () => null,
    },
  }

  const originalSetTimeout = setTimeout
  const originalClearTimeout = clearTimeout

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: function Notification() {},
    location: {
      href: 'https://artistcrm.ru/cabinet/notifications',
      origin: 'https://artistcrm.ru',
    },
    setTimeout: (handler, timeout, ...args) =>
      originalSetTimeout(handler, timeout === 60000 ? 5 : timeout, ...args),
    clearTimeout: originalClearTimeout,
  })
  setGlobalValue('location', {
    href: 'https://artistcrm.ru/cabinet/notifications',
    origin: 'https://artistcrm.ru',
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      getRegistration: async () => waitingRegistration,
      getRegistrations: async () => [waitingRegistration],
      register: async () => waitingRegistration,
      ready: new Promise(() => {}),
    },
  })

  const { getPushRegistrationWithDetails } = await import(
    `./pushClient.js?test=${Date.now()}`
  )
  const result = await getPushRegistrationWithDetails()

  assert.equal(result.ok, true)
  assert.equal(result.registration, waitingRegistration)
})

test('getPushRegistrationWithDetails rechecks registration while waiting for activation', async () => {
  process.env.NODE_ENV = 'production'

  const pendingRegistration = {
    scope: 'https://artistcrm.ru/',
    active: null,
    installing: {
      state: 'installing',
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    waiting: null,
    pushManager: {
      getSubscription: async () => null,
    },
  }
  const activeRegistration = {
    scope: 'https://artistcrm.ru/',
    active: { state: 'activated', scriptURL: 'https://artistcrm.ru/sw.js' },
    installing: null,
    waiting: null,
    pushManager: {
      getSubscription: async () => null,
    },
  }

  const startedAt = Date.now()
  const originalSetTimeout = setTimeout
  const originalClearTimeout = clearTimeout

  setGlobalValue('window', {
    PushManager: function PushManager() {},
    Notification: function Notification() {},
    location: {
      href: 'https://artistcrm.ru/cabinet/notifications',
      origin: 'https://artistcrm.ru',
    },
    setTimeout: (handler, timeout, ...args) => {
      if (timeout === 3000) return originalSetTimeout(handler, 5, ...args)
      if (timeout === 250) return originalSetTimeout(handler, 5, ...args)
      if (timeout === 60000) return originalSetTimeout(handler, 40, ...args)
      return originalSetTimeout(handler, timeout, ...args)
    },
    clearTimeout: originalClearTimeout,
  })
  setGlobalValue('location', {
    href: 'https://artistcrm.ru/cabinet/notifications',
    origin: 'https://artistcrm.ru',
  })

  setGlobalValue('navigator', {
    serviceWorker: {
      getRegistration: async () =>
        Date.now() - startedAt >= 15 ? activeRegistration : pendingRegistration,
      getRegistrations: async () => [pendingRegistration],
      register: async () => pendingRegistration,
      ready: new Promise(() => {}),
    },
  })

  const { getPushRegistrationWithDetails } = await import(
    `./pushClient.js?test=${Date.now()}`
  )
  const result = await getPushRegistrationWithDetails()

  assert.equal(result.ok, true)
  assert.equal(result.registration, activeRegistration)
})
