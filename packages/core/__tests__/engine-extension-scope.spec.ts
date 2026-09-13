import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import * as ts from 'typescript'

/**
 * Сторож правила «движок не знает о конкретных расширениях» (см. AGENTS.md).
 * Драйвер, команды, хранилище, контексты и типы движка — общий фундамент всех
 * коллекций; понятие отдельного расширения не должно проникать туда ни флагом
 * команды, ни событием драйвера.
 *
 * Имена расширений собираются из `readonly name = '...'`, поэтому новое
 * расширение попадает под проверку само. Ищутся они словами в идентификаторах
 * и строках кода ядра движка (`orderChanged`, `'change:order'`); комментарии —
 * не код, в них ссылаться на расширения можно.
 *
 * Ловится имя, а не смысл: переименованный флаг сторож пропустит.
 */

const ROOT = resolve(__dirname, '../../..')
const COMPONENTS_DIR = resolve(__dirname, '../src/components')
const ENGINE_DIR = join(COMPONENTS_DIR, 'base/collection/engine')

/** Стандартные расширения — в движке, свои — у коллекций компонентов. */
const EXTENSION_DIR = /[\\/](engine[\\/]extension|collection[\\/]extensions)[\\/]/

const EXTENSION_NAME = /readonly name = '([a-z]+)' as const/g

/** Слова, которыми ядро пользуется само — совпадение с именем расширения случайно. */
const ENGINE_OWN_WORDS = new Set([
	// `driver.batch()` — операция драйвера, расширение `batch` названо по ней.
	'batch',
	// meta-снапшот `_` в событиях элементов — контракт ядра, расширение `meta` его читает.
	'meta',
	// `valueOf()` и параметр сеттера `value`.
	'value',
])

/** `.filter()`, `.values()` и т.п. — методы встроенных типов, а не расширения. */
const BUILTIN_MEMBERS = new Set(
	[Object.prototype, Array.prototype, Map.prototype, Set.prototype, String.prototype].flatMap(
		(proto) => Object.getOwnPropertyNames(proto),
	),
)

function collectSourceFiles(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)

		if (statSync(full).isDirectory()) {
			collectSourceFiles(full, files)
		} else if (/\.ts$/.test(name)) {
			files.push(full)
		}
	}

	return files
}

function toRelative(file: string): string {
	return relative(ROOT, file).split('\\').join('/')
}

function collectExtensionNames(): Set<string> {
	const names = new Set<string>()

	for (const file of collectSourceFiles(COMPONENTS_DIR)) {
		if (!EXTENSION_DIR.test(file)) continue

		for (const match of readFileSync(file, 'utf-8').matchAll(EXTENSION_NAME)) {
			names.add(match[1])
		}
	}

	return names
}

/** `TOrderExtension` → `t order extension`, `'change:order'` → `change order`. */
function splitWords(text: string): string[] {
	return text
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean)
		.map((word) => word.toLowerCase())
}

/** Идентификаторы и строки кода. Комментарии и JSDoc в AST узлами не бывают. */
function codeTexts(file: string): { text: string; line: number }[] {
	const source = ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest)
	const texts: { text: string; line: number }[] = []

	const visit = (node: ts.Node): void => {
		if (
			ts.isIdentifier(node) ||
			ts.isPrivateIdentifier(node) ||
			ts.isStringLiteralLike(node) ||
			ts.isTemplateLiteralToken(node)
		) {
			const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1

			texts.push({ text: node.text, line })
		}

		ts.forEachChild(node, visit)
	}

	visit(source)

	return texts
}

describe('engine extension scope guard', () => {
	it('в коде ядра движка нет имён расширений', () => {
		const names = collectExtensionNames()
		const engineFiles = collectSourceFiles(ENGINE_DIR).filter(
			(file) => !EXTENSION_DIR.test(file),
		)

		expect(names.size, 'не найдено ни одного расширения — сломан поиск').toBeGreaterThan(0)
		expect(engineFiles.length, 'не найдено ни одного файла ядра движка').toBeGreaterThan(0)

		const violations = engineFiles.flatMap((file) =>
			codeTexts(file)
				.filter(({ text }) => !BUILTIN_MEMBERS.has(text))
				.flatMap(({ text, line }) =>
					splitWords(text)
						.filter((word) => names.has(word) && !ENGINE_OWN_WORDS.has(word))
						.map((word) => `${toRelative(file)}:${line} — «${word}» в \`${text}\``),
				),
		)

		expect(
			violations,
			`Понятие расширения в ядре движка (см. AGENTS.md,` +
				` "Движок не знает о конкретных расширениях"):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
