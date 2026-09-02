'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import Tab from '@mui/material/Tab'
import ImportContent from './ImportContent'

const ExportContent = dynamic(() => import('./ExportContent'))
const TABS = [
  { value: 'import', label: 'Импорт', Component: ImportContent },
  { value: 'export', label: 'Экспорт', Component: ExportContent },
]

const ImportExportContent = () => {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') === 'export' ? 'export' : 'import'
  const [visitedTabs, setVisitedTabs] = useState(() => [activeTab])

  const handleTabChange = (_, value) => {
    setVisitedTabs((current) => [...new Set([...current, activeTab, value])])
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    window.history.replaceState(null, '', url)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TabContext value={activeTab}>
        <TabList
          onChange={handleTabChange}
          variant="fullWidth"
          aria-label="Импорт и экспорт данных"
          className="shrink-0 border-b border-gray-600"
        >
          {TABS.map(({ value, label }) => (
            <Tab key={value} value={value} label={label} sx={{ cursor: 'pointer' }} />
          ))}
        </TabList>
        {TABS.map(({ value, Component }) => (
          <TabPanel
            key={value}
            value={value}
            keepMounted
            sx={{ padding: 0, minHeight: 0, flex: 1, overflow: 'hidden' }}
          >
            {activeTab === value || visitedTabs.includes(value) ? (
              <Component />
            ) : null}
          </TabPanel>
        ))}
      </TabContext>
    </div>
  )
}

export default ImportExportContent
