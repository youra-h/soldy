import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as ts from 'typescript'
import { build as viteBuild } from 'vite'
import setupConfig from '../vite.setup.config'

/**
 * The theme has two outputs, the CSS (`dist/index.css`) and the behavior
 * (`dist/setup`), and both lie in one folder that the build cleans
 * (`emptyOutDir`).
 *
 * So there is an order that breaks silently: build the behavior before the CSS,
 * and the CSS build wipes it out — only a consumer of the package would notice.
 *
 * The content of the CSS output breaks silently too: `files` ships the whole
 * `dist`, and an extra file next to `index.css` goes into the package for no
 * purpose. So did the empty JS of the entry while the library mode built the
 * styles — `theme-oren.js`.
 *
 * And the declarations of the behavior: they reference `index.d.ts`, so the
 * values of the theme reach the types wherever the stylesheet comes from. A
 * reference the emitter drops leaves `variant` of an Angular CLI or a Nuxt
 * application with no value at all, and the tests and the playground, which
 * read the sources, would not notice either.
 *
 * That the targets of `exports` lead to files and that a package with a build
 * output stands in the root `build` is checked by
 * `packages/setup/__tests__/workspace-manifests.spec.ts`, not here.
 */

const ROOT = resolve(import.meta.dirname, '..')

type TManifest = {
	readonly name: string
	readonly types: string
	readonly exports: Readonly<Record<string, unknown>>
	readonly files: readonly string[]
	readonly scripts: Readonly<Record<string, string>>
}

const manifest: TManifest = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))

/**
 * The files the CSS build would put into `dist`. The build runs with the same
 * config as `build:css`, but in memory: it leaves `dist` on disk alone. A build
 * may have several outputs — one per format of the library mode — and the files
 * are gathered from all of them.
 */
async function cssOutputFiles(): Promise<string[]> {
	const result = await viteBuild({
		root: ROOT,
		configFile: resolve(ROOT, 'vite.config.ts'),
		logLevel: 'silent',
		build: { write: false },
	})

	return [result].flat().flatMap((output) => {
		if (!('output' in output)) {
			throw new Error('CSS-сборка ушла в режим наблюдения и выхода не отдала')
		}

		return output.output.map(({ fileName }) => fileName)
	})
}

/**
 * The type references in the declarations of `./setup`, as the emitter of tsc
 * writes them — the one the third step of `build` runs, here for the one module
 * and in memory.
 */
function setupDeclarationReferences(): string[] {
	const source = readFileSync(resolve(ROOT, 'setup/index.ts'), 'utf-8')
	const { outputText } = ts.transpileDeclaration(source, { fileName: 'index.ts' })

	return ts.preProcessFile(outputText).typeReferenceDirectives.map(({ fileName }) => fileName)
}

describe('тема oren · поставка', () => {
	it('поведение уезжает собранным, а не исходниками', () => {
		expect(manifest.exports['./setup']).toEqual({
			types: './dist/setup/index.d.ts',
			default: './dist/setup/index.js',
		})

		// A `setup` folder in `files` would bring the sources back into the
		// package as a second path
		expect(manifest.files).not.toContain('setup')
	})

	it('CSS-сборка кладёт в dist один index.css', async () => {
		// `main`, `style` and `exports["."]` of the theme read this name. There
		// must be no second file: no entry point leads to it
		expect(await cssOutputFiles()).toEqual(['index.css'])
	})

	it('поведение собирается в свой подкаталог, а не поверх CSS', () => {
		const outDir = setupConfig.build?.outDir

		expect(outDir).toBeTypeOf('string')
		expect(outDir).not.toBe('dist')
		expect(outDir).toMatch(/^dist\//)

		// The folder is cleaned: in `dist` itself the behavior build would wipe
		// out `dist/index.css`
		expect(setupConfig.build?.emptyOutDir).toBe(true)
	})

	it('в скрипте build CSS идёт первым: он чистит весь dist', () => {
		const { build } = manifest.scripts

		expect(manifest.scripts['build:css']).toBeTypeOf('string')

		const css = build.indexOf('build:css')
		const setup = build.indexOf('vite.setup.config.ts')
		const types = build.indexOf('tsconfig.build.json')

		expect(css).toBeGreaterThanOrEqual(0)
		expect(setup).toBeGreaterThan(css)
		// The declarations after the bundle: the reverse order would wipe them
		// out by the same `emptyOutDir`
		expect(types).toBeGreaterThan(setup)
	})

	it('декларации ./setup ссылаются на значения темы в index.d.ts', () => {
		// The name of the package leads to `index.d.ts`, where the values are
		// declared, and the declarations of the behavior name it: the emitter
		// keeps a reference only with `preserve="true"`, as it drops `import type {}`
		expect(manifest.types).toBe('./index.d.ts')
		expect(manifest.exports['.']).toMatchObject({ types: './index.d.ts' })
		expect(setupDeclarationReferences()).toEqual([manifest.name])
	})
})
