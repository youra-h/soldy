import { defineConfig } from 'vite'
import path from 'node:path'
// The extensions are required: the native loader of Vite reads the config with them
import { componentSheets, hoistRegistrations } from './layers.ts'
import { tailwind } from './tailwind-postcss.ts'

/**
 * The build of the styles of the theme: the SCSS sources compile into the
 * whole sheet, `dist/index.css`, and the build cuts it by its cascade layers
 * into the shared part (`dist/common.css`), the parts (`dist/parts/`) and the
 * stylesheets of components (`dist/components/`) — `layers.ts`.
 *
 * The entry is `src/index.scss` itself, with no library mode (`build.lib`): of
 * an entry made of styles only Vite drops the empty JS chunk itself, and the
 * whole sheet lands in `dist` as `index.css`. The library mode requires a JS
 * entry — with `.scss` it fails in `vite:css-post`, — and the empty chunk of
 * such an entry went into the package as `theme-oren.js`, to which no entry
 * point leads. Guard — `__tests__/package-build.spec.ts`.
 *
 * `@import` of `base.css` (Tailwind, the shared layer of themes, the tokens and
 * the utilities) is injected into the SCSS entry so that Tailwind expands
 * `@apply` in the styles of the components — the PostCSS step of the theme
 * (`tailwind-postcss.ts`): `@tailwindcss/postcss` without the `color-mix()`
 * polyfill. Before it the registrations of the parts leave their layers
 * (`hoistRegistrations`). The PostCSS config is built in here, and Vite looks
 * for no `postcss.config.*` with it.
 */
export default defineConfig({
	plugins: [componentSheets()],
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			input: path.resolve(import.meta.dirname, 'src/index.scss'),
			output: {
				assetFileNames: 'index.css',
			},
		},
	},
	css: {
		postcss: {
			plugins: [hoistRegistrations(), tailwind()],
		},
		preprocessorOptions: {
			scss: {
				additionalData: (content: string) => {
					const importLine = `@import "${path.resolve(import.meta.dirname, 'src/base.css')}";\n`
					const matches = [...content.matchAll(/^@use\s+[^;]+;\s*\n/gm)]

					if (matches.length > 0) {
						const last = matches[matches.length - 1]
						const end = (last.index ?? 0) + last[0].length
						return content.slice(0, end) + importLine + content.slice(end)
					}

					return importLine + content
				},
			},
		},
	},
})
