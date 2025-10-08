import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  typescript: true,
  markdown: false, // Disable markdown linting
  rules: {
    'node/prefer-global/process': 'off',
    'no-console': 'off',
    'no-new-func': 'off',
    'no-case-declarations': 'off',
    'antfu/no-import-dist': 'off',
  },
}, {
  files: ['examples/**/*.ts'],
  rules: {
    'no-console': 'off',
  },
})
