'use client'

import GoogleCalendarImportSettings from '@components/GoogleCalendarImportSettings'

const ImportContent = () => (
  <div className="flex h-full flex-col">
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2 sm:p-4">
      <GoogleCalendarImportSettings />
    </div>
  </div>
)

export default ImportContent
