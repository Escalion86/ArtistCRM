import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { api } from '../../shared/api/client'
import {
  Button,
  ErrorNotice,
  Field,
  SectionTitle,
  Surface,
} from '../../shared/ui/components'
import { colors, radius, spacing } from '../../shared/ui/theme'

type ArtistStatus = 'individual_entrepreneur' | 'self_employed'
type ArtistRequisites = {
  artistStatus: ArtistStatus
  artistFullName: string
  artistName: string
  artistOgrnip: string
  artistInn: string
  artistBankName: string
  artistBik: string
  artistCheckingAccount: string
  artistCorrespondentAccount: string
  artistLegalAddress: string
}

const emptyRequisites: ArtistRequisites = {
  artistStatus: 'individual_entrepreneur',
  artistFullName: '',
  artistName: '',
  artistOgrnip: '',
  artistInn: '',
  artistBankName: '',
  artistBik: '',
  artistCheckingAccount: '',
  artistCorrespondentAccount: '',
  artistLegalAddress: '',
}

export function ArtistRequisitesSection() {
  const [value, setValue] = useState<ArtistRequisites>(emptyRequisites)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    api.get<{ success: true; data: ArtistRequisites }>('/mobile/v1/profile/requisites')
      .then((response) => { if (active) setValue(response.data) })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить реквизиты')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const update = (field: keyof ArtistRequisites, next: string) => {
    setValue((current) => ({ ...current, [field]: next }))
    setMessage('')
  }

  const save = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await api.patch<{ success: true; data: ArtistRequisites }>(
        '/mobile/v1/profile/requisites',
        value
      )
      setValue(response.data)
      setMessage('Реквизиты сохранены и будут использоваться в новых документах')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить реквизиты')
    } finally {
      setLoading(false)
    }
  }

  return <Surface>
    <SectionTitle>Реквизиты артиста</SectionTitle>
    <Text style={styles.hint}>Используются при генерации договоров и актов.</Text>
    <View style={styles.switchRow}>
      <StatusButton
        title="ИП"
        selected={value.artistStatus === 'individual_entrepreneur'}
        onPress={() => update('artistStatus', 'individual_entrepreneur')}
      />
      <StatusButton
        title="Самозанятый"
        selected={value.artistStatus === 'self_employed'}
        onPress={() => update('artistStatus', 'self_employed')}
      />
    </View>
    <Field testID="artist-full-name" label="ФИО для документов" value={value.artistFullName} onChangeText={(text) => update('artistFullName', text)} />
    <Field label="Наименование артиста" value={value.artistName} onChangeText={(text) => update('artistName', text)} />
    {value.artistStatus === 'individual_entrepreneur' ? <Field label="ОГРНИП" value={value.artistOgrnip} onChangeText={(text) => update('artistOgrnip', text)} keyboardType="number-pad" /> : null}
    <Field label="ИНН" value={value.artistInn} onChangeText={(text) => update('artistInn', text)} keyboardType="number-pad" />
    <Field label="Банк" value={value.artistBankName} onChangeText={(text) => update('artistBankName', text)} />
    <Field label="БИК" value={value.artistBik} onChangeText={(text) => update('artistBik', text)} keyboardType="number-pad" />
    <Field label="Расчётный счёт" value={value.artistCheckingAccount} onChangeText={(text) => update('artistCheckingAccount', text)} keyboardType="number-pad" />
    <Field label="Корреспондентский счёт" value={value.artistCorrespondentAccount} onChangeText={(text) => update('artistCorrespondentAccount', text)} keyboardType="number-pad" />
    <Field label="Юридический адрес" value={value.artistLegalAddress} onChangeText={(text) => update('artistLegalAddress', text)} multiline />
    {error ? <ErrorNotice message={error} /> : null}
    {message ? <Text style={styles.success}>{message}</Text> : null}
    <Button testID="save-artist-requisites" title="Сохранить реквизиты" onPress={save} loading={loading} />
  </Surface>
}

const StatusButton = ({
  title,
  selected,
  onPress,
}: {
  title: string
  selected: boolean
  onPress: () => void
}) => <Pressable
  accessibilityRole="button"
  accessibilityState={{ selected }}
  style={[styles.statusButton, selected && styles.statusButtonSelected]}
  onPress={onPress}
>
  <Text style={[styles.statusText, selected && styles.statusTextSelected]}>{title}</Text>
</Pressable>

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  switchRow: { flexDirection: 'row', gap: spacing.sm },
  statusButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  statusButtonSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  statusText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  statusTextSelected: { color: colors.primary },
  success: { color: colors.success, fontSize: 13, lineHeight: 18 },
})
