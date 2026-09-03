import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createCityLookup, getGeoIpAddress } from './cityGeolocation.mjs'

const headers = new Headers({ 'x-real-ip': '8.8.8.8' })
const env = {
  GEOIP_TRUST_PROXY: 'true',
  GEOIP_CITY_DB_PATH: resolve('test-city.mmdb'),
}

test('requires explicit proxy trust and a single valid X-Real-IP', () => {
  assert.equal(getGeoIpAddress(headers), '')
  assert.equal(getGeoIpAddress(headers, 'false'), '')
  assert.equal(getGeoIpAddress(headers, 'true'), '8.8.8.8')
  assert.equal(
    getGeoIpAddress(new Headers({ 'x-forwarded-for': '8.8.8.8' }), 'true'),
    ''
  )
  for (const ip of [
    'unknown',
    '8.8.8.8, 1.1.1.1',
    '8.8.8.8:1234',
    'fe80::1%eth0',
  ]) {
    assert.equal(getGeoIpAddress(new Headers({ 'x-real-ip': ip }), 'true'), '')
  }
  assert.equal(
    getGeoIpAddress(new Headers({ 'x-real-ip': '::ffff:8.8.8.8' }), 'true'),
    '8.8.8.8'
  )
  assert.equal(
    getGeoIpAddress(
      new Headers({ 'x-real-ip': '2001:4860:4860::8888' }),
      'true'
    ),
    '2001:4860:4860::8888'
  )
})

test('disabled or incomplete configuration does not open the database', async () => {
  const lookup = createCityLookup({
    openDatabase: () => assert.fail('unexpected read'),
  })
  for (const config of [
    {},
    { ...env, GEOIP_TRUST_PROXY: 'false' },
    { ...env, GEOIP_CITY_DB_PATH: 'relative.mmdb' },
  ]) {
    assert.equal(await lookup(headers, config), null)
  }
  assert.equal(await lookup(new Headers(), env), null)
})

test('only returns the city name, preferring Russian; caches concurrent opens', async () => {
  let opens = 0
  const lookup = createCityLookup({
    openDatabase: async (file) => {
      opens += 1
      assert.equal(file, env.GEOIP_CITY_DB_PATH)
      return {
        get: (ip) => {
          assert.equal(ip, '8.8.8.8')
          return {
            city: { names: { ru: ' Красноярск ', en: 'Krasnoyarsk' } },
            location: { latitude: 56 },
          }
        },
      }
    },
  })
  assert.deepEqual(
    await Promise.all([lookup(headers, env), lookup(headers, env)]),
    ['Красноярск', 'Красноярск']
  )
  assert.equal(opens, 1)
})

test('English fallback, missing cities and malformed records', async () => {
  for (const [record, expected] of [
    [{ city: { names: { en: 'London' } } }, 'London'],
    [{ city: { names: { ru: '', en: 'London' } } }, 'London'],
    [{ subdivisions: [{ names: { ru: 'Москва' } }] }, null],
    [{ city: { names: { ru: 12, en: 'x'.repeat(121) } } }, null],
    [{ city: { names: { ru: 'bad\u0000town' } } }, null],
    [null, null],
  ]) {
    const lookup = createCityLookup({
      openDatabase: async () => ({ get: () => record }),
    })
    assert.equal(await lookup(headers, env), expected)
  }
})

test('unavailable/corrupt database backs off, then retries', async () => {
  let now = 0
  let opens = 0
  const lookup = createCityLookup({
    now: () => now,
    openDatabase: async () => {
      opens += 1
      if (opens === 1) throw new Error('private path must not be exposed')
      return { get: () => ({ city: { names: { ru: 'Омск' } } }) }
    },
  })
  assert.equal(await lookup(headers, env), null)
  assert.equal(await lookup(headers, env), null)
  assert.equal(opens, 1)
  now = 60_001
  assert.equal(await lookup(headers, env), 'Омск')
  assert.equal(opens, 2)
})

test('periodically reopens the database and reloads a changed path', async () => {
  let now = 0
  let opens = 0
  const lookup = createCityLookup({
    now: () => now,
    openDatabase: async () => {
      opens += 1
      return { get: () => null }
    },
  })
  await lookup(headers, env)
  now = 3_600_001
  await lookup(headers, env)
  await lookup(headers, {
    ...env,
    GEOIP_CITY_DB_PATH: resolve('another-city.mmdb'),
  })
  assert.equal(opens, 3)
})

test('lookup errors and a genuinely missing local database return no suggestion', async () => {
  const broken = createCityLookup({
    openDatabase: async () => ({
      get: () => {
        throw new Error('bad record')
      },
    }),
  })
  assert.equal(await broken(headers, env), null)
  assert.equal(
    await createCityLookup()(headers, {
      ...env,
      GEOIP_CITY_DB_PATH: resolve('nonexistent-geoip-test-directory/city.mmdb'),
    }),
    null
  )
})
