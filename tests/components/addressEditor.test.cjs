const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const React = require('react')
const { JSDOM } = require('jsdom')
const { atom } = require('jotai')
const { loadBindings, transformSync } = require('next/dist/build/swc')

const dom = new JSDOM('<!doctype html><html><body></body></html>')
global.window = dom.window
global.document = dom.window.document
global.IS_REACT_ACT_ENVIRONMENT = true
const { createRoot } = require('react-dom/client')
let addressEditorFunc
let pickerProps
const settingsAtom = atom({ addresses: [] })

const compile = (file, resolve = require) => {
  const filename = path.resolve(file)
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename,
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' },
  })
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', code)(resolve, mod, mod.exports)
  return mod.exports
}

test.before(async () => {
  await loadBindings()
  const addressHelpers = compile('helpers/addressPool.js')
  addressEditorFunc = compile('layouts/modals/modalsFunc/addressEditorFunc.js', (id) => {
    if (id === '@components/AddressPicker') return (props) => {
      pickerProps = props
      return React.createElement('div', null, props.address.street)
    }
    if (id === '@components/Button') return ({ name, onClick }) => React.createElement('button', { onClick }, name)
    if (id === '@helpers/addressPool') return addressHelpers
    if (id === '@state/atoms/siteSettingsAtom') return settingsAtom
    if (id === '@helpers/CRUD') return { postData: async () => { throw new Error('Unexpected network request') } }
    return require(id)
  }).default
})
test.after(() => dom.window.close())

async function setup(t, extra = {}) {
  const original = { town: 'Красноярск', street: 'Ленина', house: '1' }
  const changes = []
  const saved = []
  let confirm
  let closed = false
  const modal = addressEditorFunc({
    address: original,
    onChange: (value) => changes.push(value),
    onSaveAddress: async (value) => saved.push(value),
    saveButtonLabel: 'Сохранить в пул',
    savedLabel: '✓ В пуле',
    ...extra,
  })
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  t.after(async () => { await React.act(() => root.unmount()); container.remove() })
  await React.act(() => root.render(React.createElement(modal.Children, {
    closeModal: () => { closed = true },
    setOnConfirmFunc: (value) => { confirm = value },
  })))
  return { container, original, changes, saved, modal,
    edit: () => React.act(() => pickerProps.onChange({ ...pickerProps.address, street: 'Мира' })),
    apply: () => React.act(() => confirm()),
    isClosed: () => closed,
    cancel: () => React.act(() => root.render(null)),
  }
}

test('manual edits are isolated until Apply returns the latest draft', async (t) => {
  const ui = await setup(t)
  await ui.edit()
  assert.deepEqual(ui.changes, [])
  assert.equal(ui.original.street, 'Ленина')
  await ui.apply()
  assert.deepEqual(ui.changes, [{ ...ui.original, street: 'Мира' }])
  assert.equal(ui.isClosed(), true)
})

test('closing the editor without Apply leaves the event address unchanged', async (t) => {
  const ui = await setup(t)
  assert.equal(ui.modal.closeButtonName, 'Отмена')
  await ui.edit()
  await ui.cancel()
  assert.deepEqual(ui.changes, [])
  assert.equal(ui.original.street, 'Ленина')
})

test('saving to the address pool uses the draft without applying it to the event', async (t) => {
  const ui = await setup(t)
  await ui.edit()
  await React.act(async () => ui.container.querySelector('button').click())
  assert.deepEqual(ui.saved, [{ ...ui.original, street: 'Мира' }])
  assert.deepEqual(ui.changes, [])
  assert.match(ui.container.textContent, /✓ В пуле/)
})
