const CabinetWrapper = ({ children }) => {
  return (
    <div
      className="grid h-screen max-h-screen w-full overflow-hidden"
      style={{
        gridTemplateRows: 'auto 1fr',
        gridTemplateColumns: '64px 1fr',
        gridTemplateAreas: `
          'burger header'
          'content content'
        `,
      }}
    >
      {children}
    </div>
  )
}

export default CabinetWrapper
