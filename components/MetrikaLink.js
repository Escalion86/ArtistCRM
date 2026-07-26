'use client'

import Link from 'next/link'
import { reachGoal } from '@helpers/metrikaGoals'

const MetrikaLink = ({ goalName, goalParams, children, ...linkProps }) => {
  const handleClick = () => {
    reachGoal(goalName, goalParams)
    if (goalName === 'pilot_demo_requested') {
      fetch('/api/acquisition/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'pilot_demo_requested' }),
        keepalive: true,
      }).catch(() => null)
    }
  }

  return (
    <Link {...linkProps} onClick={handleClick}>
      {children}
    </Link>
  )
}

export default MetrikaLink
