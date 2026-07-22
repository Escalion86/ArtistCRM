'use client'

import Link from 'next/link'
import { reachGoal } from '@helpers/metrikaGoals'

const MetrikaLink = ({ goalName, goalParams, children, ...linkProps }) => {
  const handleClick = () => {
    reachGoal(goalName, goalParams)
  }

  return (
    <Link {...linkProps} onClick={handleClick}>
      {children}
    </Link>
  )
}

export default MetrikaLink
