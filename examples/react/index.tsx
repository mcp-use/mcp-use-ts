import React from 'react'
import { createRoot } from 'react-dom/client'
import ReactExample from './react_example'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<ReactExample />)
}
else {
  console.error('Root element not found')
}
