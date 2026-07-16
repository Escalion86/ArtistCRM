import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeMobileSettings } from './settings.js'

test('не отдаёт мобильному клиенту секреты и DOCX base64 из custom', () => {
  const result = sanitizeMobileSettings({
    _id: 'settings-1',
    custom: {
      firstRunWizardCompleted: true,
      mobileTheme: 'dark',
      eventTypes: ['Свадьба', 'Корпоратив'],
      avitoClientSecret: 'secret',
      documentTemplates: [{ templateBase64: 'sensitive-base64' }],
    },
  })
  assert.equal(result.custom.firstRunWizardCompleted, true)
  assert.equal(result.custom.mobileTheme, 'dark')
  assert.deepEqual(result.custom.eventTypes, ['Свадьба', 'Корпоратив'])
  assert.equal('avitoClientSecret' in result.custom, false)
  assert.equal('documentTemplates' in result.custom, false)
})
