const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { JSDOM } = require('jsdom')
const { loadBindings, transformSync } = require('next/dist/build/swc')

function loadComponent(file) {
  const filename = path.resolve(file)
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename,
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'automatic' } },
    },
    module: { type: 'commonjs' },
  })
  const target = { exports: {} }
  const resolveModule = (id) => {
    if (id === '@components/Notice')
      return loadComponent('components/Notice.js')
    if (id === '@helpers/firstRunWizard.mjs')
      return loadComponent('helpers/firstRunWizard.mjs')
    return require(id)
  }
  new Function('require', 'module', 'exports', code)(
    resolveModule,
    target,
    target.exports
  )
  return target.exports
}

test.before(async () => loadBindings())

test('status guide is a single non-interactive definition list, not a choice of cards', () => {
  const Guide = loadComponent('components/OnboardingStatusGuide.js').default
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Guide)))
  try {
    const document = dom.window.document
    assert.equal(document.querySelectorAll('.ui-notice--neutral').length, 1)
    assert.match(
      document.querySelector('h3').textContent,
      /справка по статусам/
    )
    assert.match(document.body.textContent, /ничего выбирать не нужно/)
    assert.match(document.body.textContent, /«Далее»/)
    assert.equal(document.querySelectorAll('dl').length, 1)
    assert.deepEqual(
      Array.from(document.querySelectorAll('dt'), (item) => item.textContent),
      ['Заявка', 'Подтверждено', 'Отменено', 'Закрыто']
    )
    assert.equal(document.querySelectorAll('dd').length, 4)
    assert.equal(
      document.querySelectorAll(
        'button, a, input, select, [role="button"], [tabindex]'
      ).length,
      0
    )
    assert.ok(document.querySelector('.cursor-default'))
    for (const row of document.querySelectorAll('dl > div')) {
      assert.equal(row.className, '')
    }
  } finally {
    dom.window.close()
  }
})
