import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative, basename } from 'node:path'
import * as ts from 'typescript'

/**
 * Сторож правила «никаких костылей» для `packages/core/__tests__` (см.
 * AGENTS.md, «Никаких костылей»; задача 869f1n7c9).
 *
 * `as any`, `as unknown as X`, `as never` и `@ts-ignore` в тестах ядра прячут
 * несовпавший контракт вместо того, чтобы его починить. Честная отрицательная
 * проверка типов — `@ts-expect-error` с пояснением — не запрещена: если
 * ошибка, которую она ждёт, пропадёт, `tsc` сам уронит тест.
 *
 * Приведения ищутся деревом AST (`ts.isAsExpression`), а не текстом: имя
 * `as never` в JSDoc или в строке сообщения об ошибке — не код и сторожа не
 * касается. `@ts-ignore` не бывает узлом AST (это комментарий), поэтому его
 * ищем в сыром тексте файла — но не в этом, иначе он ловил бы собственное
 * описание.
 *
 * Allow-список пуст. Новую запись добавляют поштучно, с комментарием
 * «временно, до <задача>» — без срока такое исключение запрещено тем же
 * правилом, которое стережёт этот файл.
 */

const ROOT = resolve(__dirname, '../../..')
const TESTS_DIR = resolve(__dirname, '.')
const SELF = basename(__filename)

const TS_IGNORE = /@ts-ignore\b/

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

/** Приведения `as any` / `as never` / `as unknown as X` — по дереву, не по тексту. */
function findCastViolations(file: string): TViolation[] {
	const sourceText = readFileSync(file, 'utf-8')
	const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true)
	const violations: TViolation[] = []

	const lineOf = (node: ts.Node): number =>
		source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1

	const visit = (node: ts.Node): void => {
		if (ts.isAsExpression(node)) {
			const kind = node.type.kind

			if (kind === ts.SyntaxKind.AnyKeyword) {
				violations.push({ file, line: lineOf(node), text: 'as any' })
			} else if (kind === ts.SyntaxKind.NeverKeyword) {
				violations.push({ file, line: lineOf(node), text: 'as never' })
			} else if (
				ts.isAsExpression(node.expression) &&
				node.expression.type.kind === ts.SyntaxKind.UnknownKeyword
			) {
				violations.push({ file, line: lineOf(node), text: 'as unknown as …' })
			}
		}

		ts.forEachChild(node, visit)
	}

	visit(source)

	return violations
}

/** `@ts-ignore» — директива-комментарий, узлом AST не бывает, ищем в сыром тексте. */
function findTsIgnoreViolations(file: string): TViolation[] {
	const lines = readFileSync(file, 'utf-8').split('\n')

	return lines
		.map((text, index) => ({ text, line: index + 1 }))
		.filter(({ text }) => TS_IGNORE.test(text))
		.map(({ line }) => ({ file, line, text: '@ts-ignore' }))
}

describe('тесты ядра без приведений типов', () => {
	it('в packages/core/__tests__ нет as any / as never / as unknown as / @ts-ignore', () => {
		const files = collectTestFiles(TESTS_DIR)

		expect(files.length, 'не найдено ни одного файла в packages/core/__tests__').toBeGreaterThan(
			0,
		)

		const violations = files
			.flatMap((file) => [...findCastViolations(file), ...findTsIgnoreViolations(file)])
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
