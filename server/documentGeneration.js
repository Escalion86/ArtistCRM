import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import {
  replacePartiesTablesInXml,
  toDocxtemplaterData,
  toDocxTemplateKey,
} from '../helpers/exportDocxFromTemplate.js'

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const renderDocxTemplate = ({ templateBase64, variables = {} }) => {
  const bytes = Buffer.from(String(templateBase64 || '').trim(), 'base64')
  if (!bytes.length) throw new Error('DOCX_TEMPLATE_EMPTY')

  const zip = new PizZip(bytes)
  const normalizedData = toDocxtemplaterData(variables)
  const document = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    parser: (rawTag) => {
      const key = toDocxTemplateKey(rawTag)
      return { get: () => normalizedData[key] ?? '' }
    },
  })
  document.render(normalizedData)

  const resultZip = document.getZip()
  const documentXml = resultZip.file('word/document.xml')
  if (documentXml) {
    const source = documentXml.asText()
    const result = replacePartiesTablesInXml(source, {
      DOMParserImpl: DOMParser,
      XMLSerializerImpl: XMLSerializer,
    })
    if (result !== source) resultZip.file('word/document.xml', result)
  }

  return resultZip.generate({ type: 'nodebuffer', mimeType: DOCX_MIME })
}

export { DOCX_MIME, renderDocxTemplate }
