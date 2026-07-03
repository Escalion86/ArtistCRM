# Document Templates Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-managed DOCX template library and replace scattered event document links/files with one typed `documents[]` collection.

**Architecture:** Keep templates in the existing tenant-aware `SiteSettings.custom` map and add helper normalization for template/document shapes. Event APIs continue using current tenant/tariff checks, but `hasDocuments()` and payload normalization learn the new `documents[]` array. UI changes are scoped to `DocumentsContent` and the finance/documents section of `eventFunc.js`, reusing current ArtistCRM components and styles.

**Tech Stack:** Next.js App Router, React, Jotai, Mongoose, MongoDB, node:test, existing DOCX helpers (`docxtemplater`, `pizzip`).

---

## File Structure

- Create `helpers/documentTypes.js`: canonical document type constants, labels, last-number keys, title helpers.
- Create `helpers/documentTemplates.js`: client/server-safe helpers for normalizing `SiteSettings.custom.documentTemplates[]`, migrating legacy contract/act template settings, validating DOCX template metadata and file size.
- Create `helpers/eventDocuments.js`: client/server-safe helpers for normalizing event `documents[]`, converting legacy `invoiceLinks`, `receiptLinks`, `actLinks`, `contractLinks`, `documentFiles`, and deduplicating migration output.
- Add tests:
  - `helpers/documentTemplates.test.js`
  - `helpers/eventDocuments.test.js`
- Modify `server/eventApiNormalization.js`: use `documents[]` in `hasDocuments()`, export `normalizeEventDocuments()`, keep legacy support.
- Modify `server/eventApiNormalization.test.js`: cover `documents[]`.
- Modify `schemas/eventsSchema.js`: add `documents[]`, keep legacy fields.
- Modify `helpers/constants.js`: add `documents: []` to `DEFAULT_EVENT`.
- Modify `app/api/events/route.js`: normalize `documents[]` on create.
- Modify `app/api/events/[id]/route.js`: normalize `documents[]` on update.
- Create `scripts/migrate-event-documents.js`: idempotently migrate legacy event document fields to `documents[]`.
- Create `scripts/migrate-document-templates.js`: idempotently migrate legacy tenant template settings to `custom.documentTemplates[]`.
- Modify `layouts/content/DocumentsContent.js`: replace two fixed upload cards with template library UI.
- Create `components/EventDocumentsEditor.js`: one compact editor for typed links/files in event form.
- Modify `layouts/modals/modalsFunc/eventFunc.js`: use template library for generation and `documents[]` for event documents.
- Modify `layouts/modals/modalsFunc/historyKeyValuesItems/keys.js`: add `documents`.
- Modify `docs/DOCX_DOCUMENTS_GUIDE.md`: document multiple named templates.
- Modify `docs/ROADMAP.md`: add and close a documents-library task after implementation.
- Modify `package.json`: patch-bump only when the roadmap task is closed.

---

### Task 1: Shared Document Type Helpers

**Files:**
- Create: `helpers/documentTypes.js`
- Test: no standalone test; covered by Tasks 2 and 3

- [ ] **Step 1: Create document type constants**

Create `helpers/documentTypes.js`:

```js
const DOCUMENT_TYPES = {
  CONTRACT: 'contract',
  INVOICE: 'invoice',
  RECEIPT: 'receipt',
  ACT: 'act',
  OTHER: 'other',
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: DOCUMENT_TYPES.CONTRACT, name: 'Договор' },
  { value: DOCUMENT_TYPES.INVOICE, name: 'Счет' },
  { value: DOCUMENT_TYPES.RECEIPT, name: 'Чек' },
  { value: DOCUMENT_TYPES.ACT, name: 'Акт' },
  { value: DOCUMENT_TYPES.OTHER, name: 'Другое' },
]

const DOCUMENT_TYPE_LABELS = DOCUMENT_TYPE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.name
  return acc
}, {})

const DOCUMENT_TYPE_LAST_NUMBER_KEYS = {
  [DOCUMENT_TYPES.CONTRACT]: 'contractLastNumber',
  [DOCUMENT_TYPES.INVOICE]: 'invoiceLastNumber',
  [DOCUMENT_TYPES.RECEIPT]: 'receiptLastNumber',
  [DOCUMENT_TYPES.ACT]: 'actLastNumber',
  [DOCUMENT_TYPES.OTHER]: 'otherLastNumber',
}

const normalizeDocumentType = (value) => {
  const normalized = String(value ?? '').trim()
  return DOCUMENT_TYPE_LABELS[normalized] ? normalized : DOCUMENT_TYPES.OTHER
}

const getDocumentTypeLabel = (type, customTypeName = '') => {
  const normalizedType = normalizeDocumentType(type)
  if (normalizedType === DOCUMENT_TYPES.OTHER) {
    const custom = String(customTypeName ?? '').trim()
    return custom || DOCUMENT_TYPE_LABELS[DOCUMENT_TYPES.OTHER]
  }
  return DOCUMENT_TYPE_LABELS[normalizedType]
}

const getDocumentDefaultTitle = (type, customTypeName = '') =>
  getDocumentTypeLabel(type, customTypeName)

const getDocumentLastNumberKey = (type) =>
  DOCUMENT_TYPE_LAST_NUMBER_KEYS[normalizeDocumentType(type)] ??
  DOCUMENT_TYPE_LAST_NUMBER_KEYS[DOCUMENT_TYPES.OTHER]

export {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
  DOCUMENT_TYPE_LAST_NUMBER_KEYS,
  getDocumentDefaultTitle,
  getDocumentLastNumberKey,
  getDocumentTypeLabel,
  normalizeDocumentType,
}
```

- [ ] **Step 2: Run syntax check through eslint**

Run:

```bash
npx eslint helpers/documentTypes.js
```

Expected: exit code `0`.

- [ ] **Step 3: Commit**

Run:

```bash
git add helpers/documentTypes.js
git commit -m "feat: add document type helpers"
```

---

### Task 2: Template Normalization Helpers

**Files:**
- Create: `helpers/documentTemplates.js`
- Test: `helpers/documentTemplates.test.js`

- [ ] **Step 1: Write failing tests for template normalization**

Create `helpers/documentTemplates.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DOCX_TEMPLATE_MAX_BYTES,
  normalizeDocumentTemplate,
  normalizeDocumentTemplates,
  normalizeDocumentTemplatesFromSettings,
  validateDocxTemplateFileMeta,
} from './documentTemplates.js'

test('normalizes one document template', () => {
  const result = normalizeDocumentTemplate(
    {
      id: 'template-1',
      name: ' Договор ИП ',
      type: 'contract',
      fileName: 'dogovor.docx',
      templateBase64: 'abc',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
    },
    { now: '2026-07-03T00:00:00.000Z' }
  )

  assert.deepEqual(result, {
    id: 'template-1',
    name: 'Договор ИП',
    type: 'contract',
    customTypeName: '',
    fileName: 'dogovor.docx',
    templateBase64: 'abc',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
  })
})

test('drops templates without base64 payload', () => {
  assert.deepEqual(
    normalizeDocumentTemplates([{ name: 'Пустой', fileName: 'empty.docx' }]),
    []
  )
})

test('converts legacy contract and act settings into templates', () => {
  const result = normalizeDocumentTemplatesFromSettings(
    {
      contractDocxTemplateBase64: 'contract-base64',
      contractDocxTemplateFileName: 'contract.docx',
      actDocxTemplateBase64: 'act-base64',
      actDocxTemplateFileName: 'act.docx',
      documentTemplates: [],
    },
    { now: '2026-07-03T00:00:00.000Z' }
  )

  assert.equal(result.length, 2)
  assert.equal(result[0].name, 'Договор')
  assert.equal(result[0].type, 'contract')
  assert.equal(result[0].templateBase64, 'contract-base64')
  assert.equal(result[1].name, 'Акт')
  assert.equal(result[1].type, 'act')
  assert.equal(result[1].templateBase64, 'act-base64')
})

test('keeps existing templates before adding missing legacy templates', () => {
  const result = normalizeDocumentTemplatesFromSettings(
    {
      documentTemplates: [
        {
          id: 'custom',
          name: 'Счет',
          type: 'invoice',
          fileName: 'invoice.docx',
          templateBase64: 'invoice-base64',
        },
      ],
      contractDocxTemplateBase64: 'contract-base64',
      contractDocxTemplateFileName: 'contract.docx',
    },
    { now: '2026-07-03T00:00:00.000Z' }
  )

  assert.equal(result.length, 2)
  assert.equal(result[0].id, 'custom')
  assert.equal(result[1].type, 'contract')
})

test('validates docx file metadata', () => {
  assert.deepEqual(
    validateDocxTemplateFileMeta({
      name: 'template.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: DOCX_TEMPLATE_MAX_BYTES,
    }),
    { valid: true, error: '' }
  )
  assert.equal(
    validateDocxTemplateFileMeta({ name: 'template.pdf', type: '', size: 10 })
      .error,
    'Загрузите файл в формате .docx'
  )
  assert.equal(
    validateDocxTemplateFileMeta({
      name: 'big.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: DOCX_TEMPLATE_MAX_BYTES + 1,
    }).error,
    'Размер DOCX-шаблона не должен превышать 5 МБ'
  )
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test helpers/documentTemplates.test.js
```

Expected: FAIL with module not found for `./documentTemplates.js`.

- [ ] **Step 3: Implement template helper**

Create `helpers/documentTemplates.js`:

```js
import { DOCUMENT_TYPES, normalizeDocumentType } from './documentTypes.js'

const DOCX_TEMPLATE_MAX_BYTES = 5 * 1024 * 1024
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const createDocumentTemplateId = () => {
  if (typeof crypto !== 'undefined' && crypto?.randomUUID) {
    return crypto.randomUUID()
  }
  return `template-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const cleanString = (value) => String(value ?? '').trim()

const normalizeIsoDate = (value, fallback) => {
  const raw = cleanString(value)
  if (!raw) return fallback
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

const normalizeDocumentTemplate = (template, { now = new Date().toISOString() } = {}) => {
  if (!template || typeof template !== 'object') return null
  const templateBase64 = cleanString(template.templateBase64)
  if (!templateBase64) return null

  const type = normalizeDocumentType(template.type)
  const customTypeName =
    type === DOCUMENT_TYPES.OTHER ? cleanString(template.customTypeName) : ''
  const fallbackName =
    type === DOCUMENT_TYPES.CONTRACT
      ? 'Договор'
      : type === DOCUMENT_TYPES.ACT
        ? 'Акт'
        : type === DOCUMENT_TYPES.INVOICE
          ? 'Счет'
          : type === DOCUMENT_TYPES.RECEIPT
            ? 'Чек'
            : customTypeName || 'Документ'

  return {
    id: cleanString(template.id) || createDocumentTemplateId(),
    name: cleanString(template.name) || fallbackName,
    type,
    customTypeName,
    fileName: cleanString(template.fileName) || 'template.docx',
    templateBase64,
    createdAt: normalizeIsoDate(template.createdAt, now),
    updatedAt: normalizeIsoDate(template.updatedAt, now),
  }
}

const normalizeDocumentTemplates = (templates, options = {}) => {
  if (!Array.isArray(templates)) return []
  const seen = new Set()
  return templates
    .map((template) => normalizeDocumentTemplate(template, options))
    .filter(Boolean)
    .filter((template) => {
      const key = template.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const buildLegacyTemplate = ({
  id,
  name,
  type,
  fileName,
  templateBase64,
  now,
}) => {
  if (!cleanString(templateBase64)) return null
  return normalizeDocumentTemplate(
    {
      id,
      name,
      type,
      fileName: cleanString(fileName) || `${id}.docx`,
      templateBase64,
      createdAt: now,
      updatedAt: now,
    },
    { now }
  )
}

const normalizeDocumentTemplatesFromSettings = (
  customSettings,
  { now = new Date().toISOString() } = {}
) => {
  const custom = customSettings && typeof customSettings === 'object' ? customSettings : {}
  const result = normalizeDocumentTemplates(custom.documentTemplates, { now })
  const existingTypes = new Set(result.map((template) => template.type))
  const legacyTemplates = [
    buildLegacyTemplate({
      id: 'legacy-contract-template',
      name: 'Договор',
      type: DOCUMENT_TYPES.CONTRACT,
      fileName: custom.contractDocxTemplateFileName,
      templateBase64: custom.contractDocxTemplateBase64,
      now,
    }),
    buildLegacyTemplate({
      id: 'legacy-act-template',
      name: 'Акт',
      type: DOCUMENT_TYPES.ACT,
      fileName: custom.actDocxTemplateFileName,
      templateBase64: custom.actDocxTemplateBase64,
      now,
    }),
  ].filter(Boolean)

  legacyTemplates.forEach((template) => {
    if (!existingTypes.has(template.type)) {
      result.push(template)
      existingTypes.add(template.type)
    }
  })

  return result
}

const validateDocxTemplateFileMeta = (file) => {
  if (!file) return { valid: false, error: 'Выберите DOCX-файл' }
  const name = cleanString(file.name).toLowerCase()
  const type = cleanString(file.type)
  if (!name.endsWith('.docx') && type !== DOCX_MIME) {
    return { valid: false, error: 'Загрузите файл в формате .docx' }
  }
  if (Number(file.size) > DOCX_TEMPLATE_MAX_BYTES) {
    return {
      valid: false,
      error: 'Размер DOCX-шаблона не должен превышать 5 МБ',
    }
  }
  return { valid: true, error: '' }
}

export {
  DOCX_TEMPLATE_MAX_BYTES,
  normalizeDocumentTemplate,
  normalizeDocumentTemplates,
  normalizeDocumentTemplatesFromSettings,
  validateDocxTemplateFileMeta,
}
```

- [ ] **Step 4: Run tests and eslint**

Run:

```bash
node --test helpers/documentTemplates.test.js
npx eslint helpers/documentTypes.js helpers/documentTemplates.js helpers/documentTemplates.test.js
```

Expected: both commands exit `0`.

- [ ] **Step 5: Commit**

Run:

```bash
git add helpers/documentTypes.js helpers/documentTemplates.js helpers/documentTemplates.test.js
git commit -m "feat: normalize document templates"
```

---

### Task 3: Event Document Normalization Helpers

**Files:**
- Create: `helpers/eventDocuments.js`
- Test: `helpers/eventDocuments.test.js`

- [ ] **Step 1: Write failing tests**

Create `helpers/eventDocuments.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mergeLegacyEventDocuments,
  normalizeEventDocument,
  normalizeEventDocuments,
} from './eventDocuments.js'

test('normalizes a link document', () => {
  assert.deepEqual(
    normalizeEventDocument(
      {
        id: 'doc-1',
        type: 'invoice',
        title: ' Счет ',
        url: ' https://example.com/invoice ',
        createdAt: '2026-07-01T00:00:00.000Z',
      },
      { now: '2026-07-03T00:00:00.000Z' }
    ),
    {
      id: 'doc-1',
      type: 'invoice',
      customTypeName: '',
      title: 'Счет',
      url: 'https://example.com/invoice',
      file: null,
      createdAt: '2026-07-01T00:00:00.000Z',
    }
  )
})

test('normalizes a file document', () => {
  const result = normalizeEventDocument(
    {
      type: 'act',
      title: '',
      file: {
        name: 'akt.docx',
        url: 'https://files.example/akt.docx',
        path: 'events/1/documents/akt.docx',
        size: 10,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    },
    { now: '2026-07-03T00:00:00.000Z' }
  )

  assert.equal(result.type, 'act')
  assert.equal(result.title, 'Акт')
  assert.equal(result.file.name, 'akt.docx')
  assert.equal(result.url, '')
})

test('drops empty documents', () => {
  assert.deepEqual(normalizeEventDocuments([{ title: 'empty' }]), [])
})

test('merges legacy event documents idempotently', () => {
  const event = {
    documents: [
      {
        id: 'existing',
        type: 'contract',
        title: 'Договор',
        url: 'https://example.com/contract',
      },
    ],
    contractLinks: ['https://example.com/contract'],
    invoiceLinks: ['https://example.com/invoice'],
    receiptLinks: ['https://example.com/receipt'],
    actLinks: ['https://example.com/act'],
    documentFiles: [
      {
        name: 'rider.pdf',
        url: 'https://files.example/rider.pdf',
        path: 'events/1/documents/rider.pdf',
      },
    ],
  }

  const once = mergeLegacyEventDocuments(event, {
    now: '2026-07-03T00:00:00.000Z',
  })
  const twice = mergeLegacyEventDocuments(
    { ...event, documents: once },
    { now: '2026-07-03T00:00:00.000Z' }
  )

  assert.equal(once.length, 5)
  assert.equal(twice.length, 5)
  assert.deepEqual(
    once.map((item) => item.type),
    ['contract', 'invoice', 'receipt', 'act', 'other']
  )
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test helpers/eventDocuments.test.js
```

Expected: FAIL with module not found for `./eventDocuments.js`.

- [ ] **Step 3: Implement helper**

Create `helpers/eventDocuments.js`:

```js
import {
  DOCUMENT_TYPES,
  getDocumentDefaultTitle,
  normalizeDocumentType,
} from './documentTypes.js'

const cleanString = (value) => String(value ?? '').trim()

const createEventDocumentId = () => {
  if (typeof crypto !== 'undefined' && crypto?.randomUUID) {
    return crypto.randomUUID()
  }
  return `document-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const normalizeIsoDate = (value, fallback) => {
  const raw = cleanString(value)
  if (!raw) return fallback
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

const normalizeDocumentFile = (file) => {
  if (!file || typeof file !== 'object') return null
  const name = cleanString(file.name || file.fileName)
  const url = cleanString(file.url)
  const path = cleanString(file.path)
  if (!name && !url && !path) return null
  return {
    name: name || 'Документ',
    url,
    path,
    size: Number(file.size) > 0 ? Number(file.size) : null,
    contentType: cleanString(file.contentType || file.type),
  }
}

const normalizeEventDocument = (
  document,
  { now = new Date().toISOString() } = {}
) => {
  if (!document || typeof document !== 'object') return null
  const type = normalizeDocumentType(document.type)
  const customTypeName =
    type === DOCUMENT_TYPES.OTHER ? cleanString(document.customTypeName) : ''
  const url = cleanString(document.url)
  const file = normalizeDocumentFile(document.file)
  if (!url && !file) return null
  return {
    id: cleanString(document.id) || createEventDocumentId(),
    type,
    customTypeName,
    title:
      cleanString(document.title) ||
      getDocumentDefaultTitle(type, customTypeName),
    url,
    file,
    createdAt: normalizeIsoDate(document.createdAt, now),
  }
}

const getDocumentDedupKey = (document) => {
  if (!document) return ''
  if (document.url) return `url:${document.type}:${document.url}`
  const fileKey =
    document.file?.path || document.file?.url || document.file?.name || ''
  return fileKey ? `file:${fileKey}` : ''
}

const normalizeEventDocuments = (documents, options = {}) => {
  if (!Array.isArray(documents)) return []
  const seen = new Set()
  return documents
    .map((document) => normalizeEventDocument(document, options))
    .filter(Boolean)
    .filter((document) => {
      const key = getDocumentDedupKey(document)
      if (!key) return true
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const linkDocuments = (links, type, title, now) =>
  (Array.isArray(links) ? links : [])
    .map((url) => cleanString(url))
    .filter(Boolean)
    .map((url) => ({ type, title, url, createdAt: now }))

const fileDocuments = (files, now) =>
  (Array.isArray(files) ? files : [])
    .map((file) => normalizeDocumentFile(file))
    .filter(Boolean)
    .map((file) => ({
      type: DOCUMENT_TYPES.OTHER,
      title: file.name || 'Документ',
      file,
      createdAt: now,
    }))

const mergeLegacyEventDocuments = (
  event,
  { now = new Date().toISOString() } = {}
) => {
  const existing = Array.isArray(event?.documents) ? event.documents : []
  return normalizeEventDocuments(
    [
      ...existing,
      ...linkDocuments(event?.contractLinks, DOCUMENT_TYPES.CONTRACT, 'Договор', now),
      ...linkDocuments(event?.invoiceLinks, DOCUMENT_TYPES.INVOICE, 'Счет', now),
      ...linkDocuments(event?.receiptLinks, DOCUMENT_TYPES.RECEIPT, 'Чек', now),
      ...linkDocuments(event?.actLinks, DOCUMENT_TYPES.ACT, 'Акт', now),
      ...fileDocuments(event?.documentFiles, now),
    ],
    { now }
  )
}

const eventHasDocuments = (payload) =>
  mergeLegacyEventDocuments(payload).length > 0

export {
  eventHasDocuments,
  mergeLegacyEventDocuments,
  normalizeEventDocument,
  normalizeEventDocuments,
}
```

- [ ] **Step 4: Run tests and eslint**

Run:

```bash
node --test helpers/eventDocuments.test.js
npx eslint helpers/eventDocuments.js helpers/eventDocuments.test.js
```

Expected: both commands exit `0`.

- [ ] **Step 5: Commit**

Run:

```bash
git add helpers/eventDocuments.js helpers/eventDocuments.test.js
git commit -m "feat: normalize event documents"
```

---

### Task 4: Server Normalization, Schema, and API

**Files:**
- Modify: `server/eventApiNormalization.js`
- Modify: `server/eventApiNormalization.test.js`
- Modify: `schemas/eventsSchema.js`
- Modify: `helpers/constants.js`
- Modify: `app/api/events/route.js`
- Modify: `app/api/events/[id]/route.js`

- [ ] **Step 1: Add failing server normalization test**

Append to `server/eventApiNormalization.test.js`:

```js
test('hasDocuments returns true for new documents array', () => {
  assert.equal(
    hasDocuments({
      documents: [
        {
          type: 'contract',
          title: 'Договор',
          url: 'https://example.com/contract',
        },
      ],
    }),
    true
  )
})

test('normalizeEventDocuments keeps typed documents', () => {
  const result = normalizeEventDocuments([
    {
      type: 'receipt',
      title: 'Чек',
      url: 'https://example.com/receipt',
    },
  ])

  assert.equal(result.length, 1)
  assert.equal(result[0].type, 'receipt')
  assert.equal(result[0].title, 'Чек')
})
```

Update the import in `server/eventApiNormalization.test.js`:

```js
import {
  hasDocuments,
  normalizeAdditionalEvents,
  normalizeDepositExpectedAmount,
  normalizeEventDocumentFiles,
  normalizeEventDocuments,
  normalizeEventType,
  normalizeWaitDeposit,
} from './eventApiNormalization.js'
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
node --test server/eventApiNormalization.test.js
```

Expected: FAIL because `normalizeEventDocuments` is not exported or `hasDocuments()` ignores `documents[]`.

- [ ] **Step 3: Update server normalization**

Modify `server/eventApiNormalization.js`:

```js
import {
  eventHasDocuments,
  normalizeEventDocuments,
} from '@helpers/eventDocuments'

const hasDocuments = (payload) => eventHasDocuments(payload)
```

Keep existing `normalizeEventDocumentFiles()` export for legacy callers. Add `normalizeEventDocuments` to the export block:

```js
export {
  hasDocuments,
  normalizeAdditionalEvents,
  normalizeDepositExpectedAmount,
  normalizeEventDocumentFiles,
  normalizeEventDocuments,
  normalizeEventType,
  normalizeWaitDeposit,
  parseDateValue,
}
```

- [ ] **Step 4: Add schema field**

Modify `schemas/eventsSchema.js` by adding near existing document fields:

```js
  documents: {
    type: [
      {
        id: { type: String, default: '' },
        type: { type: String, default: 'other' },
        customTypeName: { type: String, default: '' },
        title: { type: String, default: '' },
        url: { type: String, default: '' },
        file: {
          type: {
            name: { type: String, default: '' },
            url: { type: String, default: '' },
            path: { type: String, default: '' },
            size: { type: Number, default: null },
            contentType: { type: String, default: '' },
          },
          default: null,
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
```

- [ ] **Step 5: Add default event field**

Modify `helpers/constants.js` in `DEFAULT_EVENT`:

```js
  documents: [],
```

- [ ] **Step 6: Normalize documents in create API**

Modify imports in `app/api/events/route.js`:

```js
  normalizeEventDocumentFiles,
  normalizeEventDocuments,
```

Modify `Events.create()` payload:

```js
    documentFiles: normalizeEventDocumentFiles(body.documentFiles),
    documents: normalizeEventDocuments(body.documents),
```

- [ ] **Step 7: Normalize documents in update API**

Modify imports in `app/api/events/[id]/route.js`:

```js
  normalizeEventDocumentFiles,
  normalizeEventDocuments,
```

Add after the `documentFiles` update block:

```js
  if (body.documents !== undefined)
    update.documents = normalizeEventDocuments(body.documents)
```

- [ ] **Step 8: Run tests and eslint**

Run:

```bash
node --test server/eventApiNormalization.test.js helpers/eventDocuments.test.js
npx eslint server/eventApiNormalization.js server/eventApiNormalization.test.js schemas/eventsSchema.js helpers/constants.js app/api/events/route.js app/api/events/[id]/route.js
```

Expected: all commands exit `0`.

- [ ] **Step 9: Commit**

Run:

```bash
git add server/eventApiNormalization.js server/eventApiNormalization.test.js schemas/eventsSchema.js helpers/constants.js app/api/events/route.js app/api/events/[id]/route.js
git commit -m "feat: support typed event documents in API"
```

---

### Task 5: Migration Scripts

**Files:**
- Create: `scripts/migrate-event-documents.js`
- Create: `scripts/migrate-document-templates.js`

- [ ] **Step 1: Create event documents migration**

Create `scripts/migrate-event-documents.js`:

```js
import dbConnect from '../server/dbConnect.js'
import Events from '../models/Events.js'
import { mergeLegacyEventDocuments } from '../helpers/eventDocuments.js'

const migrateEventDocuments = async () => {
  await dbConnect()
  const cursor = Events.find({
    $or: [
      { contractLinks: { $exists: true, $ne: [] } },
      { invoiceLinks: { $exists: true, $ne: [] } },
      { receiptLinks: { $exists: true, $ne: [] } },
      { actLinks: { $exists: true, $ne: [] } },
      { documentFiles: { $exists: true, $ne: [] } },
    ],
  }).cursor()

  let scanned = 0
  let updated = 0

  for await (const event of cursor) {
    scanned += 1
    const eventObject = event.toObject()
    const documents = mergeLegacyEventDocuments(eventObject)
    const previous = JSON.stringify(eventObject.documents ?? [])
    const next = JSON.stringify(documents)
    if (previous === next) continue
    event.documents = documents
    await event.save()
    updated += 1
  }

  return { scanned, updated }
}

migrateEventDocuments()
  .then((result) => {
    console.log(
      `migrate-event-documents complete: scanned=${result.scanned}, updated=${result.updated}`
    )
    process.exit(0)
  })
  .catch((error) => {
    console.error('migrate-event-documents failed', error)
    process.exit(1)
  })
```

- [ ] **Step 2: Create settings templates migration**

Create `scripts/migrate-document-templates.js`:

```js
import dbConnect from '../server/dbConnect.js'
import SiteSettings from '../models/SiteSettings.js'
import { normalizeDocumentTemplatesFromSettings } from '../helpers/documentTemplates.js'

const migrateDocumentTemplates = async () => {
  await dbConnect()
  const cursor = SiteSettings.find({
    $or: [
      { 'custom.contractDocxTemplateBase64': { $exists: true, $ne: '' } },
      { 'custom.actDocxTemplateBase64': { $exists: true, $ne: '' } },
      { 'custom.documentTemplates': { $exists: true } },
    ],
  }).cursor()

  let scanned = 0
  let updated = 0

  for await (const settings of cursor) {
    scanned += 1
    const currentCustom =
      settings.custom instanceof Map
        ? Object.fromEntries(settings.custom)
        : settings.custom || {}
    const documentTemplates = normalizeDocumentTemplatesFromSettings(currentCustom)
    const previous = JSON.stringify(currentCustom.documentTemplates ?? [])
    const next = JSON.stringify(documentTemplates)
    if (previous === next) continue
    settings.custom = {
      ...currentCustom,
      documentTemplates,
    }
    await settings.save()
    updated += 1
  }

  return { scanned, updated }
}

migrateDocumentTemplates()
  .then((result) => {
    console.log(
      `migrate-document-templates complete: scanned=${result.scanned}, updated=${result.updated}`
    )
    process.exit(0)
  })
  .catch((error) => {
    console.error('migrate-document-templates failed', error)
    process.exit(1)
  })
```

- [ ] **Step 3: Run eslint**

Run:

```bash
npx eslint scripts/migrate-event-documents.js scripts/migrate-document-templates.js
```

Expected: exit code `0`.

- [ ] **Step 4: Commit**

Run:

```bash
git add scripts/migrate-event-documents.js scripts/migrate-document-templates.js
git commit -m "chore: add document migration scripts"
```

---

### Task 6: Documents Settings UI

**Files:**
- Modify: `layouts/content/DocumentsContent.js`
- Uses: `helpers/documentTypes.js`, `helpers/documentTemplates.js`

- [ ] **Step 1: Add imports**

Modify imports in `layouts/content/DocumentsContent.js`:

```js
import ComboBox from '@components/ComboBox'
import Input from '@components/Input'
import {
  DOCUMENT_TYPE_OPTIONS,
  DOCUMENT_TYPES,
  getDocumentTypeLabel,
} from '@helpers/documentTypes'
import {
  normalizeDocumentTemplatesFromSettings,
  validateDocxTemplateFileMeta,
} from '@helpers/documentTemplates'
```

- [ ] **Step 2: Replace fixed refs with generic file reader state**

Remove:

```js
  const contractTemplateInputRef = useRef(null)
  const actTemplateInputRef = useRef(null)
```

Add:

```js
  const templateInputRef = useRef(null)
  const pendingTemplateRef = useRef(null)
  const documentTemplates = useMemo(
    () => normalizeDocumentTemplatesFromSettings(customSettings),
    [customSettings]
  )
```

- [ ] **Step 3: Add save helper for template list**

Add inside `DocumentsContent`:

```js
  const saveDocumentTemplates = async (templates) => {
    await postData(
      '/api/site',
      {
        custom: {
          ...(siteSettings?.custom ?? {}),
          documentTemplates: templates,
        },
      },
      (data) => setSiteSettings(data),
      null,
      false,
      null
    )
  }
```

- [ ] **Step 4: Add modal opener for add/edit template**

Add:

```js
  const openTemplateEditor = (template = null) => {
    const isEdit = Boolean(template?.id)
    const initialType = template?.type || DOCUMENT_TYPES.CONTRACT
    const TemplateEditor = () => {
      const [name, setName] = useState(template?.name ?? '')
      const [type, setType] = useState(initialType)
      const [customTypeName, setCustomTypeName] = useState(
        template?.customTypeName ?? ''
      )
      const [error, setError] = useState('')

      useEffect(() => {
        pendingTemplateRef.current = {
          ...template,
          name,
          type,
          customTypeName,
        }
      }, [name, type, customTypeName])

      return (
        <div className="flex flex-col gap-3">
          {error ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <Input
            label="Название шаблона"
            value={name}
            onChange={setName}
            noMargin
            fullWidth
          />
          <ComboBox
            label="Тип документа"
            items={DOCUMENT_TYPE_OPTIONS}
            value={type}
            onChange={setType}
            noMargin
            fullWidth
          />
          {type === DOCUMENT_TYPES.OTHER ? (
            <Input
              label="Название типа"
              value={customTypeName}
              onChange={setCustomTypeName}
              noMargin
              fullWidth
            />
          ) : null}
          <button
            type="button"
            className="action-icon-button action-icon-button--warning flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold"
            onClick={() => {
              const current = pendingTemplateRef.current
              const normalizedName = String(current?.name ?? '').trim()
              if (!normalizedName) {
                setError('Введите название шаблона')
                return
              }
              setError('')
              templateInputRef.current?.click()
            }}
          >
            {isEdit ? 'Выбрать новый .docx' : 'Выбрать .docx'}
          </button>
        </div>
      )
    }

    pendingTemplateRef.current = template
    modalsFunc.add({
      title: isEdit ? 'Редактирование шаблона' : 'Новый шаблон',
      showDecline: true,
      declineButtonName: 'Закрыть',
      Children: TemplateEditor,
    })
  }
```

- [ ] **Step 5: Add file input handler**

Add one hidden input near the top of rendered content:

```jsx
<input
  ref={templateInputRef}
  type="file"
  accept=".docx"
  className="hidden"
  onChange={async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    const validation = validateDocxTemplateFileMeta(file)
    if (!validation.valid) {
      window.alert(validation.error)
      return
    }
    const draft = pendingTemplateRef.current
    if (!draft) return
    const base64 = await readFileAsBase64(file)
    const now = new Date().toISOString()
    const nextTemplate = {
      id: draft.id || crypto.randomUUID(),
      name: String(draft.name ?? '').trim(),
      type: draft.type,
      customTypeName: String(draft.customTypeName ?? '').trim(),
      fileName: file.name,
      templateBase64: base64,
      createdAt: draft.createdAt || now,
      updatedAt: now,
    }
    const nextTemplates = draft.id
      ? documentTemplates.map((item) =>
          item.id === draft.id ? nextTemplate : item
        )
      : [...documentTemplates, nextTemplate]
    await saveDocumentTemplates(nextTemplates)
  }}
/>
```

- [ ] **Step 6: Replace fixed template cards with library list**

Replace the two-card grid with:

```jsx
<div className="flex flex-col gap-3">
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="text-sm font-semibold text-gray-800">
      Шаблоны документов
    </div>
    <button
      type="button"
      className="action-icon-button action-icon-button--warning flex h-9 w-full cursor-pointer items-center justify-center rounded px-3 text-xs font-semibold tablet:w-auto"
      onClick={() => openTemplateEditor()}
    >
      Добавить шаблон
    </button>
  </div>
  {documentTemplates.length === 0 ? (
    <div className="rounded border border-gray-200 p-3 text-sm text-gray-500">
      Шаблоны еще не загружены.
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
      {documentTemplates.map((template) => (
        <div key={template.id} className="rounded border border-gray-200 p-3">
          <div className="text-sm font-semibold text-gray-800">
            {template.name}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {getDocumentTypeLabel(template.type, template.customTypeName)} ·{' '}
            {template.fileName}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="action-icon-button action-icon-button--warning flex h-9 w-full cursor-pointer items-center justify-center rounded px-3 text-xs font-semibold tablet:w-auto"
              onClick={() => openTemplateEditor(template)}
            >
              Заменить
            </button>
            <button
              type="button"
              className="action-icon-button action-icon-button--warning flex h-9 w-full cursor-pointer items-center justify-center rounded px-3 text-xs font-semibold tablet:w-auto"
              onClick={async () => {
                await saveDocumentTemplates(
                  documentTemplates.filter((item) => item.id !== template.id)
                )
              }}
            >
              Удалить
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 7: Keep standard template download links**

Keep both existing download anchors, but move them under the library list in one compact row:

```jsx
<div className="flex flex-wrap gap-2">
  <a href={DEFAULT_CONTRACT_TEMPLATE_DOWNLOAD_URL} download className="...">
    Скачать пример договора
  </a>
  <a href={DEFAULT_ACT_TEMPLATE_DOWNLOAD_URL} download className="...">
    Скачать пример акта
  </a>
</div>
```

Use the same `action-icon-button action-icon-button--warning ...` class pattern already present in the file.

- [ ] **Step 8: Run eslint**

Run:

```bash
npx eslint layouts/content/DocumentsContent.js helpers/documentTemplates.js helpers/documentTypes.js
```

Expected: exit code `0`.

- [ ] **Step 9: Commit**

Run:

```bash
git add layouts/content/DocumentsContent.js
git commit -m "feat: manage document template library"
```

---

### Task 7: Event Documents Editor Component

**Files:**
- Create: `components/EventDocumentsEditor.js`

- [ ] **Step 1: Create compact editor component**

Create `components/EventDocumentsEditor.js`:

```js
'use client'

import { useRef } from 'react'
import ComboBox from '@components/ComboBox'
import Input from '@components/Input'
import { sendFile } from '@helpers/cloudinary'
import {
  DOCUMENT_TYPE_OPTIONS,
  DOCUMENT_TYPES,
  getDocumentDefaultTitle,
  getDocumentTypeLabel,
} from '@helpers/documentTypes'

const createId = () =>
  typeof crypto !== 'undefined' && crypto?.randomUUID
    ? crypto.randomUUID()
    : `document-${Date.now()}-${Math.random().toString(16).slice(2)}`

const EventDocumentsEditor = ({
  documents = [],
  onChange,
  directory,
  noMargin = false,
}) => {
  const fileInputRef = useRef(null)
  const pendingFileTypeRef = useRef(DOCUMENT_TYPES.OTHER)

  const safeDocuments = Array.isArray(documents) ? documents : []

  const addLink = () => {
    const type = window.prompt(
      'Тип документа: Договор, Счет, Чек, Акт или Другое',
      'Договор'
    )
    const normalizedTypeLabel = String(type ?? '').trim().toLowerCase()
    const typeMap = {
      договор: DOCUMENT_TYPES.CONTRACT,
      счет: DOCUMENT_TYPES.INVOICE,
      счёт: DOCUMENT_TYPES.INVOICE,
      чек: DOCUMENT_TYPES.RECEIPT,
      акт: DOCUMENT_TYPES.ACT,
    }
    const documentType = typeMap[normalizedTypeLabel] ?? DOCUMENT_TYPES.OTHER
    const customTypeName =
      documentType === DOCUMENT_TYPES.OTHER
        ? String(type ?? '').trim() || 'Документ'
        : ''
    const title = window.prompt(
      'Название документа',
      getDocumentDefaultTitle(documentType, customTypeName)
    )
    const url = window.prompt('Ссылка на документ')
    const normalizedUrl = String(url ?? '').trim()
    if (!normalizedUrl) return
    onChange?.([
      ...safeDocuments,
      {
        id: createId(),
        type: documentType,
        customTypeName,
        title:
          String(title ?? '').trim() ||
          getDocumentDefaultTitle(documentType, customTypeName),
        url: normalizedUrl,
        file: null,
        createdAt: new Date().toISOString(),
      },
    ])
  }

  const removeDocument = (id) => {
    onChange?.(safeDocuments.filter((document) => document.id !== id))
  }

  const updateDocument = (id, patch) => {
    onChange?.(
      safeDocuments.map((document) =>
        document.id === id ? { ...document, ...patch } : document
      )
    )
  }

  const uploadFile = async (file) => {
    if (!file || !directory) return null
    const uploadItems = await sendFile(
      file,
      null,
      directory,
      null,
      'artistcrm',
      () => {}
    )
    const uploadItem = Array.isArray(uploadItems) ? uploadItems[0] : uploadItems
    const url =
      uploadItem?.url ||
      uploadItem?.secure_url ||
      uploadItem?.href ||
      (uploadItem?.path
        ? `https://cloud.escalion.ru/uploads/${uploadItem.path}`
        : '')
    if (!url) return null
    return {
      name:
        uploadItem?.originalName ||
        uploadItem?.name ||
        uploadItem?.fileName ||
        file.name ||
        'Документ',
      url,
      path: uploadItem?.path || uploadItem?.filePath || '',
      size: file.size ?? uploadItem?.size ?? 0,
      contentType: file.type ?? uploadItem?.type ?? '',
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${noMargin ? '' : 'mt-2'}`}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="action-icon-button action-icon-button--warning flex h-9 w-full cursor-pointer items-center justify-center rounded px-3 text-xs font-semibold tablet:w-auto"
          onClick={addLink}
        >
          Добавить ссылку
        </button>
        <button
          type="button"
          className="action-icon-button action-icon-button--warning flex h-9 w-full cursor-pointer items-center justify-center rounded px-3 text-xs font-semibold tablet:w-auto"
          onClick={() => fileInputRef.current?.click()}
        >
          Прикрепить файл
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          const uploaded = await uploadFile(file)
          if (!uploaded) return
          const type = pendingFileTypeRef.current
          onChange?.([
            ...safeDocuments,
            {
              id: createId(),
              type,
              customTypeName: '',
              title: getDocumentDefaultTitle(type),
              url: '',
              file: uploaded,
              createdAt: new Date().toISOString(),
            },
          ])
        }}
      />
      {safeDocuments.map((document) => (
        <div key={document.id} className="rounded border border-gray-200 p-3">
          <div className="grid grid-cols-1 gap-2 tablet:grid-cols-[160px_1fr]">
            <ComboBox
              label="Тип"
              items={DOCUMENT_TYPE_OPTIONS}
              value={document.type}
              onChange={(value) => {
                const nextType = value || DOCUMENT_TYPES.OTHER
                updateDocument(document.id, {
                  type: nextType,
                  title: getDocumentDefaultTitle(nextType),
                })
              }}
              noMargin
              fullWidth
            />
            <Input
              label="Название"
              value={document.title}
              onChange={(value) => updateDocument(document.id, { title: value })}
              noMargin
              fullWidth
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {document.url || document.file?.name || 'Документ'}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="action-icon-button action-icon-button--warning flex h-8 cursor-pointer items-center justify-center rounded px-3 text-xs font-semibold"
              onClick={() => removeDocument(document.id)}
            >
              Удалить
            </button>
          </div>
        </div>
      ))}
      {safeDocuments.length === 0 ? (
        <div className="rounded border border-gray-200 p-3 text-sm text-gray-500">
          Документы пока не добавлены.
        </div>
      ) : null}
    </div>
  )
}

export default EventDocumentsEditor
```

Note: this first version uses `window.prompt()` to keep the implementation small and consistent with existing project patterns like event type creation. If the UI feels too rough during manual QA, replace prompts with the project modal system in a follow-up task.

- [ ] **Step 2: Run eslint**

Run:

```bash
npx eslint components/EventDocumentsEditor.js
```

Expected: exit code `0`.

- [ ] **Step 3: Commit**

Run:

```bash
git add components/EventDocumentsEditor.js
git commit -m "feat: add event documents editor"
```

---

### Task 8: Event Editor Integration

**Files:**
- Modify: `layouts/modals/modalsFunc/eventFunc.js`
- Modify: `layouts/modals/modalsFunc/historyKeyValuesItems/keys.js`

- [ ] **Step 1: Add imports**

Modify `layouts/modals/modalsFunc/eventFunc.js` imports:

```js
import EventDocumentsEditor from '@components/EventDocumentsEditor'
import {
  DOCUMENT_TYPES,
  getDocumentLastNumberKey,
  getDocumentTypeLabel,
} from '@helpers/documentTypes'
import { normalizeDocumentTemplatesFromSettings } from '@helpers/documentTemplates'
import {
  mergeLegacyEventDocuments,
  normalizeEventDocuments,
} from '@helpers/eventDocuments'
```

- [ ] **Step 2: Replace document state**

Replace separate state usage for `invoiceLinks`, `receiptLinks`, `actLinks`, `contractLinks`, `documentFiles` with:

```js
    const [documents, setDocuments] = useState(() =>
      mergeLegacyEventDocuments(event ?? DEFAULT_EVENT)
    )
```

In `initialEventValues`, add:

```js
        documents: mergeLegacyEventDocuments(event ?? DEFAULT_EVENT),
```

In dependencies that track event reset, use:

```js
      event?.documents,
      event?.invoiceLinks,
      event?.receiptLinks,
      event?.actLinks,
      event?.contractLinks,
      event?.documentFiles,
```

- [ ] **Step 3: Update dirty check**

Replace legacy link/file comparisons with:

```js
        JSON.stringify(initialEventValues.documents ?? []) !==
          JSON.stringify(documents) ||
```

- [ ] **Step 4: Update save payload**

Before payload creation:

```js
      const normalizedDocuments = normalizeEventDocuments(documents)
```

In payload document section:

```js
      if (canUseDocuments) {
        payload.documents = normalizedDocuments
      }
```

Remove new writes to `invoiceLinks`, `receiptLinks`, `actLinks`, `contractLinks`, and `documentFiles` from the payload. Keep legacy fields untouched when not sent.

- [ ] **Step 5: Add template library memo**

Add near document helpers:

```js
    const documentTemplates = useMemo(
      () => normalizeDocumentTemplatesFromSettings(siteSettings?.custom ?? {}),
      [siteSettings?.custom]
    )
```

- [ ] **Step 6: Replace contract/act modal entry points with generic document modal**

Create a new `openDocumentTemplateModal(template)` helper by adapting the current contract/act modal logic:

```js
    const openDocumentTemplateModal = (template) => {
      if (!template) return
      const settingsRef = { current: siteSettings }
      const lastNumberKey = getDocumentLastNumberKey(template.type)
      const currentLastNumber = Number(siteSettings?.custom?.[lastNumberKey])
      const nextDefaultNumber =
        Number.isFinite(currentLastNumber) && currentLastNumber > 0
          ? currentLastNumber + 1
          : 1
      const now = new Date()
      const defaultDocumentDate = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const numberRef = { current: String(nextDefaultNumber) }
      const dateRef = { current: defaultDocumentDate }
      const clientRef = { current: selectedClient }

      const updateLastDocumentNumber = async (value) => {
        const parsed = Number(String(value ?? '').trim())
        if (!Number.isFinite(parsed) || parsed <= 0) return
        const currentSettings = settingsRef.current
        const previous = Number(currentSettings?.custom?.[lastNumberKey])
        if (Number.isFinite(previous) && previous >= parsed) return
        await postData(
          '/api/site',
          {
            custom: {
              ...(currentSettings?.custom ?? {}),
              [lastNumberKey]: parsed,
            },
          },
          (data) => setSiteSettings(data),
          null,
          false,
          loggedUser?._id
        )
      }

      const DocumentTemplatePreview = () => {
        const [documentNumber, setDocumentNumber] = useState(
          String(nextDefaultNumber)
        )
        const [documentDate, setDocumentDate] = useState(defaultDocumentDate)

        useEffect(() => {
          numberRef.current = documentNumber
        }, [documentNumber])
        useEffect(() => {
          dateRef.current = documentDate
        }, [documentDate])

        return (
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-600">
              {template.name} ·{' '}
              {getDocumentTypeLabel(template.type, template.customTypeName)}
            </div>
            <div className="mt-1.5 flex items-end gap-2">
              <Input
                label="№ документа"
                value={documentNumber}
                onChange={setDocumentNumber}
                type="number"
                min={1}
                noMargin
                className="w-[104px]"
                inputClassName="hide-number-spin w-[35px]"
              />
              <Input
                label="Дата документа"
                value={documentDate}
                onChange={setDocumentDate}
                type="date"
                noMargin
                className="w-[150px]"
              />
            </div>
          </div>
        )
      }

      modalsFunc.add({
        title: 'Формирование документа',
        confirmButtonName: 'Скачать Word (.docx)',
        declineButtonName: 'Закрыть',
        showDecline: true,
        onConfirm: async () => {
          const documentNumber = numberRef.current
          const documentDate = dateRef.current
          const fileName = `${template.name} №${String(documentNumber || '').trim() || '1'} от ${formatDateForDocFileName(documentDate) || formatDateForDocFileName(new Date())}.docx`
          const variablesBuilder =
            template.type === DOCUMENT_TYPES.ACT
              ? buildActTemplateVariables
              : buildContractTemplateVariables
          const variables = variablesBuilder(
            documentNumber,
            documentDate,
            settingsRef.current,
            'docx',
            clientRef.current
          )
          await exportDocxFromTemplate({
            templateBase64: template.templateBase64,
            fileName,
            variables,
          })
          await updateLastDocumentNumber(documentNumber)
        },
        Children: DocumentTemplatePreview,
      })
    }
```

Use contract variable mapping for `contract`, `invoice`, `receipt`, and `other` on the first release. Use act mapping only for `act`.

- [ ] **Step 7: Replace buttons in finance/documents tab**

Replace current `Сформировать договор` / `Сформировать акт` buttons and separate link editors with:

```jsx
{isByContract && canUseDocuments && (
  <LabeledContainer label="Сформировать документ" noMargin>
    <div className="flex w-full flex-col gap-2">
      {documentTemplates.length === 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Загрузите DOCX-шаблоны на странице Документы.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {documentTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="action-icon-button action-icon-button--warning flex h-10 w-full cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold tablet:w-auto"
              onClick={() => openDocumentTemplateModal(template)}
            >
              {template.name}
            </button>
          ))}
        </div>
      )}
    </div>
  </LabeledContainer>
)}
{isByContract && !isDraft && canUseDocuments && (
  <LabeledContainer label="Документы мероприятия" noMargin>
    <EventDocumentsEditor
      documents={documents}
      onChange={setDocuments}
      directory={documentsUploadBaseDirectory}
      noMargin
    />
  </LabeledContainer>
)}
```

- [ ] **Step 8: Add history label**

Modify `layouts/modals/modalsFunc/historyKeyValuesItems/keys.js`:

```js
  documents: 'Документы мероприятия',
```

- [ ] **Step 9: Run eslint**

Run:

```bash
npx eslint layouts/modals/modalsFunc/eventFunc.js components/EventDocumentsEditor.js layouts/modals/modalsFunc/historyKeyValuesItems/keys.js
```

Expected: exit code `0`.

- [ ] **Step 10: Commit**

Run:

```bash
git add layouts/modals/modalsFunc/eventFunc.js components/EventDocumentsEditor.js layouts/modals/modalsFunc/historyKeyValuesItems/keys.js
git commit -m "feat: generate and attach typed event documents"
```

---

### Task 9: Documentation, Roadmap, and Version

**Files:**
- Modify: `docs/DOCX_DOCUMENTS_GUIDE.md`
- Modify: `docs/ROADMAP.md`
- Modify: `package.json`

- [ ] **Step 1: Update DOCX guide**

Modify `docs/DOCX_DOCUMENTS_GUIDE.md`:

```md
## Где включается в интерфейсе

1. Откройте `Документы`.
2. Нажмите `Добавить шаблон`.
3. Задайте название шаблона, выберите тип документа (`Договор`, `Счет`, `Чек`, `Акт`, `Другое`) и загрузите `.docx`.
4. В редакторе мероприятия откройте `Финансы и Документы`, выберите нужный шаблон и скачайте Word-файл.
5. После формирования прикрепите файл или ссылку в блоке `Документы мероприятия`.

## Где хранятся шаблоны

Пользовательские шаблоны сохраняются в `SiteSettings.custom.documentTemplates[]`.

Legacy-поля `contractDocxTemplateBase64` и `actDocxTemplateBase64` поддерживаются только на переходный период.
```

Keep the existing variables sections for contract and act.

- [ ] **Step 2: Update roadmap**

In `docs/ROADMAP.md`, add a Documents UX track or a Sprint 2 follow-up item:

```md
### Documents UX Track: шаблоны и документы мероприятий

- [x] DOC-T1 Добавить библиотеку пользовательских DOCX-шаблонов с названием и типом документа.
- [x] DOC-T2 Объединить ссылки и файлы мероприятия в единый блок `Документы мероприятия`.
- [x] DOC-T3 Подготовить миграции legacy-шаблонов и legacy-документов мероприятий.
```

Add a dated line to `Журнал изменений плана` or `Выполнено`:

```md
- 2026-07-03: добавлена библиотека пользовательских DOCX-шаблонов, единый блок документов мероприятия и миграции legacy-документов.
```

- [ ] **Step 3: Patch-bump version**

Modify `package.json`:

```json
"version": "1.4.7"
```

- [ ] **Step 4: Run docs/package sanity**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package ok')"
```

Expected: prints `package ok`.

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/DOCX_DOCUMENTS_GUIDE.md docs/ROADMAP.md package.json
git commit -m "docs: update document templates guide"
```

---

### Task 10: Final Verification

**Files:**
- Verify all changed files

- [ ] **Step 1: Run focused tests**

Run:

```bash
node --test helpers/documentTemplates.test.js helpers/eventDocuments.test.js server/eventApiNormalization.test.js
```

Expected: exit code `0`.

- [ ] **Step 2: Run focused eslint**

Run:

```bash
npx eslint helpers/documentTypes.js helpers/documentTemplates.js helpers/documentTemplates.test.js helpers/eventDocuments.js helpers/eventDocuments.test.js server/eventApiNormalization.js server/eventApiNormalization.test.js schemas/eventsSchema.js helpers/constants.js app/api/events/route.js app/api/events/[id]/route.js scripts/migrate-event-documents.js scripts/migrate-document-templates.js layouts/content/DocumentsContent.js components/EventDocumentsEditor.js layouts/modals/modalsFunc/eventFunc.js layouts/modals/modalsFunc/historyKeyValuesItems/keys.js
```

Expected: exit code `0`.

- [ ] **Step 3: Start dev server**

Run:

```bash
npm run dev
```

Expected: Next.js starts and prints a local URL. Keep the session running for manual browser checks.

- [ ] **Step 4: Manual browser checks**

Open the local URL and verify:

- `Документы` page shows `Шаблоны документов`.
- Adding a DOCX template with name and type works.
- A file larger than 5 MB is rejected with a clear error.
- Event editor `Финансы и Документы` shows template buttons.
- DOCX download still works for a contract template.
- `Документы мероприятия` shows one combined list.
- Adding a link creates one typed document.
- Existing events with legacy links/files still display through normalization.
- Mobile width does not overflow in the documents blocks.

- [ ] **Step 5: Stop dev server**

Stop the `npm run dev` session with `Ctrl+C`.

- [ ] **Step 6: Final git status**

Run:

```bash
git status --short
```

Expected: clean working tree.
