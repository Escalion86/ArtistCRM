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
      originalSetTimeout(handler, timeout === 15000 ? 5 : timeout, ...args),
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
