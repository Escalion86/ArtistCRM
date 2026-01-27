'use client'

import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoon } from '@fortawesome/free-solid-svg-icons/faMoon'
import { faSun } from '@fortawesome/free-solid-svg-icons/faSun'
import cn from 'classnames'

const ThemeToggleButton = ({ className }) => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme')
    const dark = storedTheme === 'dark'
    setIsDark(dark)
    document.body.classList.toggle('theme-dark', dark)
  }, [])

  const toggleTheme = () => {
    const nextValue = !isDark
    setIsDark(nextValue)
    localStorage.setItem('theme', nextValue ? 'dark' : 'light')
    document.body.classList.toggle('theme-dark', nextValue)
  }

  return (
    <button
      type="button"
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full border border-general/40 bg-white/80 text-general shadow-sm transition hover:bg-white cursor-pointer',
        isDark ? 'home-theme-toggle' : '',
        className
      )}
      onClick={toggleTheme}
      title="Сменить тему"
    >
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="h-4 w-4" />
    </button>
  )
}

export default ThemeToggleButton
