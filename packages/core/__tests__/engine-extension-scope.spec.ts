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
 * Имя расширения — строка, которой класс инициализирует свойство `name`
 * (`'order' as const`, `name: string = 'list'`). Имена собираются по
 * синтаксическому дереву, поэтому новое расширение попадает под проверку само,
 * а инициализатор, из которого строку не достать, роняет тест: имени, которого
 * сторож не прочёл, он бы и не проверил. Ищется имя своими словами подряд
 * внутри идентификатора или строки кода ядра движка (`orderChanged`,
 * `'change:order'`, `positionInSetFlag`); комментарии — не код, в них
 * ссылаться на расширения можно.
 *
 * Ловится имя, а не смысл: переименованный флаг сторож пропустит.
 */

const ROOT = resolve(__dirname, '../../..')
const COMPONENTS_DIR = resolve(__dirname, '../src/components')
const ENGINE_DIR = join(COMPONENTS_DIR, 'base/collection/engine')

/** Стандартные расширения — в движке, свои — у коллекций компонентов. */
const EXTENSION_DIR = /[\\/](engine[\\/]extension|collection[\\/]extensions)[\\/]/

/**
 * Слова, которыми ядро пользуется само, — расширение с таким именем совпадает
 * с ядром случайно. Сверяется имя целиком: имя из нескольких слов, где есть
 * такое слово, проверяется.
 */
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

/** Объявление имени; `name` пуст, если строку из инициализатора не достать. */
type TDeclaredName = { name: string | undefined; line: number }

/** Имя расширения внутри идентификатора или строки кода. */
type TMention = { name: string; text: string; line: number }

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

function parse(file: string): ts.SourceFile {
	return ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest)
}

function lineOf(source: ts.SourceFile, node: ts.Node): number {
	return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
}

/** Строка литерала, в том числе под `as const`. */
function literalText(expression: ts.Expression): string | undefined {
	if (ts.isStringLiteralLike(expression)) return expression.text
	if (ts.isAsExpression(expression)) return literalText(expression.expression)

	return undefined
}

/**
 * Имена, которыми классы файла инициализируют свойство `name`: литерал, под
 * `as const`, с аннотацией типа, с `readonly` и без. Объявление без
 * инициализатора (`abstract` у базы) имени не даёт и пропускается.
 */
function declaredNames(source: ts.SourceFile): TDeclaredName[] {
	const declared: TDeclaredName[] = []

	const visit = (node: ts.Node): void => {
		if (
			ts.isPropertyDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.name.text === 'name' &&
			node.initializer
		) {
			declared.push({ name: literalText(node.initializer), line: lineOf(source, node) })
		}

		ts.forEachChild(node, visit)
	}

	visit(source)

	return declared
}

/** Объявления имён во всех файлах расширений, с файлом для места `файл:строка`. */
function collectDeclaredNames(): (TDeclaredName & { file: string })[] {
	return collectSourceFiles(COMPONENTS_DIR)
		.filter((file) => EXTENSION_DIR.test(file))
		.flatMap((file) =>
			declaredNames(parse(file)).map((declared) => ({ ...declared, file: toRelative(file) })),
		)
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
function codeTexts(source: ts.SourceFile): { text: string; line: number }[] {
	const texts: { text: string; line: number }[] = []

	const visit = (node: ts.Node): void => {
		if (
			ts.isIdentifier(node) ||
			ts.isPrivateIdentifier(node) ||
			ts.isStringLiteralLike(node) ||
			ts.isTemplateLiteralToken(node)
		) {
			texts.push({ text: node.text, line: lineOf(source, node) })
		}

		ts.forEachChild(node, visit)
	}

	visit(source)

	return texts
}

/** Стоят ли слова `run` подряд среди `words`. */
function containsRun(words: readonly string[], run: readonly string[]): boolean {
	return words.some((_, start) => run.every((word, offset) => words[start + offset] === word))
}

/**
 * Имена в коде файла: имя своими словами подряд внутри идентификатора или
 * строки — `positionInSet` в `positionInSetFlag`, но не в соседних `position`
 * и `'in set'`.
 */
function mentions(source: ts.SourceFile, names: readonly string[]): TMention[] {
	const runs = names.map((name) => ({ name, words: splitWords(name) }))

	return codeTexts(source)
		.filter(({ text }) => !BUILTIN_MEMBERS.has(text))
		.flatMap(({ text, line }) => {
			const words = splitWords(text)

			return runs
				.filter((run) => containsRun(words, run.words))
				.map(({ name }) => ({ name, text, line }))
		})
}

describe('engine extension scope guard', () => {
	it('имя каждого расширения прочитано', () => {
		const declared = collectDeclaredNames()
		const unread = declared
			.filter(({ name }) => name === undefined)
			.map(({ file, line }) => `${file}:${line}`)

		expect(declared.length, 'не найдено ни одного расширения — сломан поиск').toBeGreaterThan(0)
		expect(
			unread,
			`Имя расширения — не строка в инициализаторе \`name\`, сторож его не проверит:\n` +
				unread.join('\n'),
		).toEqual([])
	})

	it('в коде ядра движка нет имён расширений', () => {
		const extensionNames = new Set(
			collectDeclaredNames().flatMap(({ name }) => (name === undefined ? [] : [name])),
		)
		const names = [...extensionNames].filter((name) => !ENGINE_OWN_WORDS.has(name))
		const engineFiles = collectSourceFiles(ENGINE_DIR).filter(
			(file) => !EXTENSION_DIR.test(file),
		)

		expect(engineFiles.length, 'не найдено ни одного файла ядра движка').toBeGreaterThan(0)

		const violations = engineFiles.flatMap((file) =>
			mentions(parse(file), names).map(
				({ name, text, line }) => `${toRelative(file)}:${line} — «${name}» в \`${text}\``,
			),
		)

		expect(
			violations,
			`Понятие расширения в ядре движка (см. AGENTS.md,` +
				` "Движок не знает о конкретных расширениях"):\n${violations.join('\n')}`,
		).toEqual([])
	})

	describe('поиск', () => {
		const fixture = (lines: string[]): ts.SourceFile =>
			ts.createSourceFile('fixture.ts', lines.join('\n'), ts.ScriptTarget.Latest)

		it('имя — строка инициализатора name', () => {
			const source = fixture([
				'abstract class TBase { abstract readonly name: string }',
				"class TPosition extends TBase { readonly name = 'positionInSet' as const }",
				"class TList extends TBase { readonly name: string = 'list' }",
				"class TPlain extends TBase { name = 'plain' }",
				'class TNamed extends TBase { readonly name = NAME }',
			])

			expect(declaredNames(source)).toEqual([
				{ name: 'positionInSet', line: 2 },
				{ name: 'list', line: 3 },
				{ name: 'plain', line: 4 },
				{ name: undefined, line: 5 },
			])
		})

		it('имя из нескольких слов — подряд внутри идентификатора или строки', () => {
			const source = fixture([
				'// positionInSet — в комментарии можно',
				'const positionInSetFlag = true',
				"const position = 'in set'",
			])

			expect(mentions(source, ['positionInSet'])).toEqual([
				{ name: 'positionInSet', text: 'positionInSetFlag', line: 2 },
			])
		})
	})
})
