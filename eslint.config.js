import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '*.min.js',
      '.turbo/**',
      '.vercel/**',
      'packages/*/dist/**',
      'packages/*/build/**',
      'packages/*/node_modules/**'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.js', '**/*.jsx'],
    plugins: {
      import: importPlugin
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        module: 'readonly',
        require: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly'
      }
    },
    settings: {
      'import/resolver': {
        typescript: true
      }
    },
    rules: {
      'array-callback-return': 'error',
      'default-case': ['error', { commentPattern: '^no default$' }],
      'dot-location': ['error', 'property'],
      'eqeqeq': ['error', 'smart'],
      'new-parens': 'error',
      'no-array-constructor': 'error',
      'no-caller': 'error',
      'no-cond-assign': ['error', 'except-parens'],
      'no-const-assign': 'error',
      'no-control-regex': 'error',
      'no-delete-var': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-eval': 'error',
      'no-ex-assign': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-extra-label': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-implied-eval': 'error',
      'no-invalid-regexp': 'error',
      'no-iterator': 'error',
      'no-label-var': 'error',
      'no-labels': ['error', { allowLoop: true, allowSwitch: false }],
      'no-lone-blocks': 'error',
      'no-loop-func': 'error',
      'no-multi-str': 'error',
      'no-new-func': 'error',
      'no-new-object': 'error',
      'no-new-symbol': 'error',
      'no-new-wrappers': 'error',
      'no-obj-calls': 'error',
      'no-octal': 'error',
      'no-octal-escape': 'error',
      'no-regex-spaces': 'error',
      'no-restricted-syntax': [
        'error',
        'WithStatement',
        {
          message: "substr() is deprecated, use slice() or substring() instead",
          selector: "MemberExpression > Identifier[name='substr']"
        }
      ],
      'no-script-url': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-shadow': 'warn',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-template-curly-in-string': 'error',
      'no-this-before-super': 'error',
      'no-throw-literal': 'error',
      'no-undef': 'error',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true
        }
      ],
      'no-unused-labels': 'error',
      'no-unused-vars': 'off',
      'no-useless-computed-key': 'error',
      'no-useless-concat': 'error',
      'no-useless-constructor': 'off',
      'no-useless-escape': 'error',
      'no-useless-rename': [
        'error',
        {
          ignoreDestructuring: false,
          ignoreImport: false,
          ignoreExport: false
        }
      ],
      'no-with': 'error',
      'no-whitespace-before-property': 'error',
      'require-yield': 'error',
      'rest-spread-spacing': ['error', 'never'],
      'strict': ['error', 'never'],
      'unicode-bom': ['error', 'never'],
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'getter-return': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-redeclare': [
        'error',
        { builtinGlobals: false, ignoreDeclarationMerge: true }
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          caughtErrors: 'none',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: false
        }
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      'no-case-declarations': 'warn',
      'no-constant-condition': 'warn'
    }
  },
  {
    files: ['packages/cli/**/*.ts', 'packages/create-mcp-use-app/**/*.ts'],
    rules: {
      'no-console': 'off',
      'no-process-exit': 'off'
    }
  },
  {
    files: ['packages/mcp-use/**/*.ts'],
    rules: {
      'import/no-extraneous-dependencies': [
        'error',
        { devDependencies: false }
      ]
    }
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**/*.ts'],
    languageOptions: {
      globals: {
        jest: 'readonly'
      }
    },
    rules: {
      'import/no-extraneous-dependencies': 'off'
    }
  },
  {
    files: ['examples/**/*', 'packages/*/examples/**/*'],
    rules: {
      'import/no-extraneous-dependencies': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-constant-condition': 'off',
      'default-case': 'off',
      'no-new-func': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'require-yield': 'off'
    }
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/vitest.config.ts', '**/vitest.config.mts'],
    languageOptions: {
      globals: {
        jest: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unreachable-loop': 'off',
      'no-console': 'off',
      'import/no-extraneous-dependencies': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'off',
      'no-constant-condition': 'off',
      'require-yield': 'off'
    }
  }
];

