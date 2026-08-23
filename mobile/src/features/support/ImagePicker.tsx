import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, radius, spacing } from '../../shared/ui/theme'
import type { SelectedSupportImage } from './types'
import { validateSelectedSupportImages } from './files'

export function SupportImagePicker({ images, onChange, onError, disabled = false }: { images: SelectedSupportImage[]; onChange: (images: SelectedSupportImage[]) => void; onError: (message: string) => void; disabled?: boolean }) {
  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'image/webp'], multiple: true, copyToCacheDirectory: true })
    if (result.canceled) return
    const selected = result.assets.map((asset) => ({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || '', size: asset.size || 0 }))
    const validation = validateSelectedSupportImages(images, selected)
    if (!validation.ok) return onError(validation.error)
    onError('')
    onChange(validation.images)
  }
  return <View style={styles.wrapper}>{images.length ? <View style={styles.previews}>{images.map((image, index) => <View key={`${image.uri}-${index}`} style={styles.preview}><Image source={{ uri: image.uri }} style={styles.image} accessibilityLabel={image.name} /><Pressable disabled={disabled} accessibilityLabel={`Удалить ${image.name}`} style={styles.remove} onPress={() => onChange(images.filter((_, itemIndex) => itemIndex !== index))}><MaterialCommunityIcons name="close" size={17} color="#fff" /></Pressable></View>)}</View> : null}{images.length < 5 ? <Pressable disabled={disabled} style={[styles.button, disabled && styles.disabled]} onPress={pick}><MaterialCommunityIcons name="image-plus" size={20} color={colors.primary} /><Text style={styles.buttonText}>Прикрепить изображения</Text></Pressable> : null}<Text style={styles.hint}>JPEG, PNG или WebP · до 5 файлов по 10 МБ</Text></View>
}

const styles = StyleSheet.create({ wrapper: { gap: spacing.sm }, previews: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, preview: { width: 76, height: 76, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }, image: { width: '100%', height: '100%' }, remove: { position: 'absolute', right: 4, top: 4, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.7)' }, button: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md }, buttonText: { color: colors.primary, fontWeight: '700' }, hint: { color: colors.textMuted, fontSize: 12 }, disabled: { opacity: .5 } })
