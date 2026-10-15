import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

/**
 * Сторож: исходник ядра не импортирует в рантайме собственный пакет
 * (`@soldy-ui/core`).
 *
 * Имя пакета ведёт в бочку `src/index.ts`, и такой импорт изнутри замыкает
 * цикл через все компоненты ядра: `base-item-extension.class.ts` брал
 * `TEvented` из бочки, бочка доходила до расширения опции Select, а оно
 * наследует `TBaseItemExtension` — ещё не определённый. Сработает ли цикл,
 * решал сборщик — с какого модуля он входит в ядро. Сборщик спеков Angular
 * (esbuild с общими кусками на много входов) входил не с того, и все спеки
 * падали на загрузке: «Class extends value undefined». Внутри пакета —
 * относительные пути, как у соседей.
 *
 * Импорт только типов (`import type`) в рантайм не попадает и цикла не
 * замыкает — сторож его пропускает.
 */

const ROOT = resolve(__dirname, '../../..')
const SRC = resolve(__dirname, '../src')

/** Импорт или реэкспорт из пакета ядра, кроме `import type` / `export type`. */
const SELF_IMPORT =
	/(?:^|\n)\s*(?:import|export)\s+(?!type\s)[^;]*?\bfrom\s+['"]@soldy-ui\/core['"]/

function collectSourceFiles(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)

		if (statSync(full).isDirectory()) collectSourceFiles(full, files)
		else if (/\.ts$/.test(name)) files.push(full)
	}

	return files
}

function toRelative(file: string): string {
	return relative(ROOT, file).split('\\').join('/')
}

describe('ядро не импортирует собственный пакет', () => {
	it.each([
		["import { TEvented } from '@soldy-ui/core'", true],
		["export { TEvented } from '@soldy-ui/core'", true],
		["import type { TEvented } from '@soldy-ui/core'", false],
		["import { TEvented } from '../../common/event'", false],
	])('%s — %s', (source, expected) => {
		expect(SELF_IMPORT.test(source)).toBe(expected)
	})

	it('в src нет рантайм-импорта из @soldy-ui/core', () => {
		const files = collectSourceFiles(SRC)

		expect(files.length, 'не найдено ни одного исходника ядра').toBeGreaterThan(0)

		const violations = files
			.filter((file) => SELF_IMPORT.test(readFileSync(file, 'utf-8')))
			.map(toRelative)

		expect(
			violations,
			`Импорт ядра из собственного пакета — цикл через бочку:\n${violations.join('\n')}`,
		).toEqual([])
	})
})
