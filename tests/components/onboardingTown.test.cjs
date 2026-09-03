const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const React = require('react')
const { JSDOM } = require('jsdom')
const { loadBindings, transformSync } = require('next/dist/build/swc')

const dom = new JSDOM('<!doctype html><html><body></body></html>')
global.window = dom.window
global.document = dom.window.document
global.IS_REACT_ACT_ENVIRONMENT = true
const { createRoot } = require('react-dom/client')

function loadModule(file, mocks = {}) {
  const filename = path.resolve(file)
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename,
    jsc: { parser: { syntax: 'ecmascript' } },
    module: { type: 'commonjs' },
  })
  const target = { exports: {} }
  new Function('require', 'module', 'exports', code)(
    (id) => (id in mocks ? mocks[id] : require(id)),
    target,
    target.exports
  )
  return target.exports
}

let useOnboardingTown
test.before(async () => {
  await loadBindings()
  useOnboardingTown = loadModule('helpers/useOnboardingTown.js').default
})
test.after(() => dom.window.close())

async function mount(t, props = {}, strict = false) {
  let state
  const root = createRoot(document.createElement('div'))
  const Probe = (args) => {
    state = useOnboardingTown(args.defaultTown, args.enabled)
    return React.createElement('span', null, state.town)
  }
  const render = async (args) =>
    React.act(async () => {
      const element = React.createElement(Probe, args)
      root.render(
        strict ? React.createElement(React.StrictMode, null, element) : element
      )
    })
  t.after(async () => React.act(async () => root.unmount()))
  await render(props)
  return {
    get state() {
      return state
    },
    render,
    root,
  }
}

const success = (town) => ({
  ok: true,
  json: async () => ({ success: true, data: { town } }),
})

test('empty town is prefilled, remains editable and uses an uncached GET', async (t) => {
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, '/api/site/detected-city')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.method, undefined)
    return success(' Красноярск ')
  })
  const view = await mount(t)
  assert.equal(view.state.town, 'Красноярск')
  assert.equal(view.state.isDetected, true)
  await React.act(async () => view.state.changeTown('Омск'))
  assert.equal(view.state.town, 'Омск')
  assert.equal(view.state.isDetected, false)
})

test('saved city and impersonation do not trigger a lookup', async (t) => {
  t.mock.method(global, 'fetch', () => assert.fail('unexpected lookup'))
  assert.equal((await mount(t, { defaultTown: 'Омск' })).state.town, 'Омск')
  assert.equal((await mount(t, { enabled: false })).state.town, '')
})

test('a late response never overwrites manual input, even after clearing it', async (t) => {
  for (const manual of ['Томск', '']) {
    let finish
    t.mock.method(
      global,
      'fetch',
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const view = await mount(t)
    await React.act(async () => {
      view.state.changeTown('Т')
      view.state.changeTown(manual)
      finish(success('Москва'))
    })
    assert.equal(view.state.town, manual)
    assert.equal(view.state.isDetected, false)
  }
})

test('offline, HTTP errors and empty/malformed results leave manual input usable', async (t) => {
  for (const fetcher of [
    async () => {
      throw new Error('offline')
    },
    async () => ({ ok: false }),
    async () => ({
      ok: true,
      json: async () => {
        throw new Error('invalid json')
      },
    }),
    async () => ({
      ok: true,
      json: async () => ({ success: false, data: { town: 'Москва' } }),
    }),
    ...[null, '', {}, 'x'.repeat(121)].map(
      (value) => async () => success(value)
    ),
  ]) {
    t.mock.method(global, 'fetch', fetcher)
    const view = await mount(t)
    assert.equal(view.state.town, '')
    assert.equal(view.state.isDetected, false)
    await React.act(async () => view.state.changeTown('Омск'))
    assert.equal(view.state.town, 'Омск')
  }
})

test('lookup is aborted on timeout and a late result is ignored', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let finish
  let signal
  t.mock.method(global, 'fetch', (_url, options) => {
    signal = options.signal
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  const view = await mount(t)
  await React.act(async () => t.mock.timers.tick(4001))
  assert.equal(signal.aborted, true)
  await React.act(async () => finish(success('Москва')))
  assert.equal(view.state.town, '')
})

test('saved settings arriving during lookup cancel the pending suggestion', async (t) => {
  let finish
  let signal
  t.mock.method(global, 'fetch', (_url, options) => {
    signal = options.signal
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  const view = await mount(t)
  await view.render({ defaultTown: 'Омск' })
  assert.equal(signal.aborted, true)
  await React.act(async () => finish(success('Москва')))
  assert.equal(view.state.isDetected, false)
})

test('StrictMode cancels the first effect and uses only the active response', async (t) => {
  const calls = []
  t.mock.method(
    global,
    'fetch',
    (_url, options) =>
      new Promise((resolve) => {
        calls.push({ signal: options.signal, resolve })
      })
  )
  const view = await mount(t, {}, true)
  assert.equal(calls.length, 2)
  assert.equal(calls[0].signal.aborted, true)
  await React.act(async () => {
    calls[1].resolve(success('Омск'))
    calls[0].resolve(success('Москва'))
  })
  assert.equal(view.state.town, 'Омск')
})

test('API checks tenant before lookup and never caches a response', async () => {
  for (const [context, expectedStatus, expectedTown] of [
    [{ tenantId: null }, 401, undefined],
    [{ tenantId: 'tenant-a' }, 200, 'Омск'],
    [{ tenantId: 'tenant-b' }, 200, 'Омск'],
  ]) {
    let calls = 0
    const { GET } = loadModule('app/api/site/detected-city/route.js', {
      '@server/getTenantContext': async () => context,
      '@server/cityGeolocation.mjs': {
        detectCity: async (headers) => {
          calls += 1
          assert.equal(headers.get('x-real-ip'), '8.8.8.8')
          return 'Омск'
        },
      },
    })
    const response = await GET(
      new Request('https://example.test/api/site/detected-city?ip=1.1.1.1', {
        headers: { 'x-real-ip': '8.8.8.8' },
      })
    )
    assert.equal(response.status, expectedStatus)
    assert.match(response.headers.get('cache-control'), /private, no-store/)
    const body = await response.json()
    assert.equal(body.data?.town, expectedTown)
    assert.equal(calls, context.tenantId ? 1 : 0)
  }
})

test('API returns a nullable town or a sanitized error without exception details', async () => {
  for (const fails of [false, true]) {
    const { GET } = loadModule('app/api/site/detected-city/route.js', {
      '@server/getTenantContext': async () => ({ tenantId: 'tenant-a' }),
      '@server/cityGeolocation.mjs': {
        detectCity: async () => {
          if (fails) throw new Error('SECRET PATH AND IP')
          return null
        },
      },
    })
    const response = await GET(
      new Request('https://example.test/api/site/detected-city')
    )
    assert.equal(response.status, fails ? 503 : 200)
    const body = await response.json()
    assert.doesNotMatch(JSON.stringify(body), /SECRET/)
    if (!fails) assert.deepEqual(body, { success: true, data: { town: null } })
    assert.match(response.headers.get('cache-control'), /no-store/)
  }
})
