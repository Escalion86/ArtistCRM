import { useEffect, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import { api } from '../../../../src/shared/api/client'
import type { DocumentTemplate } from '../../../../src/shared/domain/types'
import {
  Button,
  ErrorNotice,
  Field,
  PageHeader,
  Screen,
  SectionTitle,
  Surface,
} from '../../../../src/shared/ui/components'
import { colors, radius, spacing } from '../../../../src/shared/ui/theme'

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const types: Array<[DocumentTemplate['type'], string]> = [
  ['contract', 'Договор'],
  ['act', 'Акт'],
  ['invoice', 'Счёт'],
  ['receipt', 'Чек'],
  ['other', 'Другое'],
]

type PickedFile = {
  uri: string
  name: string
  mimeType?: string | null
  size?: number | null
}

export default function DocumentTemplateEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const isNew = id === 'new'
  const [name, setName] = useState('')
  const [type, setType] = useState<DocumentTemplate['type']>('contract')
  const [customTypeName, setCustomTypeName] = useState('')
  const [currentFileName, setCurrentFileName] = useState('')
  const [file, setFile] = useState<PickedFile | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew) return
    api.get<{ success: true; data: DocumentTemplate[] }>(
      '/mobile/v1/document-templates'
    ).then((response) => {
      const template = response.data.find((item) => item.id === id)
      if (!template) throw new Error('Шаблон не найден')
      setName(template.name)
      setType(template.type)
      setCustomTypeName(template.customTypeName || '')
      setCurrentFileName(template.fileName)
    }).catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить шаблон')
    }).finally(() => setLoading(false))
  }, [id, isNew])

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [DOCX_MIME],
      copyToCacheDirectory: true,
      multiple: false,
    })
    if (result.canceled) return
    const asset = result.assets[0]
    if (Number(asset.size || 0) > 5 * 1024 * 1024) {
      setError('Размер DOCX-шаблона не должен превышать 5 МБ')
      return
    }
    if (!asset.name.toLowerCase().endsWith('.docx')) {
      setError('Выберите файл в формате DOCX')
      return
    }
    setFile(asset)
    setCurrentFileName(asset.name)
    if (!name.trim()) setName(asset.name.replace(/\.docx$/i, ''))
    setError('')
  }

  const save = async () => {
    if (!name.trim()) {
      setError('Введите название шаблона')
      return
    }
    if (isNew && !file) {
      setError('Выберите DOCX-файл')
      return
    }
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      if (!isNew) form.append('id', id)
      form.append('name', name.trim())
      form.append('type', type)
      form.append('customTypeName', customTypeName.trim())
      if (file) {
        form.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || DOCX_MIME,
        } as unknown as Blob)
      }
      await api.upload('/mobile/v1/document-templates', form)
      router.back()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить шаблон')
    } finally {
      setLoading(false)
    }
  }

  const remove = () => Alert.alert(
    'Удалить шаблон?',
    'Существующие сформированные документы не изменятся.',
    [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          setLoading(true)
          try {
            await api.delete('/mobile/v1/document-templates', { id })
            router.back()
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Не удалось удалить шаблон')
            setLoading(false)
          }
        },
      },
    ]
  )

  return (
    <Screen>
      <PageHeader
        title={isNew ? 'Новый DOCX-шаблон' : 'Редактирование шаблона'}
        subtitle="Файл до 5 МБ; переменные указываются в фигурных скобках"
      />
      <Surface>
        <Field testID="template-name" label="Название *" value={name} onChangeText={setName} />
        <SectionTitle>Тип документа</SectionTitle>
        <View style={styles.options}>
          {types.map(([value, label]) => (
            <Pressable
              key={value}
              style={[styles.option, type === value && styles.optionActive]}
              onPress={() => setType(value)}
            >
              <Text style={[styles.optionText, type === value && styles.optionTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {type === 'other' ? (
          <Field
            label="Название типа"
            value={customTypeName}
            onChangeText={setCustomTypeName}
          />
        ) : null}
        <View style={styles.fileInfo}>
          <Text style={styles.fileLabel}>DOCX-файл</Text>
          <Text style={styles.fileName}>{currentFileName || 'Файл не выбран'}</Text>
        </View>
        <Button
          testID="pick-template-file"
          title={currentFileName ? 'Заменить DOCX-файл' : 'Выбрать DOCX-файл'}
          variant="secondary"
          onPress={pickFile}
          disabled={loading}
        />
        {error ? <ErrorNotice message={error} /> : null}
        <Button testID="save-template" title="Сохранить шаблон" onPress={save} loading={loading} />
      </Surface>
      {!isNew ? (
        <Button testID="delete-template" title="Удалить шаблон" variant="danger" onPress={remove} disabled={loading} />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  optionActive: { backgroundColor: colors.primary },
  optionText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  optionTextActive: { color: '#fff' },
  fileInfo: { gap: spacing.xs },
  fileLabel: { color: colors.textMuted, fontSize: 12 },
  fileName: { color: colors.text, fontSize: 14, fontWeight: '700' },
})
