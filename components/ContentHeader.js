const ContentHeader = ({ children }) => {
  return (
    <div className="z-10 flex w-full flex-wrap items-center justify-between gap-2 overflow-x-hidden border-b border-gray-700 bg-white px-2 py-1 text-black">
      {children}
    </div>
  )
}

export default ContentHeader
