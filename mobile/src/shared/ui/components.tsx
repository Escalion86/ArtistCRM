import type { PropsWithChildren, ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
  type ViewProps,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radius, spacing } from './theme'

export const Screen = ({
  children,
  scroll = true,
  contentStyle,
}: PropsWithChildren<{ scroll?: boolean; contentStyle?: StyleProp<ViewStyle> }>) => {
  const content = <View style={[styles.screenContent, contentStyle]}>{children}</View>
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  )
}

export const PageHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) => (
  <View style={styles.pageHeader}>
    <View style={styles.pageHeaderText}>
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
    </View>
    {action}
  </View>
)

export const Surface = ({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) => (
  <View style={[styles.surface, style]} {...props}>
    {children}
  </View>
)

export const SectionTitle = ({ children }: PropsWithChildren) => (
  <Text style={styles.sectionTitle}>{children}</Text>
)

type ButtonProps = PressableProps & {
  title: string
  loading?: boolean
  loadingTitle?: string
  variant?: 'primary' | 'secondary' | 'danger'
}

export const Button = ({
  title,
  loading = false,
  loadingTitle,
  variant = 'primary',
  disabled,
  style,
  ...props
}: ButtonProps) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled || loading}
    style={(state) => [
      styles.button,
      variant === 'secondary' && styles.buttonSecondary,
      variant === 'danger' && styles.buttonDanger,
      state.pressed && styles.buttonPressed,
      (disabled || loading) && styles.buttonDisabled,
      typeof style === 'function' ? style(state) : style,
    ]}
    {...props}
  >
    {loading ? (
      <View style={styles.buttonLoadingContent}>
        <ActivityIndicator
          color={variant === 'secondary' ? colors.text : '#FFFFFF'}
        />
        {loadingTitle ? (
          <Text
            style={[
              styles.buttonText,
              variant === 'secondary' && styles.buttonSecondaryText,
            ]}
          >
            {loadingTitle}
          </Text>
        ) : null}
      </View>
    ) : (
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.buttonSecondaryText,
        ]}
      >
        {title}
      </Text>
    )}
  </Pressable>
)

export const Field = ({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[
        styles.field,
        error ? styles.fieldError : null,
        props.multiline && styles.fieldMultiline,
      ]}
      {...props}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
)

export const StatusChip = ({
  label,
  tone = 'neutral',
}: {
  label: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'blue'
}) => (
  <View
    style={[
      styles.chip,
      tone === 'success' && styles.chipSuccess,
      tone === 'warning' && styles.chipWarning,
      tone === 'danger' && styles.chipDanger,
      tone === 'blue' && styles.chipBlue,
    ]}
  >
    <Text style={styles.chipText}>{label}</Text>
  </View>
)

export const EmptyState = ({
  title,
  description,
}: {
  title: string
  description: string
}) => (
  <View style={styles.empty}>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyDescription}>{description}</Text>
  </View>
)

export const ErrorNotice = ({ message }: { message: string }) => (
  <View style={styles.errorNotice}>
    <Text style={styles.errorNoticeText}>{message}</Text>
  </View>
)

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  screenContent: {
    flex: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 96,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pageHeaderText: { flex: 1 },
  pageTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDanger: { backgroundColor: colors.danger },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.5 },
  buttonLoadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  buttonSecondaryText: { color: colors.text },
  fieldWrap: { gap: 6 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  field: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  fieldMultiline: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  fieldError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12 },
  chip: {
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipSuccess: { backgroundColor: colors.successSoft },
  chipWarning: { backgroundColor: colors.warningSoft },
  chipDanger: { backgroundColor: colors.dangerSoft },
  chipBlue: { backgroundColor: colors.blueSoft },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    gap: spacing.sm,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptyDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorNotice: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorNoticeText: { color: colors.danger, fontSize: 13, lineHeight: 18 },
})
