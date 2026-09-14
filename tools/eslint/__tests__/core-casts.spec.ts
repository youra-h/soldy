import { describe, it, expect } from 'vitest'
import { ESLint } from 'eslint'
import { resolve } from 'node:path'

/**
 * Защита ядра от приведений живёт не в отдельном правиле, а в блоках
 * `eslint.config.ts` (`soldy/core-no-casts`, `soldy/core-tests-no-any`). Тест
 * линтит фрагменты настоящим конфигом репозитория по путям ядра: опечатка в
 * `files` иначе отключила бы защиту молча, и CI остался бы зелёным.
 */

const eslint = new ESLint({ cwd: resolve(__dirname, '../../..') })

const SRC = 'packages/core/src/__fixture__.ts'
const TESTS = 'packages/core/__tests__/__fixture__.spec.ts'
const OUTSIDE = 'packages/ui/vue/src/__fixture__.ts'

async function ruleIds(code: string, filePath: string): Promise<string[]> {
	const [result] = await eslint.lintText(code, { filePath })

	return result.messages.map((message) => message.ruleId ?? 'fatal')
}

describe('eslint.config.ts: приведения в src ядра', () => {
	it.each([
		['as unknown as', 'declare const value: object\nexport const x = value as unknown as string', 'no-restricted-syntax'],
		['as never', 'declare const value: object\nexport const x = value as never', 'no-restricted-syntax'],
		['as TEvented<…>', "import type { TEvented } from '@soldy/core'\ndeclare const value: object\nexport const x = value as TEvented<object>", 'no-restricted-syntax'],
		['угловое приведение', 'declare const value: unknown\nexport const x = <string>value', '@typescript-eslint/consistent-type-assertions'],
		['@ts-ignore', '// @ts-ignore\nexport const x: number = 1', '@typescript-eslint/ban-ts-comment'],
		['@ts-nocheck', '// @ts-nocheck\nexport const x = 1', '@typescript-eslint/ban-ts-comment'],
		['as any', 'declare const value: unknown\nexport const x = value as any', 'soldy/no-explicit-any'],
	])('%s — ошибка', async (_title, code, ruleId) => {
		expect(await ruleIds(code, SRC)).toContain(ruleId)
	})

	it.each([
		['as X', 'declare const value: unknown\nexport const x = value as string'],
		['as const', "export const x = ['a', 'b'] as const"],
		['@ts-expect-error с пояснением', "// @ts-expect-error — строка в числе проверяет тип\nexport const x: number = 'a'"],
		['any в констрейнте', 'export type TMap<T extends Record<string, (...args: any) => any>> = T'],
	])('%s — допустимо', async (_title, code) => {
		expect(await ruleIds(code, SRC)).toEqual([])
	})
})

describe('eslint.config.ts: тесты ядра', () => {
	it('any запрещён в любой позиции, включая констрейнт', async () => {
		const ids = await ruleIds('export type TMap<T extends Record<string, any>> = T', TESTS)

		expect(ids).toContain('@typescript-eslint/no-explicit-any')
		expect(ids).not.toContain('soldy/no-explicit-any')
	})

	it('as unknown as — ошибка', async () => {
		expect(
			await ruleIds('declare const value: object\nexport const x = value as unknown as string', TESTS),
		).toContain('no-restricted-syntax')
	})
})

describe('eslint.config.ts: вне ядра', () => {
	it('блок приведений ядра на другие пакеты не распространяется', async () => {
		expect(
			await ruleIds('declare const value: object\nexport const x = value as unknown as string', OUTSIDE),
		).not.toContain('no-restricted-syntax')
	})
})
