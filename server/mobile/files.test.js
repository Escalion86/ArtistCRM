import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getMobileUploadDirectory,
  MOBILE_FILE_MAX_SIZE,
  sanitizeMobileFileName,
  validateMobileUploadFiles,
} from './files.js'

const isFile = (item) => item?.kind === 'file'

test('mobile upload directory scoped по tenant и не допускает path traversal', () => {
  assert.equal(
    getMobileUploadDirectory('tenant-a/../../tenant-b'),
    'artistcrm/tenant-atenant-b/mobile'
  )
  assert.notEqual(
    getMobileUploadDirectory('tenant-a'),
    getMobileUploadDirectory('tenant-b')
  )
})

test('имя мобильного файла очищается перед отправкой в cloud', () => {
  assert.equal(sanitizeMobileFileName('../договор<1>.docx'), '.._договор_1_.docx')
  assert.equal(sanitizeMobileFileName(''), 'file')
})

test('mobile upload принимает ровно один непустой файл до 5 МБ', () => {
  assert.equal(validateMobileUploadFiles([], isFile).code, 'FILE_REQUIRED')
  assert.equal(
    validateMobileUploadFiles([{ kind: 'text', size: 10 }], isFile).code,
    'FILE_INVALID'
  )
  assert.equal(
    validateMobileUploadFiles([{ kind: 'file', size: MOBILE_FILE_MAX_SIZE + 1 }], isFile).code,
    'FILE_TOO_LARGE'
  )
  const file = { kind: 'file', size: MOBILE_FILE_MAX_SIZE }
  assert.equal(validateMobileUploadFiles([file], isFile).file, file)
})
