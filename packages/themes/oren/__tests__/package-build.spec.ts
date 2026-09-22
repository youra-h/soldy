import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import setupConfig from '../vite.setup.config'

/**
 * Выходов у темы два: CSS (`dist/index.css`) и поведение (`dist/setup`), —
 * и оба лежат в одном каталоге, который сборка чистит (`emptyOutDir`).
 *
 * Значит есть порядок, который ломается молча: собери поведение раньше CSS —
 * и CSS-сборка сотрёт его, а заметит это только потребитель пакета.
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

describe('тема oren · поставка', () => {
	it('поведение уезжает собранным, а не исходниками', () => {
		expect(manifest.exports['./setup']).toEqual({
			types: './dist/setup/index.d.ts',
			default: './dist/setup/index.js',
		})

		// Каталог `setup` в `files` вернул бы исходники в пакет вторым путём
		expect(manifest.files).not.toContain('setup')
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
