import { defineConfig } from 'vite'
import path from 'node:path'
import { aliases, constants, plugins } from '../../packages/playground/vue/vite.base.ts'

const count = (file: string) => path.resolve(import.meta.dirname, 'count', file)

/**
 * The component page stand (see benchmarks/pages/README.md at the root). The
 * components are drawn by the developer stand's preview hosts — all six
 * frameworks have their previews with the same data — so the plugins,
 * constants and aliases are the stand's (`packages/playground/vue/vite.base.ts`):
 * each framework's plugin takes its host's folder and its adapter's sources.
 * The stand has no framework files of its own — one page (`index.html`), which
 * loads the framework's host lazily by `?fw=`.
 *
 * A production build, as the table stand's: what an app gets is measured.
 *
 * The counting build (mode `count`, `dist-count`) of the interaction run
 * (benchmarks/interaction/README.md) is the same production build with the
 * frameworks' render work counted: Vue reports to its devtools hook
 * (`__VUE_PROD_DEVTOOLS__`), and Svelte's client runtime, Solid and Angular's
 * core are swapped for their counting wrappers (`count/`).
 */
export default defineConfig(({ mode }) => {
	const counting = mode === 'count'

	return {
		root: import.meta.dirname,
		plugins: plugins(),
		define: { ...constants(), ...(counting ? { __VUE_PROD_DEVTOOLS__: 'true' } : {}) },
		resolve: {
			alias: [
				...(counting
					? [
							{ find: /^svelte\/internal\/client$/, replacement: count('svelte.js') },
							{ find: /^solid-js$/, replacement: count('solid.js') },
							{ find: /^@angular\/core$/, replacement: count('angular.js') },
						]
					: []),
				...Object.entries(aliases({ themeCss: true })).map(([find, replacement]) => ({
					find,
					replacement,
				})),
			],
		},
		build: {
			target: 'esnext',
			outDir: path.resolve(import.meta.dirname, counting ? 'dist-count' : 'dist'),
			emptyOutDir: true,
			// The counting build keeps the names: the run lists which components rendered
			...(counting ? { minify: false } : {}),
		},
		logLevel: 'warn',
	}
})
