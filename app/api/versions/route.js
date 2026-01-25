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
  try {
    const pkg = require(`${pkgName}/package.json`)
    return { version: pkg?.version ?? null }
  } catch (error) {
    const pkgPath = resolvePackageJson(pkgName)
    if (!pkgPath) return { version: null, error: String(error) }
    const data = readJSON(pkgPath)
    return { version: data?.version ?? null, path: pkgPath }
  }
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

  const diagnostics = {
    runtime: process.env.NEXT_RUNTIME,
    node: process.versions?.node,
    cwd: process.cwd(),
    hasNodeModules: fs.existsSync(path.join(process.cwd(), 'node_modules')),
  }

  return Response.json(
    {
      installed,
      declared: rootVersions,
      diagnostics,
    },
    { status: 200 }
  )
}
