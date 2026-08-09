'use client'

import windowDimensionsAtom from '@state/atoms/windowDimensionsAtom'
import { useAtomValue } from 'jotai'

const useUiDensity = () => {
  const { width } = useAtomValue(windowDimensionsAtom)

  return {
    isCompact: typeof width === 'number' && width < 400,
  }
}

export default useUiDensity
