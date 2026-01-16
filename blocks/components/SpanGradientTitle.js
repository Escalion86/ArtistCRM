import React from 'react'

const SpanGradientTitle = ({ children, className }) => (
  <span
    className={className}
    style={{
      background: 'linear-gradient(51deg, #4986FF 0%, #A86CFF 100%)',
      // backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      // color: '#0B2349',
    }}
  >
    {children}
  </span>
)

export default SpanGradientTitle
