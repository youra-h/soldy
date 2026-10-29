// The extension is required: with it the native loader of Vite reads the config as well
import react from '@vitejs/plugin-react'
import { libConfig } from '../../../tools/vite/lib.config.ts'
import { clientDirective } from '../../../tools/client-directive/plugin.ts'

/**
 * The library build of @soldy-ui/react: components on the headless models of
 * the core.
 *
 * JSX compiles with the automatic transform, so the bundle keeps an import of
 * `react/jsx-runtime` — a subpath of `react`, external together with it.
 * Every module that uses React opens with `'use client'` (`clientDirective`),
 * so a Server Component of the application imports the components as they are
 * (docs/agents/build.md, «Сборка пакетов»). The declarations come from
 * `tsc -p tsconfig.build.json`, the second step of the `build` script.
 */
export default libConfig({
	name: '@soldy-ui/react',
	root: import.meta.dirname,
	entry: 'src/index.ts',
	external: ['react', 'react-dom'],
	plugins: [react(), clientDirective()],
})
