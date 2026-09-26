import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { build as viteBuild } from 'vite'
import setupConfig from '../vite.setup.config'

/**
 * Выходов у темы два: CSS (`dist/index.css`) и поведение (`dist/setup`), —
 * и оба лежат в одном каталоге, который сборка чистит (`emptyOutDir`).
 *
 * Значит есть порядок, который ломается молча: собери поведение раньше CSS —
 * и CSS-сборка сотрёт его, а заметит это только потребитель пакета.
 *
 * Молча ломается и состав CSS-выхода: `files` везёт весь `dist`, и лишний файл
 * рядом с `index.css` уезжает в пакет без назначения. Так уезжал пустой JS
 * входа, пока стили собирал режим библиотеки, — `theme-oren.js`.
 *
 * Сторожит сторож отсюда. Что цели `exports` ведут на файлы и что пакет с
 * выходом сборки стоит в корневом `build`, проверяет
 * `packages/setup/__tests__/workspace-manifests.spec.ts` — здесь этого нет.
 */

const ROOT = resolve(import.meta.dirname, '..')

type TManifest = {
	readonly exports: Readonly<Record<string, unknown>>
	readonly files: readonly string[]
	readonly scripts: Readonly<Record<string, string>>
}

const manifest: TManifest = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))

/**
 * Файлы, которые CSS-сборка положила бы в `dist`. Сборка идёт тем же конфигом,
 * что у `build:css`, но в памяти: `dist` на диске она не трогает. Выходов у
 * сборки бывает несколько — по одному на формат режима библиотеки, — и файлы
 * собираются со всех.
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

describe('тема oren · поставка', () => {
	it('поведение уезжает собранным, а не исходниками', () => {
		expect(manifest.exports['./setup']).toEqual({
			types: './dist/setup/index.d.ts',
			default: './dist/setup/index.js',
		})

		// Каталог `setup` в `files` вернул бы исходники в пакет вторым путём
		expect(manifest.files).not.toContain('setup')
	})

	it('CSS-сборка кладёт в dist один index.css', async () => {
		// Имя читают `main`, `style` и `exports["."]` темы. Второго файла быть
		// не должно: ни одна точка входа на него не ведёт
		expect(await cssOutputFiles()).toEqual(['index.css'])
	})

	it('поведение собирается в свой подкаталог, а не поверх CSS', () => {
		const outDir = setupConfig.build?.outDir

		expect(outDir).toBeTypeOf('string')
		expect(outDir).not.toBe('dist')
		expect(outDir).toMatch(/^dist\//)

		// Каталог чистится: без этого сборка поведения снесла бы `dist/index.css`
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
		// Декларации после бандла: обратный порядок стёр бы их тем же `emptyOutDir`
		expect(types).toBeGreaterThan(setup)
	})
})
