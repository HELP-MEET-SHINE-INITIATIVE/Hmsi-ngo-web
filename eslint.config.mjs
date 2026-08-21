import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'public/**',
    'coverage/**',
  ]),
  {
    rules: {
      // Existing client data loaders intentionally hydrate state from effects.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
