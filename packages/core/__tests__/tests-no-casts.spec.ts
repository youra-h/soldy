import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative, basename } from 'node:path'
import * as ts from 'typescript'

/**
 * Сторож правила «никаких костылей» для `packages/core/__tests__` (см.
 * AGENTS.md, «Никаких костылей»; задача 869f1n7c9).
 *
 * `any` в любом типе, `as unknown as X`, `as never`, угловое приведение
 * (`<T>x`), `@ts-ignore` и `@ts-nocheck` в тестах ядра прячут несовпавший
 * контракт вместо того, чтобы его починить. Честная отрицательная проверка
 * типов — `@ts-expect-error` с пояснением — не запрещена: если ошибка,
 * которую она ждёт, пропадёт, `tsc` сам уронит тест.
 *
 * `any` ищется по дереву AST как `AnyKeyword` в любом узле типа, а не только
 * сразу после `as` — иначе `(e: any)` или `Array<any>` проходят мимо. Тем же
 * приёмом ловится угловое приведение `<T>x` (`ts.isTypeAssertionExpression`)
 * целиком, любым `T`: это второй синтаксис приведения типа, и запрещать одно
 * `as`, пропуская другое, бессмысленно. Имя `any`/`never` в JSDoc или в
 * строке сообщения об ошибке — не код и сторожа не касается, потому что это
 * текстовые и комментарийные узлы, а не типы. `@ts-ignore`/`@ts-nocheck` не
 * бывают узлом AST (это комментарии), поэтому их ищем в сыром тексте файла —
 * но не в этом, иначе они ловили бы собственное описание.
 *
 * Allow-список пуст. Новую запись добавляют поштучно, с комментарием
 * «временно, до <задача>» — без срока такое исключение запрещено тем же
 * правилом, которое стережёт этот файл.
 */

const ROOT = resolve(__dirname, '../../..')
const TESTS_DIR = resolve(__dirname, '.')
const SELF = basename(__filename)

const TS_IGNORE = /@ts-ignore\b/
const TS_NOCHECK = /@ts-nocheck\b/

/** `relativeFile:line` — временные, задокументированные исключения. Сейчас пусто. */
const ALLOW_LIST = new Set<string>([])

function collectTestFiles(dir: string): string[] {
	return readdirSync(dir)
		.filter((name) => /\.ts$/.test(name) && name !== SELF)
		.map((name) => join(dir, name))
		.filter((full) => statSync(full).isFile())
}

function toRelative(file: string): string {
	return relative(ROOT, file).split('\\').join('/')
}

type TViolation = { file: string; line: number; text: string }

/** `any` в любом типе / `as never` / `as unknown as X` / `<T>x` — по дереву, не по тексту. */
function findCastViolations(file: string): TViolation[] {
	const sourceText = readFileSync(file, 'utf-8')
	const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true)
	const violations: TViolation[] = []

	const lineOf = (node: ts.Node): number =>
		source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1

	const visit = (node: ts.Node): void => {
		if (node.kind === ts.SyntaxKind.AnyKeyword) {
			violations.push({ file, line: lineOf(node), text: 'any' })
		} else if (ts.isAsExpression(node) && node.type.kind === ts.SyntaxKind.NeverKeyword) {
			violations.push({ file, line: lineOf(node), text: 'as never' })
		} else if (
			ts.isAsExpression(node) &&
			ts.isAsExpression(node.expression) &&
			node.expression.type.kind === ts.SyntaxKind.UnknownKeyword
		) {
			violations.push({ file, line: lineOf(node), text: 'as unknown as …' })
		} else if (ts.isTypeAssertionExpression(node)) {
			violations.push({ file, line: lineOf(node), text: 'угловое приведение <T>x' })
		}

		ts.forEachChild(node, visit)
	}

	visit(source)

	return violations
}

/** `@ts-ignore`/`@ts-nocheck» — директивы-комментарии, узлом AST не бывают, ищем в сыром тексте. */
function findDirectiveViolations(file: string): TViolation[] {
	const lines = readFileSync(file, 'utf-8').split('\n')

	return lines.flatMap((text, index) => {
		const line = index + 1

		if (TS_IGNORE.test(text)) return [{ file, line, text: '@ts-ignore' }]
		if (TS_NOCHECK.test(text)) return [{ file, line, text: '@ts-nocheck' }]

		return []
	})
}

describe('тесты ядра без приведений типов', () => {
	it('в packages/core/__tests__ нет any / as never / as unknown as / <T>x / @ts-ignore / @ts-nocheck', () => {
		const files = collectTestFiles(TESTS_DIR)

		expect(files.length, 'не найдено ни одного файла в packages/core/__tests__').toBeGreaterThan(
			0,
		)

		const violations = files
			.flatMap((file) => [...findCastViolations(file), ...findDirectiveViolations(file)])
			.map((v) => ({ ...v, key: `${toRelative(v.file)}:${v.line}` }))
			.filter((v) => !ALLOW_LIST.has(v.key))

		expect(
			violations,
			`Приведение типа в тесте ядра (см. AGENTS.md, "Никаких костылей"):\n${violations
				.map((v) => `${v.key} — ${v.text}`)
				.join('\n')}`,
		).toEqual([])
	})
})
