import MuiTabContext from '@mui/lab/TabContext'
import Tab from '@mui/material/Tab'
import { useState } from 'react'
import TabList from './TabList'

const TabContext = ({
  value,
  children,
  variant = 'scrollable',
  scrollButtons = 'auto',
  allowScrollButtonsMobile = true,
}) => {
  const [tab, setTab] = useState(value)
  const tabs = []
  children.forEach((child, index) => {
    if (child?.props?.tabName) {
      const tabName = child.props.tabName
      const tabAddToLabel = child.props.tabAddToLabel
      const tabBadge = child.props.tabBadge
      tabs.push(
        <Tab
          key={tabName}
          label={
            <div className="flex flex-col">
              <div className="flex items-center justify-center gap-1.5">
                <span>{tabName}</span>
                {typeof tabBadge === 'number' && tabBadge > 0 && (
                  <span className="bg-danger flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold text-white">
                    {tabBadge}
                  </span>
                )}
              </div>
              {tabAddToLabel && <div>{tabAddToLabel}</div>}
            </div>
          }
          value={tabName}
        />
      )
    }
  })

  // console.log('tabNames', tabNames)

  return (
    <MuiTabContext value={tab}>
      <TabList
        onChange={setTab}
        variant={variant}
        scrollButtons={scrollButtons}
        allowScrollButtonsMobile={allowScrollButtonsMobile}
        className="w-full max-w-[100%]"
      >
        {tabs}
      </TabList>
      {children}
    </MuiTabContext>
  )
}

export default TabContext
