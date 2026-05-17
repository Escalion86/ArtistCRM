'use client'

import { apiJson } from '@helpers/apiClient'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

const emptyForm = {
  title: '',
  subtitle: '',
  price: 0,
  description: '',
  features: [],
  hidden: false,
}

export default function PartyTariffsAdmin() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tariffs, setTariffs] = useState([])
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ ...emptyForm })
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [featureInput, setFeatureInput] = useState('')

  // ╨Я╤А╨╛╨▓╨╡╤А╨║╨░ ╨░╨▓╤В╨╛╤А╨╕╨╖╨░╤Ж╨╕╨╕ ╨╕ ╨╖╨░╨│╤А╤Г╨╖╨║╨░ ╤В╨░╤А╨╕╤Д╨╛╨▓
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const meRes = await apiJson('/api/party/auth/me')
      if (!meRes?.success || !meRes?.data?.user) {
        router.push('/party/login?callbackUrl=/party/tariffs')
        return
      }
      const role = meRes.data.user.role
      if (role !== 'admin' && role !== 'support') {
        setError('╨Ф╨╛╤Б╤В╤Г╨┐ ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П ╨░╨┤╨╝╨╕╨╜╨╕╤Б╤В╤А╨░╤В╨╛╤А╨╛╨▓')
        setLoading(false)
        return
      }
      setUser(meRes.data.user)

      const tariffsRes = await apiJson('/api/party/tariffs')
      if (tariffsRes?.success) {
        setTariffs(tariffsRes.data || [])
      } else {
        setError('╨Ю╤И╨╕╨▒╨║╨░ ╨╖╨░╨│╤А╤Г╨╖╨║╨╕ ╤В╨░╤А╨╕╤Д╨╛╨▓')
      }
    } catch (err) {
      setError('╨Ю╤И╨╕╨▒╨║╨░ ╨╖╨░╨│╤А╤Г╨╖╨║╨╕ ╨┤╨░╨╜╨╜╤Л╤Е')
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  // ╨б╨╛╨╖╨┤╨░╨╜╨╕╨╡ / ╨╛╨▒╨╜╨╛╨▓╨╗╨╡╨╜╨╕╨╡
  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('╨Э╨░╨╖╨▓╨░╨╜╨╕╨╡ ╤В╨░╤А╨╕╤Д╨░ ╨╛╨▒╤П╨╖╨░╤В╨╡╨╗╤М╨╜╨╛')
      return
    }
    setSaving(true)
    setError('')
    try {
      const body = {
        ...form,
        price: Number(form.price) || 0,
        features: form.features.filter(Boolean),
      }

      if (editingId) {
        const res = await apiJson(`/api/party/tariffs/${editingId}`, {
          method: 'PATCH',
          body,
        })
        if (!res?.success) throw new Error(res?.error || '╨Ю╤И╨╕╨▒╨║╨░ ╨╛╨▒╨╜╨╛╨▓╨╗╨╡╨╜╨╕╤П')
      } else {
        const res = await apiJson('/api/party/tariffs', {
          method: 'POST',
          body,
        })
        if (!res?.success) throw new Error(res?.error || '╨Ю╤И╨╕╨▒╨║╨░ ╤Б╨╛╨╖╨┤╨░╨╜╨╕╤П')
      }

      setForm({ ...emptyForm })
      setEditingId(null)
      setFeatureInput('')
      await load()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  // ╨а╨╡╨┤╨░╨║╤В╨╕╤А╨╛╨▓╨░╨╜╨╕╨╡
  const handleEdit = (tariff) => {
    setForm({
      title: tariff.title || '',
      subtitle: tariff.subtitle || '',
      price: tariff.price ?? 0,
      description: tariff.description || '',
      features: tariff.features || [],
      hidden: tariff.hidden || false,
    })
    setEditingId(tariff._id)
    setError('')
  }

  // ╨г╨┤╨░╨╗╨╡╨╜╨╕╨╡
  const handleDelete = async (id, title) => {
    if (!window.confirm(`╨г╨┤╨░╨╗╨╕╤В╤М ╤В╨░╤А╨╕╤Д "${title}"?`)) return
    try {
      const res = await apiJson(`/api/party/tariffs/${id}`, {
        method: 'DELETE',
      })
      if (!res?.success) throw new Error(res?.error || '╨Ю╤И╨╕╨▒╨║╨░ ╤Г╨┤╨░╨╗╨╡╨╜╨╕╤П')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  // ╨Ю╤В╨╝╨╡╨╜╨░ ╤А╨╡╨┤╨░╨║╤В╨╕╤А╨╛╨▓╨░╨╜╨╕╤П
  const handleCancel = () => {
    setForm({ ...emptyForm })
    setEditingId(null)
    setFeatureInput('')
    setError('')
  }

  // ╨Ф╨╛╨▒╨░╨▓╨╗╨╡╨╜╨╕╨╡ ╤Д╨╕╤З╨╕
  const addFeature = () => {
    const val = featureInput.trim()
    if (!val) return
    setForm((f) => ({ ...f, features: [...(f.features || []), val] }))
    setFeatureInput('')
  }

  const removeFeature = (index) => {
    setForm((f) => ({
      ...f,
      features: (f.features || []).filter((_, i) => i !== index),
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#eaf6ff]">
        <p className="text-gray-500 text-sm">╨Ч╨░╨│╤А╤Г╨╖╨║╨░...</p>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#eaf6ff]">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#eaf6ff] text-slate-950">
      {/* Header */}
      <header className="bg-white border-b border-sky-100">
        <div className="flex items-center justify-between max-w-6xl px-5 py-4 mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold text-sky-700">PartyCRM</span>
            <nav className="flex items-center gap-3 text-sm">
              <a
                href="/company"
                className="text-gray-500 hover:text-sky-700 transition-colors"
              >
                ╨Ъ╨░╨▒╨╕╨╜╨╡╤В
              </a>
              <span className="text-gray-300">/</span>
              <a
                href="/party/settings"
                className="text-gray-500 hover:text-sky-700 transition-colors"
              >
                ╨Э╨░╤Б╤В╤А╨╛╨╣╨║╨╕
              </a>
              <span className="text-gray-300">/</span>
              <span className="text-sky-700 font-semibold">╨в╨░╤А╨╕╤Д╤Л</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-6xl px-5 py-8 mx-auto">
        <h1 className="text-2xl font-semibold font-futuraPT text-black">
          ╨г╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╨╡ ╤В╨░╤А╨╕╤Д╨░╨╝╨╕
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          ╨б╨╛╨╖╨┤╨░╨╜╨╕╨╡ ╨╕ ╤А╨╡╨┤╨░╨║╤В╨╕╤А╨╛╨▓╨░╨╜╨╕╨╡ ╤В╨░╤А╨╕╤Д╨╜╤Л╤Е ╨┐╨╗╨░╨╜╨╛╨▓ PartyCRM
        </p>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ╨д╨╛╤А╨╝╨░ ╤Б╨╛╨╖╨┤╨░╨╜╨╕╤П/╤А╨╡╨┤╨░╨║╤В╨╕╤А╨╛╨▓╨░╨╜╨╕╤П */}
        <div className="mt-6 p-6 bg-white border border-gray-200/70 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold text-black font-futuraPT">
            {editingId ? '╨а╨╡╨┤╨░╨║╤В╨╕╤А╨╛╨▓╨░╤В╤М ╤В╨░╤А╨╕╤Д' : '╨Э╨╛╨▓╤Л╨╣ ╤В╨░╤А╨╕╤Д'}
          </h2>
          <div className="grid gap-4 mt-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ╨Э╨░╨╖╨▓╨░╨╜╨╕╨╡
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                placeholder="╨Э╨░╨┐╤А╨╕╨╝╨╡╤А: ╨С╨░╨╖╨╛╨▓╤Л╨╣"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ╨Я╨╛╨┤╨╖╨░╨│╨╛╨╗╨╛╨▓╨╛╨║
              </label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subtitle: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                placeholder="╨Ф╨╗╤П ╨╜╨╡╨▒╨╛╨╗╤М╤И╨╕╤Е ╨░╨│╨╡╨╜╤В╤Б╤В╨▓"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ╨ж╨╡╨╜╨░ (тВ╜/╨╝╨╡╤Б)
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                placeholder="0 тАФ ╨▒╨╡╤Б╨┐╨╗╨░╤В╨╜╤Л╨╣"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ╨б╨║╤А╤Л╤В╤Л╨╣
              </label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hidden}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hidden: e.target.checked }))
                  }
                  className="rounded border-gray-300 text-sky-600 focus:ring-sky-400"
                />
                <span className="text-sm text-gray-600">
                  ╨Э╨╡ ╨┐╨╛╨║╨░╨╖╤Л╨▓╨░╤В╤М ╨╜╨░ ╨╗╨╡╨╜╨┤╨╕╨╜╨│╨╡ ╨╕ ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤П╨╝
                </span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ╨Ю╨┐╨╕╤Б╨░╨╜╨╕╨╡
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                rows={2}
                placeholder="╨Ъ╤А╨░╤В╨║╨╛╨╡ ╨╛╨┐╨╕╤Б╨░╨╜╨╕╨╡ ╤В╨░╤А╨╕╤Д╨░"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ╨Т╨╛╨╖╨╝╨╛╨╢╨╜╨╛╤Б╤В╨╕ (features)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addFeature()
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                  placeholder="╨Т╨▓╨╡╨┤╨╕╤В╨╡ ╨▓╨╛╨╖╨╝╨╛╨╢╨╜╨╛╤Б╤В╤М ╨╕ ╨╜╨░╨╢╨╝╨╕╤В╨╡ Enter"
                />
                <button
                  onClick={addFeature}
                  className="px-4 py-2 text-sm font-semibold text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition-colors"
                >
                  ╨Ф╨╛╨▒╨░╨▓╨╕╤В╤М
                </button>
              </div>
              {form.features && form.features.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.features.map((feat, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 border border-sky-200 rounded-full text-sm text-sky-800"
                    >
                      {feat}
                      <button
                        onClick={() => removeFeature(index)}
                        className="ml-1 text-sky-400 hover:text-red-500 transition-colors"
                      >
                        ├Ч
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 text-sm font-semibold text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
            >
              {saving
                ? '╨б╨╛╤Е╤А╨░╨╜╨╡╨╜╨╕╨╡...'
                : editingId
                  ? '╨б╨╛╤Е╤А╨░╨╜╨╕╤В╤М ╨╕╨╖╨╝╨╡╨╜╨╡╨╜╨╕╤П'
                  : '╨б╨╛╨╖╨┤╨░╤В╤М ╤В╨░╤А╨╕╤Д'}
            </button>
            {editingId && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ╨Ю╤В╨╝╨╡╨╜╨╕╤В╤М
              </button>
            )}
          </div>
        </div>

        {/* ╨б╨┐╨╕╤Б╨╛╨║ ╤В╨░╤А╨╕╤Д╨╛╨▓ */}
        <div className="mt-6 space-y-3">
          {tariffs.length === 0 ? (
            <div className="p-8 text-center text-gray-400 bg-white border border-gray-200/70 rounded-2xl">
              ╨в╨░╤А╨╕╤Д╤Л ╨╜╨╡ ╨╜╨░╨╣╨┤╨╡╨╜╤Л. ╨б╨╛╨╖╨┤╨░╨╣╤В╨╡ ╨┐╨╡╤А╨▓╤Л╨╣ ╤В╨░╤А╨╕╤Д.
            </div>
          ) : (
            tariffs.map((tariff) => (
              <div
                key={tariff._id}
                className={`p-5 bg-white border rounded-2xl shadow-sm ${
                  tariff.hidden ? 'border-gray-200/50 opacity-70' : 'border-gray-200/70'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-black font-futuraPT">
                        {tariff.title}
                      </h3>
                      {tariff.hidden && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 rounded-full">
                          ╤Б╨║╤А╤Л╤В
                        </span>
                      )}
                    </div>
                    {tariff.subtitle && (
                      <p className="text-sm text-gray-500">{tariff.subtitle}</p>
                    )}
                    <p className="mt-2 text-xl font-bold text-sky-700">
                      {tariff.price > 0
                        ? `${Number(tariff.price).toLocaleString('ru-RU')} тВ╜/╨╝╨╡╤Б`
                        : '╨С╨╡╤Б╨┐╨╗╨░╤В╨╜╨╛'}
                    </p>
                    {tariff.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {tariff.description}
                      </p>
                    )}
                    {tariff.features && tariff.features.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tariff.features.map((feat, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(tariff)}
                      className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
                    >
                      ╨а╨╡╨┤╨░╨║╤В╨╕╤А╨╛╨▓╨░╤В╤М
                    </button>
                    <button
                      onClick={() => handleDelete(tariff._id, tariff.title)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      ╨г╨┤╨░╨╗╨╕╤В╤М
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
