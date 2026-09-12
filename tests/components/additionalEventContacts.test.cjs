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

let clientsQueryState = { data: [], isPending: false }
const cache = new Map()
const mocks = {
  '@components/CardButtons': () => null,
  '@components/ContactsIconsButtons': ({ user }) =>
    React.createElement('span', { 'data-contact-actions': user?._id }, user?._id),
  '@helpers/useClientsQuery': {
    useClientsQuery: () => clientsQueryState,
  },
  '@helpers/upcomingEventsOverview': {
    getEventAddressLine: () => '',
    getEventTitle: (event) => event?.eventType || 'Мероприятие',
  },
}

function loadModule(file) {
  const filename = path.resolve(file)
  if (cache.has(filename)) return cache.get(filename).exports
  const compiledModule = { exports: {} }
  cache.set(filename, compiledModule)
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename,
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'automatic' } },
    },
    module: { type: 'commonjs' },
  })
  const resolve = (id) => {
    if (id in mocks) return mocks[id]
    if (id.startsWith('@helpers/')) {
      return loadModule(`helpers/${id.slice('@helpers/'.length)}.js`)
    }
    if (id.startsWith('./')) {
      const localFile = path.resolve(path.dirname(filename), id)
      return loadModule(path.extname(localFile) ? localFile : `${localFile}.js`)
    }
    return require(id)
  }
  new Function('require', 'module', 'exports', code)(
    resolve,
    compiledModule,
    compiledModule.exports
  )
  return compiledModule.exports
}

const event = {
  _id: 'event-1',
  eventType: 'День рождения',
  eventDate: '2026-09-20T12:00:00.000Z',
  clientId: 'client-main',
  otherContacts: [
    { clientId: 'client-extra', comment: 'Координатор площадки' },
    { comment: 'Связаться после 18:00' },
  ],
}
const item = {
  title: 'Уточнить тайминг',
  date: '2026-09-18T10:00:00.000Z',
  done: false,
}

test.before(async () => loadBindings())
test.after(() => dom.window.close())

test('task view shows the event client and additional contacts', async () => {
  clientsQueryState = {
    data: [
      {
        _id: 'client-main',
        firstName: 'Анна',
        secondName: 'Иванова',
        phone: '79001234567',
      },
      {
        _id: 'client-extra',
        firstName: 'Павел',
        secondName: 'Петров',
        phone: '79007654321',
      },
    ],
    isPending: false,
  }
  let modalConfig
  let openedClientId = null
  const modalsFunc = {
    add: (config) => {
      modalConfig = config
    },
    client: {
      view: (clientId) => {
        openedClientId = clientId
      },
    },
  }
  const openModal = loadModule(
    'layouts/modals/modalsFunc/eventAdditionalEventViewModal.js'
  ).default
  openModal({ modalsFunc, event, item, index: 0 })

  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    await React.act(async () =>
      root.render(React.createElement(modalConfig.Children, {}))
    )

    assert.match(container.textContent, /Контакты мероприятия/)
    assert.match(container.textContent, /КлиентАнна Иванова/)
    assert.match(container.textContent, /\+79001234567/)
    assert.match(container.textContent, /Доп\. контакты/)
    assert.match(container.textContent, /Павел Петров/)
    assert.match(container.textContent, /Координатор площадки/)
    assert.match(container.textContent, /Связаться после 18:00/)
    assert.equal(
      container.querySelectorAll('[data-contact-actions]').length,
      2
    )

    const mainClientCard = [...container.querySelectorAll('[role="button"]')].find(
      (node) => node.textContent.includes('Анна Иванова')
    )
    await React.act(async () => mainClientCard.click())
    assert.equal(openedClientId, 'client-main')
  } finally {
    await React.act(async () => root.unmount())
  }
})

test('task view shows contact skeleton while clients are loading', async () => {
  clientsQueryState = { data: [], isPending: true }
  let modalConfig
  const openModal = loadModule(
    'layouts/modals/modalsFunc/eventAdditionalEventViewModal.js'
  ).default
  openModal({
    modalsFunc: { add: (config) => (modalConfig = config) },
    event,
    item,
    index: 0,
  })

  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    await React.act(async () =>
      root.render(React.createElement(modalConfig.Children, {}))
    )
    assert.ok(
      container.querySelector('[aria-label="Загружаем контакты мероприятия"]')
    )
  } finally {
    await React.act(async () => root.unmount())
  }
})
