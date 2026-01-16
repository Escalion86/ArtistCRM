import { useWindowDimensionsRecoil } from '@helpers/useWindowDimensions'
import React from 'react'

const StateLoader = ({ children }) => {
  useWindowDimensionsRecoil()
  return children
}

export default StateLoader
