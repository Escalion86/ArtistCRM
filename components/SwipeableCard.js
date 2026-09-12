'use client'

import { faPencilAlt, faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { motion, useAnimationControls } from 'framer-motion'
import PropTypes from 'prop-types'
import { useCallback, useRef } from 'react'

const SWIPE_LIMIT = 112
const SWIPE_TRIGGER_DISTANCE = 64
const SWIPE_TRIGGER_VELOCITY = 450

const SwipeableCard = ({ children, onSwipeLeft, onSwipeRight, className }) => {
  const controls = useAnimationControls()
  const suppressClickUntil = useRef(0)
  const swipeEnabled = Boolean(onSwipeLeft || onSwipeRight)

  const resetPosition = useCallback(() => {
    controls.start({
      x: 0,
      transition: { type: 'spring', stiffness: 520, damping: 38 },
    })
  }, [controls])

  const suppressNextClick = () => {
    suppressClickUntil.current = Date.now() + 600
  }

  const handleDragStart = () => {
    suppressNextClick()
  }

  const handleDragEnd = (_, info) => {
    const distance = info.offset.x
    const velocity = info.velocity.x
    const swipedLeft =
      Boolean(onSwipeLeft) &&
      (distance <= -SWIPE_TRIGGER_DISTANCE ||
        velocity <= -SWIPE_TRIGGER_VELOCITY)
    const swipedRight =
      Boolean(onSwipeRight) &&
      (distance >= SWIPE_TRIGGER_DISTANCE || velocity >= SWIPE_TRIGGER_VELOCITY)

    if (swipedLeft || swipedRight || Math.abs(distance) > 4) {
      suppressNextClick()
    }
    resetPosition()

    const swipeAction = swipedLeft
      ? onSwipeLeft
      : swipedRight
        ? onSwipeRight
        : null
    if (swipeAction) {
      setTimeout(swipeAction, 0)
    }
  }

  const handleClickCapture = (event) => {
    if (Date.now() > suppressClickUntil.current) return
    suppressClickUntil.current = 0
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent?.stopImmediatePropagation?.()
  }

  if (!swipeEnabled) return children

  return (
    <div className={`card-swipe-row ${className || ''}`}>
      {onSwipeRight ? (
        <div
          className="card-swipe-action card-swipe-action--delete"
          aria-hidden="true"
        >
          <FontAwesomeIcon icon={faTrashAlt} />
          <span>Удалить</span>
        </div>
      ) : null}
      {onSwipeLeft ? (
        <div
          className="card-swipe-action card-swipe-action--edit"
          aria-hidden="true"
        >
          <FontAwesomeIcon icon={faPencilAlt} />
          <span>Изменить</span>
        </div>
      ) : null}
      <motion.div
        className="card-swipe-content"
        drag="x"
        dragConstraints={{
          left: onSwipeLeft ? -SWIPE_LIMIT : 0,
          right: onSwipeRight ? SWIPE_LIMIT : 0,
        }}
        dragDirectionLock
        dragElastic={0.08}
        dragMomentum={false}
        animate={controls}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClickCapture={handleClickCapture}
        style={{ touchAction: 'pan-y' }}
      >
        {children}
      </motion.div>
    </div>
  )
}

SwipeableCard.propTypes = {
  children: PropTypes.node.isRequired,
  onSwipeLeft: PropTypes.func,
  onSwipeRight: PropTypes.func,
  className: PropTypes.string,
}

SwipeableCard.defaultProps = {
  onSwipeLeft: null,
  onSwipeRight: null,
  className: '',
}

export default SwipeableCard
