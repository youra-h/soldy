import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

/**
 * Сторож правила «к driver обращается только расширение коллекции»
 * (см. AGENTS.md). Плагины, расширения адаптера, фасады и код `packages/ui/*`
 * обязаны работать через `engine.extensions.batch`/`engine.extensions.plain`,
 * а не через `engine.driver` напрямую — иначе обёртка над storage, ради
 * которой driver вообще существует, становится бесполезной.
 *
 * Сканируется весь исходный код пакетов (не только `src/*`: у `setup`,
 * например, исходники лежат прямо в `adapter/`, `descriptors/` и т.п.),
 * кроме `node_modules`, сборок и тестов — тесты ядра легально дергают
 * `col.getCore().driver`, потому что проверяют сам движок, а не обходят его.
 */

const ROOT = resolve(__dirname, '../../..')
const PACKAGES_DIR = join(ROOT, 'packages')

const EXCLUDED_DIR_NAMES = new Set([
	'node_modules',
	'dist',
	'__tests__',
	'coverage',
	'.turbo',
])

/** Единственные места, легально обращающиеся к driver. */
const ALLOWED_PATTERNS = [
	// Расширения коллекций ядра (custom/*/collection/extensions/**).
	/[\\/]collection[\\/]extensions[\\/]/,
	// Движок коллекции и его собственные расширения (base/collection/engine/**).
	/[\\/]collection[\\/]engine[\\/]/,
]

const DRIVER_ACCESS = /\.driver\b/

function collectSourceFiles(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (EXCLUDED_DIR_NAMES.has(name)) continue

		const full = join(dir, name)
		const stat = statSync(full)

		if (stat.isDirectory()) {
			collectSourceFiles(full, files)
		} else if (/\.tsx?$/.test(name)) {
			files.push(full)
		}
	}

	return files
}

function toRelative(file: string): string {
	return relative(ROOT, file).split('\\').join('/')
}

describe('driver access guard', () => {
	it('запрещает прямое обращение к driver вне расширений коллекции', () => {
		const violations = collectSourceFiles(PACKAGES_DIR)
			.map((file) => ({ relPath: toRelative(file), file }))
			.filter(({ relPath }) => !ALLOWED_PATTERNS.some((re) => re.test(relPath)))
			.filter(({ file }) => DRIVER_ACCESS.test(readFileSync(file, 'utf-8')))
			.map(({ relPath }) => relPath)

		expect(
			violations,
			`Прямое обращение к driver вне расширений коллекции (см. AGENTS.md,` +
				` "К driver обращается только расширение коллекции"):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
