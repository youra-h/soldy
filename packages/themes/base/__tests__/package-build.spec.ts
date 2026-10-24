import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import setupConfig from '../vite.setup.config'

/**
 * Выходов у общего слоя тем два, и поставка у них разная: CSS уезжает
 * исходником — компилировать в нём нечего, тема вшивает его своим сборщиком, —
 * а поведение (`./setup`, плагины раскладки) — собранным, как у остальных
 * библиотечных пакетов (`docs/agents/build.md`, «Сборка пакетов»).
 *
 * Обе ошибки молчат: тесты и стенд ходят в исходники, и заметил бы их только
 * потребитель. Каталог `setup` в `files` вернул бы исходники поведения в пакет
 * вторым путём, а сборка мимо каталога, куда ведёт `exports["./setup"]`,
 * оставила бы точку входа пустой.
 *
 * Что цели `exports` ведут на файлы и что пакет с выходом сборки стоит в
 * корневом `build` раньше темы, которая от него зависит, проверяет
 * `packages/setup/__tests__/workspace-manifests.spec.ts`, а рецепт сборки —
 * `packages/setup/__tests__/package-builds.spec.ts`; здесь этого нет.
 */

const ROOT = resolve(import.meta.dirname, '..')

type TManifest = {
	readonly style: string
	readonly exports: Readonly<Record<string, unknown>>
	readonly files: readonly string[]
}

type TTsconfig = {
	readonly compilerOptions: { readonly outDir: string }
}

const manifest: TManifest = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))
const declarations: TTsconfig = JSON.parse(
	readFileSync(resolve(ROOT, 'tsconfig.build.json'), 'utf-8'),
)

describe('общий слой тем · поставка', () => {
	it('CSS уезжает исходником', () => {
		expect(manifest.exports['.']).toBe('./src/index.css')
		expect(manifest.style).toBe('./src/index.css')
		expect(manifest.files).toContain('src')
	})

	it('поведение уезжает собранным, а не исходниками', () => {
		expect(manifest.exports['./setup']).toEqual({
			types: './dist/setup/index.d.ts',
			default: './dist/setup/index.js',
		})

		// Каталог `setup` в `files` вернул бы исходники в пакет вторым путём
		expect(manifest.files).not.toContain('setup')
	})

	it('бандл и декларации ложатся туда, куда ведёт ./setup', () => {
		// Точка входа ведёт в `dist/setup`: выход мимо него никем не читается
		expect(setupConfig.build?.outDir).toBe('dist/setup')
		expect(declarations.compilerOptions.outDir).toBe('dist/setup')
	})
})
