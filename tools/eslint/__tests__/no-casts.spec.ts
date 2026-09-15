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

async function ruleIds(code: string, filePath: string): Promise<string[]> {
	const [result] = await eslint.lintText(code, { filePath })

	return result.messages.map((message) => message.ruleId ?? 'fatal')
}

describe('eslint.config.ts: приведения в src ядра', () => {
	it.each([
		['as unknown as', CAST, 'no-restricted-syntax'],
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
		expect(await ruleIds(CAST, TESTS)).toContain('no-restricted-syntax')
	})
})

describe('eslint.config.ts: приведения вне ядра', () => {
	it.each([
		'packages/setup/contributions/__fixture__.ts',
		'packages/accessor/contract/__fixture__.ts',
		'packages/ui/vue/src/adapter/runtime/__fixture__.ts',
		'packages/ui/angular/src/components/__fixture__/__fixture__.component.ts',
	])('%s — ошибка', async (filePath) => {
		expect(await ruleIds(CAST, filePath)).toContain('no-restricted-syntax')
	})

	it('<script lang="ts"> в .vue под packages/ui/vue/src — ошибка', async () => {
		const code =
			'<script setup lang="ts">\nconst value: object = {}\nconst text = value as unknown as string\n</script>\n\n<template>{{ text }}</template>\n'

		expect(
			await ruleIds(code, 'packages/ui/vue/src/components/__fixture__/Fixture.vue'),
		).toContain('no-restricted-syntax')
	})

	// Временно, до 869f2grdv: кейс уходит вместе с исключением в eslint.config.ts
	it('packages/plugins пропускается', async () => {
		expect(await ruleIds(CAST, 'packages/plugins/src/__fixture__.ts')).toEqual([])
	})
})
