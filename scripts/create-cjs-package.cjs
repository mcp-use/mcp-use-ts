#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const distCjsDir = path.join(__dirname, '..', 'dist-cjs')
if (!fs.existsSync(distCjsDir)) {
  fs.mkdirSync(distCjsDir, { recursive: true })
}

const packageJsonContent = {
  type: 'commonjs',
}

const packageJsonPath = path.join(distCjsDir, 'package.json')
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2))
