import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import * as ts from 'typescript'

/**
 * Сторож правила «никаких костылей» для `packages/core/src` (см. AGENTS.md,
 * «Никаких костылей»; задача 869f1nvw6).
 *
 * `as any`, `as unknown as X`, `as never`, `as TEvented<…>`, угловое
 * приведение (`<T>x`) и директивы отключения проверки типов (ts-ignore,
 * ts-nocheck) в исходниках ядра прячут несовпавший контракт вместо того,
 * чтобы его починить. Основной вид,
 * который это выявило — `(this.events as TEvented<TXxxEvents>).emit(...)` —
 * снят: собственные события класс с дженериком `TEvents` шлёт через
 * `TEventSink<TOwn>` (`common/event/types.ts`), а у классов с конкретной
 * картой событий приведение было лишним и просто удалено.
 *
 * В отличие от сторожа тестов (`tests-no-casts.spec.ts`), здесь ловится
 * только `as any` — приведение, а не сам тип `any`. Голый `any` в констрейнте
 * дженерика (`TItemExt extends IItemExtension<TItem, any>`,
 * `Record<string, (...args: any) => any>`) — задокументированный приём этого
 * кода (см. AGENTS.md, «События item-адаптера: `any` в констрейнте, точный
 * набор в инстанцировании»), а не костыль: он выражает инвариантность карты
 * событий/элементов расширений и точку намеренно не проверяется. Угловое
 * приведение `<T>x` (`ts.isTypeAssertionExpression`) ловится целиком, любым
 * `T` — это второй синтаксис приведения. Директивы ts-ignore/ts-nocheck не
 * бывают узлом AST (это комментарии), поэтому их ищем в сыром тексте файла.
 *
 * Allow-список — 8 поштучных строк, у каждой в комментарии — задача на
 * снятие (см. AGENTS.md, «Временное исключение без срока»):
 * - 869f1qfv6 (4) — `_context?.adapters as unknown as TXxxAdapters` в фасадах
 *   item-адаптеров коллекций: тип контекста неполон.
 * - 869f1qfy5 (4) — конкретный item-адаптер приводится к генерику
 *   `IItemExtensionCtor` в конструкторах расширений коллекций.
 *
 * Новых строк в списке быть не должно.
 */

const ROOT = resolve(__dirname, '../../..')
const SRC_DIR = resolve(__dirname, '../src')

// Собраны конкатенацией, а не литералом: иначе этот файл сам ловится
// текстовым сторожем `tests-no-casts.spec.ts`, который сканирует все файлы
// `packages/core/__tests__`, кроме себя самого.
const AT = '@'
const TS_IGNORE = new RegExp(`${AT}ts-ignore\\b`)
const TS_NOCHECK = new RegExp(`${AT}ts-nocheck\\b`)

/** `relativeFile:line` — временные, задокументированные исключения. */
const ALLOW_LIST = new Set<string>([
	// 869f1qfv6 — фасады item-адаптеров коллекций: тип `_context.adapters`
	// неполон, приведение к конкретной карте адаптеров остаётся до задачи.
	'packages/core/src/components/base/collection/facade/order/item/order-item.facade.ts:48',
	'packages/core/src/components/base/collection/facade/selection/item/selection-item.facade.ts:46',
	'packages/core/src/components/custom/list-box/item/facade/facade.class.ts:44',
	'packages/core/src/components/custom/tags/item/facade/facade.class.ts:36',

	// 869f1qfy5 — конкретный item-адаптер приводится к генерику
	// IItemExtensionCtor в конструкторе расширения коллекции.
	'packages/core/src/components/custom/accordion/collection/extensions/content/content.extension.ts:37',
	'packages/core/src/components/custom/select/collection/extensions/select/select.extension.ts:59',
	'packages/core/src/components/custom/tabs/collection/extensions/content/content.extension.ts:39',
	'packages/core/src/components/custom/list-box/collection/extensions/list-box/list-box.extension.ts:49',
])

function collectSourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = join(dir, name)

		if (statSync(full).isDirectory()) {
			return collectSourceFiles(full)
		}

		return /\.ts$/.test(name) ? [full] : []
	})
}

function toRelative(file: string): string {
	return relative(ROOT, file).split('\\').join('/')
}

type TViolation = { file: string; line: number; text: string }

/** `as any` / `as never` / `as unknown as X` / `as TEvented<…>` / `<T>x` — по дереву, не по тексту. */
function findCastViolations(file: string): TViolation[] {
	const sourceText = readFileSync(file, 'utf-8')
	const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true)
	const violations: TViolation[] = []

	const lineOf = (node: ts.Node): number =>
		source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1

	const visit = (node: ts.Node): void => {
		if (ts.isAsExpression(node) && node.type.kind === ts.SyntaxKind.AnyKeyword) {
			violations.push({ file, line: lineOf(node), text: 'as any' })
		} else if (ts.isAsExpression(node) && node.type.kind === ts.SyntaxKind.NeverKeyword) {
			violations.push({ file, line: lineOf(node), text: 'as never' })
		} else if (
			ts.isAsExpression(node) &&
			ts.isAsExpression(node.expression) &&
			node.expression.type.kind === ts.SyntaxKind.UnknownKeyword
		) {
			violations.push({ file, line: lineOf(node), text: 'as unknown as …' })
		} else if (
			ts.isAsExpression(node) &&
			ts.isTypeReferenceNode(node.type) &&
			ts.isIdentifier(node.type.typeName) &&
			node.type.typeName.text === 'TEvented'
		) {
			violations.push({ file, line: lineOf(node), text: 'as TEvented<…>' })
		} else if (ts.isTypeAssertionExpression(node)) {
			violations.push({ file, line: lineOf(node), text: 'угловое приведение <T>x' })
		}

		ts.forEachChild(node, visit)
	}

	visit(source)

	return violations
}

/** Директивы ts-ignore/ts-nocheck — комментарии, узлом AST не бывают, ищем в сыром тексте. */
function findDirectiveViolations(file: string): TViolation[] {
	const lines = readFileSync(file, 'utf-8').split('\n')

	return lines.flatMap((text, index) => {
		const line = index + 1

		if (TS_IGNORE.test(text)) return [{ file, line, text: `${AT}ts-ignore` }]
		if (TS_NOCHECK.test(text)) return [{ file, line, text: `${AT}ts-nocheck` }]

		return []
	})
}

describe('исходники ядра без приведений типов', () => {
	it('в packages/core/src нет as any / as never / as unknown as / as TEvented<…> / <T>x / директив ts-ignore, ts-nocheck, кроме allow-списка', () => {
		const files = collectSourceFiles(SRC_DIR)

		expect(files.length, 'не найдено ни одного файла в packages/core/src').toBeGreaterThan(0)

		const violations = files
			.flatMap((file) => [...findCastViolations(file), ...findDirectiveViolations(file)])
			.map((v) => ({ ...v, key: `${toRelative(v.file)}:${v.line}` }))
			.filter((v) => !ALLOW_LIST.has(v.key))

		expect(
			violations,
			`Приведение типа в исходнике ядра (см. AGENTS.md, "Никаких костылей"):\n${violations
				.map((v) => `${v.key} — ${v.text}`)
				.join('\n')}`,
		).toEqual([])
	})

	it('allow-список не содержит лишних записей', () => {
		const files = collectSourceFiles(SRC_DIR)

		const found = new Set(
			files
				.flatMap((file) => [...findCastViolations(file), ...findDirectiveViolations(file)])
				.map((v) => `${toRelative(v.file)}:${v.line}`),
		)

		const stale = [...ALLOW_LIST].filter((key) => !found.has(key))

		expect(
			stale,
			`Запись allow-списка без соответствующего приведения:\n${stale.join('\n')}`,
		).toEqual([])
	})
})
