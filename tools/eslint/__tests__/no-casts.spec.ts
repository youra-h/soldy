import { describe, it, expect } from 'vitest'
import { ESLint } from 'eslint'
import { resolve } from 'node:path'

/**
 * Запрет приведений живёт не в отдельном правиле, а в блоках `eslint.config.ts`
 * (`soldy/no-casts` — весь репозиторий, `soldy/core-tests-no-any` — тесты
 * ядра). Тест линтит фрагменты настоящим конфигом репозитория по путям
 * пакетов: опечатка в `files` или лишний путь в `ignores` иначе отключили бы
 * защиту молча, и CI остался бы зелёным.
 */

const eslint = new ESLint({ cwd: resolve(__dirname, '../../..') })

const SRC = 'packages/core/src/__fixture__.ts'
const TESTS = 'packages/core/__tests__/__fixture__.spec.ts'

const CAST = 'declare const value: object\nexport const x = value as unknown as string'

const NON_NULL = 'declare const value: string | undefined\nexport const x = value!'

const OUTSIDE_CORE = [
	'packages/setup/content/descriptors/__fixture__.ts',
	'packages/ui/vue/src/adapter/runtime/__fixture__.ts',
	'packages/ui/angular/src/components/__fixture__/__fixture__.component.ts',
	'packages/ui/react/src/components/__fixture__/Fixture.tsx',
	'packages/ui/solid/src/components/__fixture__/Fixture.tsx',
	'packages/ui/svelte/src/adapter/runtime/__fixture__.ts',
	'packages/ui/webc/src/components/__fixture__/setup.component.ts',
	'packages/plugins/src/__fixture__.ts',
]

async function ruleIds(code: string, filePath: string): Promise<string[]> {
	const [result] = await eslint.lintText(code, { filePath })

	return result.messages.map((message) => message.ruleId ?? 'fatal')
}

describe('eslint.config.ts: приведения в src ядра', () => {
	it.each([
		['as unknown as', CAST, 'no-restricted-syntax'],
		[
			'as never',
			'declare const value: object\nexport const x = value as never',
			'no-restricted-syntax',
		],
		[
			'as TEvented<…>',
			"import type { TEvented } from '@soldy/core'\ndeclare const value: object\nexport const x = value as TEvented<object>",
			'no-restricted-syntax',
		],
		[
			'угловое приведение',
			'declare const value: unknown\nexport const x = <string>value',
			'@typescript-eslint/consistent-type-assertions',
		],
		[
			'@ts-ignore',
			'// @ts-ignore\nexport const x: number = 1',
			'@typescript-eslint/ban-ts-comment',
		],
		['@ts-nocheck', '// @ts-nocheck\nexport const x = 1', '@typescript-eslint/ban-ts-comment'],
		[
			'as any',
			'declare const value: unknown\nexport const x = value as any',
			'soldy/no-explicit-any',
		],
		['non-null assertion `x!`', NON_NULL, '@typescript-eslint/no-non-null-assertion'],
	])('%s — ошибка', async (_title, code, ruleId) => {
		expect(await ruleIds(code, SRC)).toContain(ruleId)
	})

	it.each([
		['as X', 'declare const value: unknown\nexport const x = value as string'],
		['as const', "export const x = ['a', 'b'] as const"],
		[
			'@ts-expect-error с пояснением',
			"// @ts-expect-error — строка в числе проверяет тип\nexport const x: number = 'a'",
		],
		[
			'any в констрейнте',
			'export type TMap<T extends Record<string, (...args: any) => any>> = T',
		],
		['definite assignment у поля', 'export class TSample {\n\tprivate _a!: string\n}'],
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
		expect(await ruleIds(CAST, TESTS)).toContain('no-restricted-syntax')
	})

	it('`x!` — ошибка', async () => {
		expect(await ruleIds(NON_NULL, TESTS)).toContain('@typescript-eslint/no-non-null-assertion')
	})
})

describe('eslint.config.ts: приведения вне ядра', () => {
	it.each(OUTSIDE_CORE)('%s — ошибка', async (filePath) => {
		expect(await ruleIds(CAST, filePath)).toContain('no-restricted-syntax')
	})

	it.each(OUTSIDE_CORE)('%s: `x!` — ошибка', async (filePath) => {
		expect(await ruleIds(NON_NULL, filePath)).toContain(
			'@typescript-eslint/no-non-null-assertion',
		)
	})

	it('<script lang="ts"> в .vue под packages/ui/vue/src — ошибка', async () => {
		const code =
			'<script setup lang="ts">\nconst value: object = {}\nconst text = value as unknown as string\n</script>\n\n<template>{{ text }}</template>\n'

		expect(
			await ruleIds(code, 'packages/ui/vue/src/components/__fixture__/Fixture.vue'),
		).toContain('no-restricted-syntax')
	})

	it.each([
		['as unknown as', 'const text = value as unknown as string', 'no-restricted-syntax'],
		['as any', 'const text = value as any', 'soldy/no-explicit-any'],
	])(
		'<script lang="ts"> в .svelte под packages/ui/svelte/src: %s — ошибка',
		async (_title, cast, ruleId) => {
			const code = `<script lang="ts">
const value: object = {}
${cast}
</script>

<p>{text}</p>
`

			expect(
				await ruleIds(code, 'packages/ui/svelte/src/components/__fixture__/Fixture.svelte'),
			).toContain(ruleId)
		},
	)
})
