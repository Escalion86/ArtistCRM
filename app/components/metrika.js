// app/components/metrika.js
'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export const reachGoal = (goal) => {
  console.log('goal :>> ', goal)
  try {
    ym(38403125, 'reachGoal', goal)
  } catch (e) {
    console.log('e :>> ', e)
  }
  return true
}

const Metrika = () => {
  const pathName = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    ym(38403125, 'hit', window.location.href)
  }, [pathName, searchParams])
  return null
}

export default Metrika
