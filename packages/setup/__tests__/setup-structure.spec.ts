/**
 * Сторож структуры `packages/setup`: модули верхнего уровня и рантайм-импорты между ними.
 *
 * Слой разложен по стадиям жизни компонента (AGENTS.md, «Структура
 * `packages/setup`»), и рантайм-импорт из модуля в модуль идёт только по
 * таблице ниже. `import type` не ограничен: связи в рантайме он не создаёт.
 *
 * Падает, если:
 * - рантайм-импорт между модулями не записан в таблице — в том числе импорт
 *   корня пакета изнутри модуля;
 * - у папки или файла верхнего уровня нет строки в таблице (кроме `__tests__`);
 * - код пакета вне тестов импортирует `@soldy/setup`: себя пакет видит только
 *   относительными путями;
 * - файл модуля нарушает соглашения раздела: нет шапки, рантайм в `types.ts`
 *   или `*.types.ts`, экспорт типов из файла с рантаймом, `export *` из файла
 *   в бочке.
 *
 * Разбор проверяет себя на известной связи `adapter → registry`: сломайся он —
 * импортов не нашлось бы, и сторож проходил бы вхолостую.
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import * as ts from 'typescript'

const SETUP = resolve(__dirname, '..')

/** Не код пакета: тесты и установленные зависимости. */
const SKIPPED = new Set(['__tests__', 'node_modules'])

/** Корень пакета — точка входа `@soldy/setup`. */
const ENTRY = 'index.ts'

/**
 * Модуль → модули, которые он вправе импортировать в рантайме.
 *
 * Модулей-стадий четыре: описание типа (`define`), имена (`naming`), реестры
 * приложения (`registry`) и всё, что живёт на время монтирования (`adapter`).
 */
const RUNTIME_IMPORTS: Readonly<Record<string, readonly string[]>> = {
	naming: [],
	registry: [],
	define: [],
	descriptors: ['define'],
	adapter: ['registry', 'naming', 'define'],
	[ENTRY]: ['define', 'descriptors', 'registry', 'adapter', 'naming'],
}

type TImport = {
	/** Файл внутри пакета, через `/`: `define/component.ts`. */
	file: string
	specifier: string
	/** Импорт удаляется из рантайма: `import type`, `export type` или `type` у каждого имени. */
	typeOnly: boolean
}

function packagePath(file: string): string {
	return relative(SETUP, file).split(sep).join('/')
}

/** Папки и `.ts`-файлы верхнего уровня — модули пакета. */
function topLevelEntries(): string[] {
	return readdirSync(SETUP, { withFileTypes: true })
		.filter((entry) => !SKIPPED.has(entry.name) && !entry.name.startsWith('.'))
		.filter((entry) => entry.isDirectory() || entry.name.endsWith('.ts'))
		.map((entry) => entry.name)
}

function sourceFiles(dir: string = SETUP, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (SKIPPED.has(name) || name.startsWith('.')) continue

		const full = join(dir, name)

		if (statSync(full).isDirectory()) {
			sourceFiles(full, files)
		} else if (name.endsWith('.ts')) {
			files.push(full)
		}
	}

	return files
}

/** Все имена помечены `type`: TypeScript удаляет такую декларацию целиком. */
function everyNameTypeOnly(names: ts.NodeArray<ts.ImportSpecifier | ts.ExportSpecifier>): boolean {
	return names.length > 0 && names.every((name) => name.isTypeOnly)
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
	const clause = node.importClause

	// `import './x'` — импорт ради побочного эффекта
	if (!clause) return false
	if (clause.isTypeOnly) return true
	if (clause.name) return false

	const bindings = clause.namedBindings

	return (
		bindings !== undefined &&
		ts.isNamedImports(bindings) &&
		everyNameTypeOnly(bindings.elements)
	)
}

function isTypeOnlyExport(node: ts.ExportDeclaration): boolean {
	if (node.isTypeOnly) return true

	const clause = node.exportClause

	return clause !== undefined && ts.isNamedExports(clause) && everyNameTypeOnly(clause.elements)
}

/** Импорты и реэкспорты файла, включая динамический `import()`. */
function collectImports(file: string, text: string): TImport[] {
	const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest)
	const imports: TImport[] = []

	const visit = (node: ts.Node): void => {
		if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
			imports.push({
				file,
				specifier: node.moduleSpecifier.text,
				typeOnly: isTypeOnlyImport(node),
			})
		} else if (
			ts.isExportDeclaration(node) &&
			node.moduleSpecifier !== undefined &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			imports.push({
				file,
				specifier: node.moduleSpecifier.text,
				typeOnly: isTypeOnlyExport(node),
			})
		} else if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword
		) {
			const [argument] = node.arguments

			if (argument !== undefined && ts.isStringLiteral(argument)) {
				imports.push({ file, specifier: argument.text, typeOnly: false })
			}
		}

		ts.forEachChild(node, visit)
	}

	visit(source)

	return imports
}

/** Модуль файла пакета: первая папка пути, у файла верхнего уровня — сам файл. */
function moduleOfFile(file: string): string {
	return file.split('/')[0]
}

/**
 * Модуль, в который ведёт относительный импорт; вне пакета — `undefined`.
 * Путь без расширения на верхнем уровне — папка, иначе `.ts`-файл: `'..'` и
 * `'../index'` ведут в корень пакета.
 */
function moduleOfTarget(file: string, specifier: string): string | undefined {
	const target = packagePath(resolve(SETUP, dirname(file), specifier))

	if (target.startsWith('..')) return undefined
	if (target === '') return ENTRY

	const [first, ...rest] = target.split('/')
	const folder = join(SETUP, first)

	if (rest.length > 0 || (existsSync(folder) && statSync(folder).isDirectory())) return first

	return `${first}.ts`
}

describe('разбор импортов', () => {
	it.each([
		["import type { A } from '../define'", true],
		["import { type A, type B } from '../define'", true],
		["import { a, type B } from '../define'", false],
		["import * as define from '../define'", false],
		["import '../define'", false],
		["export type { A } from '../define'", true],
		["export { a } from '../define'", false],
		["export * from '../define'", false],
		["const lazy = () => import('../define')", false],
	])('%s — только тип: %s', (text, typeOnly) => {
		expect(collectImports('assemble/bundle.ts', text)).toEqual([
			{ file: 'assemble/bundle.ts', specifier: '../define', typeOnly },
		])
	})

	it.each([
		['assemble/bundle.ts', '../define', 'define'],
		['assemble/bundle.ts', '../define/types', 'define'],
		['assemble/bundle.ts', './registered', 'assemble'],
		['adapter/context/types.ts', '../../define', 'define'],
		['define/component.ts', '..', ENTRY],
		['define/component.ts', '../index', ENTRY],
		[ENTRY, './adapter', 'adapter'],
		['define/component.ts', '../../core/src', undefined],
	])('%s: %s ведёт в %s', (file, specifier, expected) => {
		expect(moduleOfTarget(file, specifier)).toBe(expected)
	})
})

/** Файлы с рантаймом, которым можно экспортировать типы: типы выведены из их значений. */
const RUNTIME_WITH_TYPES = new Set(['registry/icons.ts'])

function isBarrel(file: string): boolean {
	return file === ENTRY || file.endsWith('/index.ts')
}

function isTypesFile(file: string): boolean {
	return /(^|\/|\.)types\.ts$/.test(file)
}

function isExported(node: ts.Node): boolean {
	return (
		ts.canHaveModifiers(node) &&
		(ts.getModifiers(node) ?? []).some(
			(modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
		)
	)
}

/** Объявление, которое останется в рантайме. */
function isRuntimeStatement(node: ts.Statement): boolean {
	return (
		ts.isVariableStatement(node) ||
		ts.isFunctionDeclaration(node) ||
		ts.isClassDeclaration(node) ||
		ts.isEnumDeclaration(node) ||
		ts.isExpressionStatement(node) ||
		(ts.isImportDeclaration(node) && !isTypeOnlyImport(node)) ||
		(ts.isExportDeclaration(node) && !isTypeOnlyExport(node))
	)
}

/** Объявление, которое отдаёт наружу тип. */
function exportsType(node: ts.Statement): boolean {
	if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) return isExported(node)

	return (
		ts.isExportDeclaration(node) &&
		(node.isTypeOnly ||
			(node.exportClause !== undefined &&
				ts.isNamedExports(node.exportClause) &&
				node.exportClause.elements.some((element) => element.isTypeOnly)))
	)
}

/**
 * Соглашения о файлах модуля: шапка с предложением о файле, `types.ts` и
 * `*.types.ts` без рантайма, файл с рантаймом без экспорта типов, бочка
 * реэкспортирует целиком только папку.
 */
function conventionViolations(file: string, text: string): string[] {
	const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest)
	const violations = new Set<string>()

	if (!isBarrel(file) && !/^\/\*\*\r?\n \* \S/.test(text)) {
		violations.add(`${file}: нет шапки с предложением о файле`)
	}

	for (const statement of source.statements) {
		if (isBarrel(file)) {
			if (
				ts.isExportDeclaration(statement) &&
				statement.exportClause === undefined &&
				statement.moduleSpecifier !== undefined &&
				ts.isStringLiteral(statement.moduleSpecifier)
			) {
				const specifier = statement.moduleSpecifier.text
				const target = resolve(SETUP, dirname(file), specifier)

				if (!existsSync(target) || !statSync(target).isDirectory()) {
					violations.add(`${file}: export * из файла '${specifier}' — нужен список имён`)
				}
			}
		} else if (isTypesFile(file)) {
			if (isRuntimeStatement(statement)) violations.add(`${file}: рантайм в файле типов`)
		} else if (exportsType(statement) && !RUNTIME_WITH_TYPES.has(file)) {
			violations.add(`${file}: файл с рантаймом экспортирует типы`)
		}
	}

	return [...violations]
}

describe('соглашения о файлах', () => {
	const header = '/**\n * Предложение о файле.\n */\n'

	it.each([
		[
			'define/inherit.ts',
			`${header}import type { T } from './types'\nexport const a: T = 1\n`,
			[],
		],
		[
			'define/inherit.ts',
			'export const a = 1\n',
			['define/inherit.ts: нет шапки с предложением о файле'],
		],
		[
			'define/inherit.ts',
			`${header}export type T = 1\nexport const a: T = 1\n`,
			['define/inherit.ts: файл с рантаймом экспортирует типы'],
		],
		[
			'define/inherit.ts',
			`${header}export { type T } from './types'\n`,
			['define/inherit.ts: файл с рантаймом экспортирует типы'],
		],
		[
			'define/types.ts',
			`${header}export function f(): void {}\n`,
			['define/types.ts: рантайм в файле типов'],
		],
		[
			'define/inference.types.ts',
			`${header}import { a } from './inherit'\nexport type T = typeof a\n`,
			['define/inference.types.ts: рантайм в файле типов'],
		],
		['define/index.ts', "export * from '../naming'\nexport type { T } from './types'\n", []],
		[
			'define/index.ts',
			"export * from './types'\n",
			["define/index.ts: export * из файла './types' — нужен список имён"],
		],
		[
			'descriptors/components/button.descriptor.ts',
			`${header}export type T = 1\nexport const a: T = 1\n`,
			['descriptors/components/button.descriptor.ts: файл с рантаймом экспортирует типы'],
		],
	])('%s: %j', (file, text, expected) => {
		expect(conventionViolations(file, text)).toEqual(expected)
	})
})

describe('структура packages/setup', () => {
	const files = sourceFiles().map((full) => ({
		file: packagePath(full),
		text: readFileSync(full, 'utf-8'),
	}))

	const imports = files.flatMap(({ file, text }) => collectImports(file, text))

	/** Рантайм-импорты из модуля в другой модуль пакета. */
	const crossings = imports.flatMap(({ file, specifier, typeOnly }) => {
		if (typeOnly || !specifier.startsWith('.')) return []

		const from = moduleOfFile(file)
		const to = moduleOfTarget(file, specifier)

		return to === undefined || to === from ? [] : [{ file, specifier, from, to }]
	})

	it('разбор находит известную рантайм-связь adapter → registry', () => {
		expect(crossings.some(({ from, to }) => from === 'adapter' && to === 'registry')).toBe(true)
	})

	it('у каждой папки и файла верхнего уровня есть строка в таблице', () => {
		const missing = topLevelEntries().filter((name) => !Object.hasOwn(RUNTIME_IMPORTS, name))

		expect(
			missing,
			`Модуль без строки в таблице импортов (см. AGENTS.md, «Структура packages/setup»):\n${missing.join('\n')}`,
		).toEqual([])
	})

	it('рантайм-импорт между модулями — только по таблице', () => {
		const violations = crossings
			.filter(({ from, to }) => !(RUNTIME_IMPORTS[from] ?? []).includes(to))
			.map(({ file, specifier, from, to }) => `${file}: ${from} → ${to} ('${specifier}')`)

		expect(
			violations,
			`Рантайм-импорт вне таблицы (см. AGENTS.md, «Структура packages/setup»):\n${violations.join('\n')}`,
		).toEqual([])
	})

	/**
	 * Ядро обмена (`adapter/exchange`) — ячейки, линии и порты — знает только
	 * описание свойства и поверхность. Узнай оно о наборе плагинов, реестрах или
	 * контексте, правила записи снова расползлись бы по сборке: именно эта
	 * граница держит «одно правило — одно место».
	 */
	it('ядро обмена не импортирует сборку, реестры, дескрипторы и плагины', () => {
		const FORBIDDEN = ['../context', '../extensions', '../../registry', '../../descriptors']

		const violations = imports
			.filter(({ file }) => file.startsWith('adapter/exchange/'))
			.filter(
				({ specifier }) =>
					specifier === '@soldy/plugins' ||
					FORBIDDEN.some(
						(prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`),
					),
			)
			.map(({ file, specifier }) => `${file}: '${specifier}'`)

		expect(violations, `Ядро обмена знает лишнее:\n${violations.join('\n')}`).toEqual([])
	})

	it('код пакета не импортирует @soldy/setup', () => {
		const violations = imports
			.filter(
				({ specifier }) =>
					specifier === '@soldy/setup' || specifier.startsWith('@soldy/setup/'),
			)
			.map(({ file, specifier }) => `${file}: '${specifier}'`)

		expect(
			violations,
			`Пакет импортирует сам себя через корень — нужен относительный путь:\n${violations.join('\n')}`,
		).toEqual([])
	})

	it('файлы модулей следуют соглашениям о типах, бочках и шапках', () => {
		const violations = files.flatMap(({ file, text }) => conventionViolations(file, text))

		expect(
			violations,
			`Файл нарушает соглашения (см. AGENTS.md, «Структура packages/setup»):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
