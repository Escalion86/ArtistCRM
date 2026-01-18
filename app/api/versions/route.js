import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

export const runtime = 'nodejs'

const require = createRequire(import.meta.url)

const readJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

const resolvePackageJson = (pkgName) => {
  try {
    return require.resolve(`${pkgName}/package.json`)
  } catch (error) {
    return null
  }
}

const extractVersion = (pkgName) => {
  const pkgPath = resolvePackageJson(pkgName)
  if (!pkgPath) return null
  const data = readJSON(pkgPath)
  return data?.version ?? null
}

const getRootVersions = () => {
  const root = readJSON(path.join(process.cwd(), 'package.json'))
  if (!root) return null
  return {
    dependencies: root.dependencies ?? {},
    devDependencies: root.devDependencies ?? {},
  }
}

export async function GET() {
  const rootVersions = getRootVersions()
  const muiPackages = [
    '@mui/material',
    '@mui/system',
    '@mui/styled-engine',
    '@mui/lab',
    '@mui/x-date-pickers',
    '@emotion/react',
    '@emotion/styled',
  ]

  const installed = muiPackages.reduce((acc, name) => {
    acc[name] = extractVersion(name)
    return acc
  }, {})

  return Response.json(
    {
      installed,
      declared: rootVersions,
    },
    { status: 200 }
  )
}
