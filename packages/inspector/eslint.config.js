import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  typescript: true,
  react: false,
  rules: {
    'node/prefer-global/process': 'off',
  },
})
