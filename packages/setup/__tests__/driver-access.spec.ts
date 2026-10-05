import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import * as ts from 'typescript'

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

const EXCLUDED_DIR_NAMES = new Set(['node_modules', 'dist', '__tests__', 'coverage', '.turbo'])

/** Единственные места, легально обращающиеся к driver. */
const ALLOWED_PATTERNS = [
	// Расширения коллекций ядра (custom/*/collection/extensions/**).
	/[\\/]collection[\\/]extensions[\\/]/,
	// Движок коллекции и его собственные расширения (base/collection/engine/**).
	/[\\/]collection[\\/]engine[\\/]/,
]

const DRIVER_ACCESS = /\.driver\b/

/**
 * Единственное место, где исполняется выборка, — `batch.shown`. Путь чтения
 * один, и выборка на нём без параметров: на этом держится память выборки —
 * стратегия чтения драйвера отдаёт прежний результат любому вызову `query()`.
 * Второй вызов с другой выборкой получил бы чужой результат.
 */
const QUERY_SITE =
	'packages/core/src/components/base/collection/engine/extension/batch/batch.extension.ts'

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

/**
 * Вызывает ли код файла `query()` у драйвера — `ctx.driver.query(…)`,
 * `this._driver.query(…)`. По синтаксическому дереву, а не по тексту:
 * комментарий, который называет `driver.query()`, вызовом не считается.
 */
function callsDriverQuery(file: string): boolean {
	const text = readFileSync(file, 'utf-8')

	// Дерево строится только у файлов, где вызов вообще возможен
	if (!text.includes('query(')) return false

	const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest)
	let found = false

	const visit = (node: ts.Node): void => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			node.expression.name.text === 'query' &&
			/driver$/i.test(node.expression.expression.getText(source))
		) {
			found = true
		}

		if (!found) ts.forEachChild(node, visit)
	}

	visit(source)

	return found
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

	it('выборку исполняет только batch.shown', () => {
		const sites = collectSourceFiles(PACKAGES_DIR)
			.filter(callsDriverQuery)
			.map((file) => toRelative(file))

		expect(
			sites,
			`driver.query() вне batch.shown (см. AGENTS.md,` +
				` "Память выборки — механизм коллекции"):\n${sites.join('\n')}`,
		).toEqual([QUERY_SITE])
	})
})
