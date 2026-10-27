import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import solid from 'vite-plugin-solid'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'node:path'
import { defineConfig } from 'vite'
import { aliases, constants } from '../../packages/playground/vue/vite.base.ts'
import { angular } from '../../packages/playground/vue/src/vite-angular.ts'

const resolve = (to: string) => path.resolve(import.meta.dirname, to)

/** The entry of each framework with a server renderer — Web Components have none. */
const ENTRIES = {
	vue: resolve('src/vue.ts'),
	react: resolve('src/react.tsx'),
	svelte: resolve('src/svelte.ts'),
	solid: resolve('src/solid.tsx'),
	angular: resolve('src/angular.ts'),
}

/**
 * The server run's bundles (see benchmarks/ssr/README.md in the root): one per
 * framework, `dist/<framework>.js`, run by Node.
 *
 * The pages draw the previews of the developer stand's hosts, so the
 * constants and aliases are the stand's (`packages/playground/vue/vite.base.ts`).
 * The plugins are its too, with two differences of a server bundle:
 *
 * - Solid compiles for the server (`ssr`): the stand's plugin compiles for the
 *   DOM only, and `renderToString` needs the server's output;
 * - Angular compiles the run's own root too (`src/angular/`), by a program
 *   that includes it beside the host (`src/angular/tsconfig.json`).
 *
 * Everything is bundled (`noExternal`), dependencies too: Angular's packages
 * come in partial form and need the linker, which only runs on what Vite
 * bundles. A production build, as a server runs.
 */
export default defineConfig({
	root: import.meta.dirname,
	plugins: [
		vue(),
		react({
			include: [
				/\/playground\/vue\/src\/hosts\/react\/.+\.[jt]sx?$/,
				/\/ui\/react\/src\/.+\.[jt]sx?$/,
				/\/bench-ssr\/src\/react\.tsx$/,
			],
		}),
		solid({
			ssr: true,
			hot: false,
			include: [
				/\/playground\/vue\/src\/hosts\/solid\/.+\.[jt]sx?$/,
				/\/ui\/solid\/src\/.+\.[jt]sx?$/,
				/\/bench-ssr\/src\/solid\.tsx$/,
			],
		}),
		svelte(),
		angular({
			tsconfig: resolve('src/angular/tsconfig.json'),
			include: [
				/\/playground\/vue\/src\/hosts\/angular\/.+\.ts$/,
				/\/ui\/angular\/src\/.+\.ts$/,
				/\/bench-ssr\/src\/angular\/.+\.ts$/,
			],
		}),
	],
	define: { ...constants(), 'process.env.NODE_ENV': JSON.stringify('production') },
	resolve: { alias: aliases({ themeCss: false }) },
	ssr: { noExternal: true, target: 'node' },
	build: {
		ssr: true,
		target: 'node24',
		outDir: resolve('dist'),
		emptyOutDir: true,
		minify: false,
		rolldownOptions: {
			input: ENTRIES,
			output: { format: 'es', entryFileNames: '[name].js' },
		},
	},
	logLevel: 'warn',
})
