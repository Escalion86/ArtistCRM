'use client'

import Burger from '@components/Burger'
import { useAtomValue } from 'jotai'
import windowDimensionsTailwindSelector from '@state/selectors/windowDimensionsTailwindSelector'

function BurgerLayout() {
  const device = useAtomValue(windowDimensionsTailwindSelector)
  // На телефоне бургер заменён пунктом «Меню» в нижней навигации
  if (device === 'phoneV' || device === 'phoneH') return null
  return (
    <div
      className="burger-layout flex h-16 items-center justify-center"
      style={{ gridArea: 'burger' }}
    >
      <Burger />
    </div>
  )
}

export default BurgerLayout
