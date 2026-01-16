'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import Input from '@components/Input'

const normalizePhone = (value) => {
  if (!value) return ''
  const digits = String(value).replace(/[^\d]/g, '')
  if (digits.length === 10) return `7${digits}`
  if (digits.length === 11 && digits.startsWith('8'))
    return `7${digits.slice(1)}`
  return digits
}

function validate_login(
  event,
  phone,
  password,
  setSubmitting,
  phoneDigits,
  setPhoneHint
) {
  event.preventDefault()
  if (!phone || !password) return
  setPhoneHint(false)
  setSubmitting(true)

  signIn('credentials', {
    phone,
    password,
    redirect: false,
  })
    .then((result) => {
      if (result?.error) {
        if (phoneDigits !== 11) {
          setPhoneHint(true)
        }
        alert('Неверный телефон или пароль')
      } else {
        window.location.replace('/cabinet')
      }
    })
    .catch((err) => {
      alert(`Error Occured: ${err}`)
    })
    .finally(() => {
      setSubmitting(false)
    })
}

const LoginInputs = () => {
  const [mode, setMode] = useState('login')
  const [loginPhone, setLoginPhone] = useState(null)
  const [loginPassword, setLoginPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetPhone, setResetPhone] = useState(null)
  const [resetPassword, setResetPassword] = useState('')
  const [isResetLoading, setIsResetLoading] = useState(false)
  const [registerPhone, setRegisterPhone] = useState(null)
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPasswordRepeat, setRegisterPasswordRepeat] = useState('')
  const [isRegisterLoading, setIsRegisterLoading] = useState(false)
  const [loginPhoneHint, setLoginPhoneHint] = useState(false)
  const [resetPhoneHint, setResetPhoneHint] = useState(false)
  const [registerPhoneHint, setRegisterPhoneHint] = useState(false)
  const loginPhoneDigits = String(normalizePhone(loginPhone)).length
  const resetPhoneDigits = String(normalizePhone(resetPhone)).length
  const registerPhoneDigits = String(normalizePhone(registerPhone)).length

  const submitReset = async (event) => {
    event.preventDefault()
    if (!resetPhone || !resetPassword) return
    setIsResetLoading(true)
    setResetPhoneHint(false)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: normalizePhone(resetPhone),
          newPassword: resetPassword,
        }),
      })
      const json = await res.json()
      if (!res.ok || json?.success === false) {
        if (json?.error === 'INVALID_PHONE_LENGTH') {
          setResetPhoneHint(true)
        }
        alert(json?.error || 'Не удалось восстановить пароль')
        return
      }
      alert('Пароль обновлен. Войдите с новым паролем.')
      setResetPhone('')
      setResetPassword('')
      setMode('login')
    } catch (error) {
      alert('Не удалось восстановить пароль')
    } finally {
      setIsResetLoading(false)
    }
  }

  const submitRegister = async (event) => {
    event.preventDefault()
    if (!registerPhone || !registerPassword || !registerPasswordRepeat) return
    if (registerPassword !== registerPasswordRepeat) {
      alert('Пароли не совпадают')
      return
    }
    setIsRegisterLoading(true)
    setRegisterPhoneHint(false)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: normalizePhone(registerPhone),
          password: registerPassword,
        }),
      })
      const json = await res.json()
      if (!res.ok || json?.success === false) {
        if (json?.error === 'INVALID_PHONE_LENGTH') {
          setRegisterPhoneHint(true)
        }
        alert(json?.error || 'Не удалось зарегистрироваться')
        return
      }
      const signInResult = await signIn('credentials', {
        phone: normalizePhone(registerPhone),
        password: registerPassword,
        redirect: false,
      })
      if (signInResult?.error) {
        alert('Регистрация успешна. Войдите в кабинет.')
        setRegisterPhone(null)
        setRegisterPassword('')
        setRegisterPasswordRepeat('')
        setMode('login')
        return
      }
      window.location.replace('/cabinet')
    } catch (error) {
      alert('Не удалось зарегистрироваться')
    } finally {
      setIsRegisterLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#1b1235] via-[#2a0f4a] to-[#25113b] px-4 py-10">
      <div className="pointer-events-none absolute top-12 -left-28 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-12 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-purple-100">
        <div className="mb-6">
          <div className="text-xs tracking-[0.2em] text-purple-500 uppercase">
            ArtistCRM
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            {mode === 'login'
              ? 'Вход в кабинет'
              : mode === 'reset'
              ? 'Восстановление пароля'
              : 'Регистрация'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {mode === 'login'
              ? 'Введите телефон и пароль, чтобы продолжить работу.'
              : mode === 'reset'
              ? 'Укажите телефон и новый пароль для восстановления доступа.'
              : 'Укажите телефон и задайте пароль для нового аккаунта.'}
          </p>
        </div>

        {mode === 'login' ? (
          <form
            onSubmit={(event) =>
              validate_login(
                event,
                normalizePhone(loginPhone),
                loginPassword,
                setIsSubmitting,
                loginPhoneDigits,
                setLoginPhoneHint
              )
            }
            className="flex flex-col gap-4"
          >
            <Input
              label="Телефон"
              value={loginPhone}
              onChange={(nextValue) => {
                setLoginPhone(nextValue)
                setLoginPhoneHint(false)
              }}
              type="phone"
              className="w-full"
              noMargin
            />
            {loginPhoneHint && loginPhoneDigits !== 11 && (
              <div className="text-xs text-danger">
                Введите 11 цифр телефона.
              </div>
            )}

            <Input
              label="Пароль"
              type="password"
              value={loginPassword}
              onChange={setLoginPassword}
              autoComplete="current-password"
              fullWidth
              noMargin
            />

            <button
              className="bg-general mt-2 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              type="submit"
              disabled={!loginPhone || !loginPassword || isSubmitting}
            >
              {isSubmitting ? 'Вход...' : 'Войти'}
            </button>
          </form>
        ) : mode === 'reset' ? (
          <form onSubmit={submitReset} className="flex flex-col gap-4">
            <Input
              label="Телефон"
              value={resetPhone}
              onChange={(nextValue) => {
                setResetPhone(nextValue)
                setResetPhoneHint(false)
              }}
              type="phone"
              className="w-full"
              noMargin
            />
            {resetPhoneHint && resetPhoneDigits !== 11 && (
              <div className="text-xs text-danger">
                Введите 11 цифр телефона.
              </div>
            )}

            <Input
              label="Новый пароль"
              type="password"
              value={resetPassword}
              onChange={setResetPassword}
              placeholder="Новый пароль"
              autoComplete="new-password"
              fullWidth
              noMargin
            />

            <button
              type="submit"
              className="bg-general mt-2 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              disabled={!resetPhone || !resetPassword || isResetLoading}
            >
              {isResetLoading ? 'Сохранение...' : 'Сбросить пароль'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitRegister} className="flex flex-col gap-4">
            <Input
              label="Телефон"
              value={registerPhone}
              onChange={(nextValue) => {
                setRegisterPhone(nextValue)
                setRegisterPhoneHint(false)
              }}
              type="phone"
              className="w-full"
              noMargin
            />
            {registerPhoneHint && registerPhoneDigits !== 11 && (
              <div className="text-xs text-danger">
                Введите 11 цифр телефона.
              </div>
            )}

            <Input
              label="Пароль"
              type="password"
              value={registerPassword}
              onChange={setRegisterPassword}
              autoComplete="new-password"
              fullWidth
              noMargin
            />

            <Input
              label="Повторите пароль"
              type="password"
              value={registerPasswordRepeat}
              onChange={setRegisterPasswordRepeat}
              autoComplete="new-password"
              fullWidth
              noMargin
            />

            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-general px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              disabled={
                !registerPhone ||
                !registerPassword ||
                !registerPasswordRepeat ||
                isRegisterLoading
              }
            >
              {isRegisterLoading ? 'Создание...' : 'Создать аккаунт'}
            </button>
          </form>
        )}

        {mode === 'login' ? (
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              className="w-full text-center text-sm font-medium text-purple-600 transition hover:text-purple-800"
              onClick={() => setMode('reset')}
            >
              Забыли пароль?
            </button>
            <button
              type="button"
              className="w-full text-center text-sm font-medium text-purple-600 transition hover:text-purple-800"
              onClick={() => setMode('register')}
            >
              Создать аккаунт
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="mt-6 w-full text-center text-sm font-medium text-purple-600 transition hover:text-purple-800"
            onClick={() => setMode('login')}
          >
            Вернуться ко входу
          </button>
        )}
      </div>
    </div>
  )
}

export default LoginInputs
