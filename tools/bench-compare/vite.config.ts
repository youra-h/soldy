import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import solid from 'vite-plugin-solid'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fs from 'node:fs'
import path from 'node:path'
import { angular } from '../../packages/playground/vue/src/vite-angular.ts'

/**
 * The comparison stand (benchmarks/compare/README.md in the root): the
 * neighbors' pages — one per framework, `<framework>.html?lib=<library>` — and,
 * with `SIZE=<framework>`, the size entries `size.mjs` generates: one per page of a
 * library, soldy included, so that tree-shaking leaves each entry only what
 * its page imports.
 *
 * As at the table stand (`tools/bench-table/vite.config.ts`): the frameworks
 * are one copy for all (`dedupe`) and of the root's versions, soldy is taken
 * from sources, every framework plugin compiles only its own files.
 */
const pk = path.resolve(import.meta.dirname, '../../packages')
const here = (name: string) => path.resolve(import.meta.dirname, name)
const SIZE = process.env.SIZE
const ONLY = process.env.PAGES

/** Size entries: `size/<framework>/<library>/<page>.ts`, written by `size.mjs`. */
function sizeEntries(fw: string): Record<string, string> {
	const root = here(`size/${fw}`)
	const entries: Record<string, string> = {}

	for (const file of fs.readdirSync(root, { recursive: true, encoding: 'utf8' })) {
		if (!/\.(ts|tsx)$/.test(file)) continue

		entries[file.replace(/\\/g, '/').replace(/\.[^.]+$/, '')] = path.join(root, file)
	}

	return entries
}

/**
 * Pages of the build. `PAGES=react` builds one page into `dist/react/neighbors`
 * — `run.mjs` builds a framework at a time, so runs of two frameworks do not
 * share an output folder.
 */
const PAGES = ['vue', 'react', 'angular', 'svelte', 'solid', 'webc']

export default defineConfig({
	root: import.meta.dirname,
	plugins: [
		vue(),
		react({
			include: [
				/\/bench-compare\/react\.tsx$/,
				/\/bench-compare\/(libs|size)\/react\/.+\.tsx?$/,
				/\/ui\/react\/src\/.+\.[jt]sx?$/,
			],
		}),
		solid({
			hot: false,
			include: [
				/\/bench-compare\/solid\.tsx$/,
				/\/bench-compare\/(libs|size)\/solid\/.+\.tsx?$/,
				/\/ui\/solid\/src\/.+\.[jt]sx?$/,
				/\/node_modules\/.+\.jsx$/,
			],
		}),
		svelte(),
		angular({
			tsconfig: here('tsconfig.angular.json'),
			include: [
				/\/bench-compare\/angular\.ts$/,
				/\/bench-compare\/(libs|size)\/angular\/.+\.ts$/,
				/\/ui\/angular\/src\/.+\.ts$/,
			],
		}),
	],
	resolve: {
		dedupe: [
			'vue',
			'react',
			'react-dom',
			'solid-js',
			'svelte',
			'@angular/core',
			'@angular/common',
			'@angular/platform-browser',
			'@angular/forms',
			'@angular/router',
			'@angular/animations',
			'@angular/cdk',
			'rxjs',
		],
		alias: {
			// Before the package root: an alias is matched by prefix
			'@soldy-ui/theme-oren/setup': path.join(pk, 'themes/oren/setup/index.ts'),
			'@soldy-ui/theme-oren': path.join(pk, 'themes/oren/dist/index.css'),
			'@soldy-ui/theme-base/setup': path.join(pk, 'themes/base/setup/index.ts'),
			'@soldy-ui/core': path.join(pk, 'core/src'),
			'@soldy-ui/icons-material': path.join(pk, 'icons/material/src'),
			'@soldy-ui/plugins': path.join(pk, 'plugins/src'),
			'@soldy-ui/setup': path.join(pk, 'setup/index.ts'),
			'@soldy-ui/vue': path.join(pk, 'ui/vue/src/index.ts'),
			'@soldy-ui/react': path.join(pk, 'ui/react/src/index.ts'),
			'@soldy-ui/angular': path.join(pk, 'ui/angular/src/index.ts'),
			'@soldy-ui/svelte': path.join(pk, 'ui/svelte/src/index.ts'),
			'@soldy-ui/solid': path.join(pk, 'ui/solid/src/index.ts'),
			'@soldy-ui/webc': path.join(pk, 'ui/webc/src/index.ts'),
		},
	},
	build: {
		target: 'esnext',
		outDir: SIZE ? `dist-size/${SIZE}` : ONLY ? `dist/${ONLY}/neighbors` : 'dist',
		emptyOutDir: true,
		manifest: Boolean(SIZE),
		rollupOptions: {
			input: SIZE
				? sizeEntries(SIZE)
				: Object.fromEntries(
						(ONLY?.split(',') ?? PAGES).map((name) => [name, here(`${name}.html`)]),
					),
		},
	},
	logLevel: 'warn',
})
