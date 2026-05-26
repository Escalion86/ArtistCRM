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
