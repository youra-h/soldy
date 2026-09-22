/**
 * Сторож структуры `packages/setup`: два слоя, их модули и рантайм-импорты между ними.
 *
 * Пакет разложен по двум слоям (AGENTS.md, «Структура `packages/setup`»):
 * `protected/` — механика, одинаковая для всех компонентов, `content/` —
 * наполнение, которое растёт вместе с библиотекой. Внутри слоёв модули
 * повторяют стадии жизни компонента, и рантайм-импорт из модуля в модуль идёт
 * только по таблице ниже. `import type` не ограничен: связи в рантайме он не
 * создаёт. Зависимость между слоями односторонняя: наполнение знает механику,
 * механика о наполнении не знает вовсе — ни в рантайме, ни типом.
 *
 * Падает, если:
 * - рантайм-импорт между модулями не записан в таблице — в том числе импорт
 *   корня пакета изнутри модуля;
 * - `protected/` импортирует что-нибудь из `content/`;
 * - на верхнем уровне пакета заведена папка мимо двух слоёв;
 * - у модуля слоя нет строки в таблице (кроме `__tests__`);
 * - код пакета вне тестов импортирует `@soldy-ui/setup`: себя пакет видит только
 *   относительными путями;
 * - файл модуля нарушает соглашения раздела: нет шапки, рантайм в `types.ts`
 *   или `*.types.ts`, экспорт типов из файла с рантаймом, `export *` из файла
 *   в бочке.
 *
 * Разбор проверяет себя на известной связи `protected/adapter →
 * protected/registry`: сломайся он — импортов не нашлось бы, и сторож
 * проходил бы вхолостую.
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import * as ts from 'typescript'

const SETUP = resolve(__dirname, '..')

/**
 * Не код пакета: тесты, установленные зависимости, выход сборки и конфиги
 * сборки с прогоном. Слои и их модули — это то, что уезжает потребителю, а
 * `vite.lib.config.ts` и `vitest.config.ts` лежат рядом с ними только потому,
 * что оба инструмента ищут конфиг в корне пакета.
 */
const SKIPPED = new Set([
	'__tests__',
	'node_modules',
	'dist',
	'vite.lib.config.ts',
	'vitest.config.ts',
])

/** Корень пакета — точка входа `@soldy-ui/setup`. */
const ENTRY = 'index.ts'

/** Слои пакета: механика и наполнение. */
const LAYERS = ['protected', 'content'] as const

/**
 * Модуль → модули, которые он вправе импортировать в рантайме.
 *
 * В механике стадий четыре: описание типа (`define`), имена (`naming`),
 * реестры приложения (`registry`) и всё, что живёт на время монтирования
 * (`adapter`). Наполнение — дескрипторы, расширения и роли иконок: оно
 * импортирует механику, обратных строк в таблице нет и быть не может.
 */
const RUNTIME_IMPORTS: Readonly<Record<string, readonly string[]>> = {
	'protected/naming': [],
	'protected/registry': [],
	'protected/define': [],
	'protected/adapter': ['protected/registry', 'protected/naming', 'protected/define'],
	protected: ['protected/define', 'protected/naming', 'protected/registry', 'protected/adapter'],
	'content/descriptors': ['protected/define'],
	'content/extensions': ['protected/adapter', 'protected/registry', 'protected/define'],
	'content/icons': [],
	content: ['content/descriptors', 'content/extensions', 'content/icons'],
	[ENTRY]: ['protected', 'content'],
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

/** Папки верхнего уровня пакета: должны быть только слоями. */
function topLevelFolders(): string[] {
	return readdirSync(SETUP, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && !SKIPPED.has(entry.name))
		.filter((entry) => !entry.name.startsWith('.'))
		.map((entry) => entry.name)
}

/** Модули пакета: сами слои, их папки и `.ts`-файлы верхнего уровня. */
function packageModules(): string[] {
	const modules: string[] = []

	for (const entry of readdirSync(SETUP, { withFileTypes: true })) {
		if (SKIPPED.has(entry.name) || entry.name.startsWith('.')) continue

		if (!entry.isDirectory()) {
			if (entry.name.endsWith('.ts')) modules.push(entry.name)
			continue
		}

		modules.push(entry.name)

		for (const inner of readdirSync(join(SETUP, entry.name), { withFileTypes: true })) {
			if (inner.name.startsWith('.') || inner.name === 'index.ts') continue
			if (inner.isDirectory() || inner.name.endsWith('.ts')) {
				modules.push(`${entry.name}/${inner.name}`)
			}
		}
	}

	return modules
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

/**
 * Модуль по пути внутри пакета: папка слоя (`protected/define`), сам слой —
 * его бочка (`protected`), корень пакета — `index.ts`. Путь без расширения —
 * папка, если она есть на диске, иначе `.ts`-файл.
 */
function moduleOfPath(path: string): string {
	if (path === '') return ENTRY

	const segments = path.split('/')
	const layer = LAYERS.includes(segments[0] as (typeof LAYERS)[number])
		? (segments.shift() as string)
		: ''
	const [name, ...rest] = segments

	if (name === undefined || name === 'index' || name === 'index.ts') {
		return layer === '' ? ENTRY : layer
	}

	const folder = join(SETUP, layer, name)
	const isFolder = rest.length > 0 || (existsSync(folder) && statSync(folder).isDirectory())
	const module = isFolder || name.endsWith('.ts') ? name : `${name}.ts`

	return layer === '' ? module : `${layer}/${module}`
}

/** Модуль, которому принадлежит файл пакета. */
function moduleOfFile(file: string): string {
	return moduleOfPath(file)
}

/** Модуль, в который ведёт относительный импорт; вне пакета — `undefined`. */
function moduleOfTarget(file: string, specifier: string): string | undefined {
	const target = packagePath(resolve(SETUP, dirname(file), specifier))

	if (target.startsWith('..')) return undefined

	return moduleOfPath(target)
}

describe('разбор импортов', () => {
	const FILE = 'content/descriptors/components/button.descriptor.ts'
	const SPEC = '../../../protected/define'

	it.each([
		[`import type { A } from '${SPEC}'`, true],
		[`import { type A, type B } from '${SPEC}'`, true],
		[`import { a, type B } from '${SPEC}'`, false],
		[`import * as define from '${SPEC}'`, false],
		[`import '${SPEC}'`, false],
		[`export type { A } from '${SPEC}'`, true],
		[`export { a } from '${SPEC}'`, false],
		[`export * from '${SPEC}'`, false],
		[`const lazy = () => import('${SPEC}')`, false],
	])('%s — только тип: %s', (text, typeOnly) => {
		expect(collectImports(FILE, text)).toEqual([{ file: FILE, specifier: SPEC, typeOnly }])
	})

	it.each([
		[FILE, SPEC, 'protected/define'],
		[FILE, '../../../protected/define/types', 'protected/define'],
		[FILE, './list', 'content/descriptors'],
		['protected/adapter/context/types.ts', '../../define', 'protected/define'],
		[
			'content/extensions/tabs/index.ts',
			'../../../protected/adapter/elevator',
			'protected/adapter',
		],
		['protected/define/component.ts', '..', 'protected'],
		['protected/define/component.ts', '../index', 'protected'],
		['protected/define/component.ts', '../..', ENTRY],
		[ENTRY, './protected', 'protected'],
		[ENTRY, './content/icons', 'content/icons'],
		['protected/define/component.ts', '../../../core/src', undefined],
	])('%s: %s ведёт в %s', (file, specifier, expected) => {
		expect(moduleOfTarget(file, specifier)).toBe(expected)
	})
})

/** Файлы с рантаймом, которым можно экспортировать типы: типы выведены из их значений. */
const RUNTIME_WITH_TYPES = new Set(['content/icons/roles.ts'])

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
		[
			'define/index.ts',
			"export * from '../protected/naming'\nexport type { T } from './types'\n",
			[],
		],
		[
			'define/index.ts',
			"export * from './types'\n",
			["define/index.ts: export * из файла './types' — нужен список имён"],
		],
		[
			'content/descriptors/components/button.descriptor.ts',
			`${header}export type T = 1\nexport const a: T = 1\n`,
			[
				'content/descriptors/components/button.descriptor.ts: файл с рантаймом экспортирует типы',
			],
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

	it('разбор находит известную рантайм-связь protected/adapter → protected/registry', () => {
		expect(
			crossings.some(
				({ from, to }) => from === 'protected/adapter' && to === 'protected/registry',
			),
		).toBe(true)
	})

	it('на верхнем уровне пакета только слои', () => {
		const stray = topLevelFolders().filter(
			(name) => !LAYERS.includes(name as (typeof LAYERS)[number]),
		)

		expect(
			stray,
			`Папка мимо слоёв: механика — в protected/, наполнение — в content/ (см. AGENTS.md, «Структура packages/setup»):\n${stray.join('\n')}`,
		).toEqual([])
	})

	it('у каждого модуля слоя есть строка в таблице', () => {
		const missing = packageModules().filter((name) => !Object.hasOwn(RUNTIME_IMPORTS, name))

		expect(
			missing,
			`Модуль без строки в таблице импортов (см. AGENTS.md, «Структура packages/setup»):\n${missing.join('\n')}`,
		).toEqual([])
	})

	/**
	 * Наполнение знает механику, механика о наполнении не знает вовсе — иначе
	 * защищённый слой пришлось бы править ради каждого нового компонента, и
	 * граница держалась бы только на договорённости.
	 */
	it('защищённый слой не импортирует наполнение — ни в рантайме, ни типом', () => {
		const violations = imports
			.filter(({ file, specifier }) => {
				if (!file.startsWith('protected/') || !specifier.startsWith('.')) return false

				return moduleOfTarget(file, specifier)?.startsWith('content') === true
			})
			.map(({ file, specifier }) => `${file}: '${specifier}'`)

		expect(
			violations,
			`protected/ знает о content/ (см. AGENTS.md, «Структура packages/setup»):\n${violations.join('\n')}`,
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
	 * Ядро обмена (`protected/adapter/exchange`) — ячейки, линии и порты — знает
	 * только описание свойства и поверхность. Узнай оно о наборе плагинов,
	 * реестрах или контексте, правила записи снова расползлись бы по сборке:
	 * именно эта граница держит «одно правило — одно место». Наполнение ему
	 * недоступно и так — его не пускает граница слоёв.
	 */
	it('ядро обмена не импортирует сборку, реестры и плагины', () => {
		const FORBIDDEN = ['../context', '../elevator', '../../registry']

		const violations = imports
			.filter(({ file }) => file.startsWith('protected/adapter/exchange/'))
			.filter(
				({ specifier }) =>
					specifier === '@soldy-ui/plugins' ||
					FORBIDDEN.some(
						(prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`),
					),
			)
			.map(({ file, specifier }) => `${file}: '${specifier}'`)

		expect(violations, `Ядро обмена знает лишнее:\n${violations.join('\n')}`).toEqual([])
	})

	it('код пакета не импортирует @soldy-ui/setup', () => {
		const violations = imports
			.filter(
				({ specifier }) =>
					specifier === '@soldy-ui/setup' || specifier.startsWith('@soldy-ui/setup/'),
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
