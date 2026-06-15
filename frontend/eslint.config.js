import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // El patrón estándar del proyecto es cargar datos con useEffect + useState
      // (sin React Compiler ni librerías de data-fetching), así que esta regla
      // marcaría como error el patrón de "cargar lista al montar" usado en todos los módulos.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
