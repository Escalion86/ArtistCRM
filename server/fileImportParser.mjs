import PizZip from 'pizzip'
import { DOMParser } from '@xmldom/xmldom'
import { posix } from 'node:path'
import { createHash } from 'node:crypto'
import { inflateRawSync } from 'node:zlib'
import {
  FILE_IMPORT_MAX_CHARS,
  FileImportError,
  validateImportFile,
} from '../helpers/fileImport.mjs'

const descendants = (node, name) =>
  Array.from(node.getElementsByTagName('*')).filter(
    (item) => item.localName === name
  )
const content = (node, name) =>
  descendants(node, name)
    .map((item) => item.textContent)
    .join('')

const xml = (zip, path) => {
  const entry = zip.file(path)
  if (!entry) throw new FileImportError('Повреждена структура документа.')
  const compressed = entry._data
  let source
  try {
    const bytes = Buffer.from(compressed.getCompressedContent())
    const plain =
      compressed.compressionMethod === '\x08\x00'
        ? inflateRawSync(bytes, { maxOutputLength: 20 * 1024 * 1024 })
        : bytes
    if (plain.length !== compressed.uncompressedSize)
      throw new Error('Size mismatch')
    source = plain.toString('utf8')
  } catch {
    throw new FileImportError(
      'Повреждённый или слишком большой XML внутри документа.'
    )
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(source))
    throw new FileImportError(
      'Документ содержит неподдерживаемые XML-объявления.'
    )
  let invalid = false
  const document = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: () => {
        invalid = true
      },
      fatalError: () => {
        invalid = true
      },
    },
  }).parseFromString(source, 'text/xml')
  if (invalid || !document.documentElement)
    throw new FileImportError('Не удалось прочитать структуру документа.')
  return document
}

const readZip = (buffer) => {
  let zip
  try {
    zip = new PizZip(buffer)
  } catch {
    throw new FileImportError(
      'Файл повреждён, защищён паролем или не соответствует расширению.'
    )
  }
  const entries = Object.values(zip.files)
  const size = entries.reduce(
    (sum, entry) => sum + Number(entry._data?.uncompressedSize || 0),
    0
  )
  if (entries.length > 2000 || size > 20 * 1024 * 1024)
    throw new FileImportError(
      'Распакованный документ слишком большой (максимум 20 МБ).'
    )
  if (entries.some((entry) => /vbaProject\.bin$/i.test(entry.name)))
    throw new FileImportError('Документы с макросами не поддерживаются.')
  return zip
}

export const parseCsv = (source) => {
  const counts = new Map([
    [';', 0],
    [',', 0],
    ['\t', 0],
  ])
  let inQuotes = false,
    sampledRows = 0
  for (let i = 0; i < source.length && sampledRows < 10; i++) {
    const char = source[i]
    if (char === '"') {
      if (inQuotes && source[i + 1] === '"') i++
      else inQuotes = !inQuotes
    } else if (!inQuotes && counts.has(char))
      counts.set(char, counts.get(char) + 1)
    else if (!inQuotes && char === '\n') sampledRows++
  }
  const separator = [...counts].sort((a, b) => b[1] - a[1])[0][0]
  const rows = []
  let row = [],
    cell = '',
    quoted = false
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"'
        i++
      } else if (quoted || !cell) quoted = !quoted
      else cell += char
    } else if (char === separator && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  if (quoted)
    throw new FileImportError('В CSV не закрыты кавычки. Проверьте файл.')
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

const readText = (buffer) => {
  if (buffer.subarray(0, 2).equals(Buffer.from([0xff, 0xfe])))
    return new TextDecoder('utf-16le').decode(buffer)
  if (buffer.subarray(0, 2).equals(Buffer.from([0xfe, 0xff])))
    return new TextDecoder('utf-16be').decode(buffer)
  if (buffer.includes(0))
    throw new FileImportError('Файл содержит двоичные данные вместо текста.')
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1251').decode(buffer)
  }
}

export const extractImportFile = (name, buffer) => {
  const extension = validateImportFile(name, buffer.length)
  if (/^(%PDF|\x89PNG|GIF8)/.test(buffer.subarray(0, 8).toString('latin1')))
    throw new FileImportError(
      'PDF и изображения не поддерживаются, даже с изменённым расширением.'
    )
  const lines = [],
    warnings = []
  let characters = 0
  const add = (section, location, value) => {
    const text = value.replace(/\u0000/g, '').trim()
    if (!text) return
    characters += text.length
    if (characters > FILE_IMPORT_MAX_CHARS || lines.length >= 1500)
      throw new FileImportError(
        'В файле слишком много текста. Разделите его на части до 80 000 символов и 1500 строк.'
      )
    lines.push({ id: `L${lines.length + 1}`, section, location, text })
  }
  if (extension === 'txt' || extension === 'csv') {
    const source = readText(buffer).replace(/^\uFEFF/, '')
    if (extension === 'txt')
      source.split(/\r?\n/).forEach((line, i) => add('Текст', i + 1, line))
    else
      parseCsv(source).forEach((row, i) => {
        if (row.some((value) => value.trim()))
          add(
            'Таблица',
            i + 1,
            row.map((value, col) => `[${col + 1}] ${value}`).join(' | ')
          )
      })
  } else {
    const zip = readZip(buffer)
    if (Object.keys(zip.files).some((path) => /^(word|xl)\/media\//.test(path)))
      warnings.push(
        'Встроенные изображения пропущены. Обрабатываются только текст и таблицы.'
      )
    if (extension === 'docx') {
      const document = xml(zip, 'word/document.xml')
      const body = descendants(document, 'body')[0]
      if (!body) throw new FileImportError('В DOCX отсутствует основной текст.')
      let location = 0
      for (const node of Array.from(body.childNodes)) {
        if (node.localName === 'tbl') {
          for (const row of descendants(node, 'tr'))
            add(
              'Таблица DOCX',
              ++location,
              Array.from(row.childNodes)
                .filter((cell) => cell.localName === 'tc')
                .map((cell) =>
                  descendants(cell, 'p')
                    .map((p) => content(p, 't'))
                    .join(' / ')
                )
                .join(' | ')
            )
        } else if (node.localName === 'p')
          add('Текст DOCX', ++location, content(node, 't'))
      }
    } else {
      const workbook = xml(zip, 'xl/workbook.xml')
      const relationships = xml(zip, 'xl/_rels/workbook.xml.rels')
      const shared = zip.file('xl/sharedStrings.xml')
        ? descendants(xml(zip, 'xl/sharedStrings.xml'), 'si').map((node) =>
            content(node, 't')
          )
        : []
      const styles = zip.file('xl/styles.xml')
        ? xml(zip, 'xl/styles.xml')
        : null
      const formats = new Map(
        styles
          ? descendants(styles, 'numFmt').map((node) => [
              Number(node.getAttribute('numFmtId')),
              node.getAttribute('formatCode'),
            ])
          : []
      )
      const cellXfs = styles && descendants(styles, 'cellXfs')[0]
      const dateStyles = cellXfs
        ? descendants(cellXfs, 'xf').map((node) => {
            const id = Number(node.getAttribute('numFmtId'))
            return (
              (id >= 14 && id <= 22) ||
              (id >= 45 && id <= 47) ||
              /[ymdhis]/i.test(
                (formats.get(id) || '').replace(/"[^"]*"|\[[^\]]*\]|\\./g, '')
              )
            )
          })
        : []
      const date1904 = ['1', 'true'].includes(
        descendants(workbook, 'workbookPr')[0]?.getAttribute('date1904')
      )
      for (const sheet of descendants(workbook, 'sheet')) {
        const relation = descendants(relationships, 'Relationship').find(
          (node) => node.getAttribute('Id') === sheet.getAttribute('r:id')
        )
        if (!relation || relation.getAttribute('TargetMode') === 'External')
          throw new FileImportError('Неподдерживаемая ссылка на лист XLSX.')
        const target = relation.getAttribute('Target')
        const path = target.startsWith('/')
          ? target.slice(1)
          : posix.normalize(`xl/${target}`)
        if (!path.startsWith('xl/worksheets/'))
          throw new FileImportError('Неподдерживаемый лист XLSX.')
        const document = xml(zip, path)
        for (const row of descendants(document, 'row')) {
          const cells = descendants(row, 'c')
            .map((cell) => {
              const type = cell.getAttribute('t')
              const raw = content(cell, 'v')
              let value =
                type === 's'
                  ? shared[Number(raw)] || ''
                  : type === 'inlineStr'
                    ? content(cell, 't')
                    : raw
              if (
                raw &&
                (!type || type === 'n') &&
                dateStyles[Number(cell.getAttribute('s') || 0)]
              ) {
                const serial = Number(raw)
                if (Number.isFinite(serial)) {
                  value = new Date(
                    Math.round((serial - (date1904 ? 24107 : 25569)) * 86400000)
                  )
                    .toISOString()
                    .replace(/\.000Z$/, '')
                  if (serial >= 0 && serial < 1) value = value.slice(11, 19)
                }
              }
              if (!value && descendants(cell, 'f').length)
                warnings.push(
                  'Формулы без сохранённых значений пропущены. Сохраните расчёт в редакторе таблиц, если эти значения нужны.'
                )
              return value ? `${cell.getAttribute('r')}: ${value}` : ''
            })
            .filter(Boolean)
          add(
            sheet.getAttribute('name') || 'Лист',
            row.getAttribute('r'),
            cells.join(' | ')
          )
        }
        if (descendants(document, 'mergeCell').length)
          warnings.push(
            `Лист «${sheet.getAttribute('name')}» содержит объединённые ячейки: их текст находится в первой ячейке диапазона.`
          )
      }
    }
  }
  if (!lines.length)
    throw new FileImportError('В файле нет текста или заполненных таблиц.')
  return {
    fileName: String(name).replace(/[\\/]/g, '_').slice(0, 200),
    fileHash: createHash('sha256').update(buffer).digest('hex'),
    lines,
    characters,
    warnings: [...new Set(warnings)],
  }
}
