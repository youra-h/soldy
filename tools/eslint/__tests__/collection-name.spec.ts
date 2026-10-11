import { describe, it, expect } from 'vitest'
import { ESLint } from 'eslint'
import { resolve } from 'node:path'

/**
 * Правило «Переменная — `engine`, а не `collection`» (AGENTS.md) держит блок
 * `soldy/no-collection-name` в `eslint.config.ts` — встроенный `id-denylist`.
 * Тест линтит фрагменты настоящим конфигом репозитория по путям пакетов:
 * опечатка в `files` или лишний путь в `ignores` отключили бы защиту молча, и
 * CI остался бы зелёным. Позиции проверяются по строке: фрагмент, где имя
 * стоит в нескольких местах, иначе прошёл бы и без проверяемого.
 */

const eslint = new ESLint({ cwd: resolve(__dirname, '../../..') })

const SRC = 'packages/core/src/__fixture__.ts'

const DECLARED = 'export const collection = 1'

const PACKAGES = [
	'packages/core/__tests__/__fixture__.spec.ts',
	'packages/setup/__tests__/__fixture__.spec.ts',
	'packages/setup/content/extensions/__fixture__.ts',
	'packages/plugins/src/__fixture__.ts',
	'packages/plugins/__tests__/__fixture__.spec.ts',
	'packages/ui/react/src/components/__fixture__/setup.component.ts',
]

async function ruleIds(code: string, filePath: string): Promise<string[]> {
	const [result] = await eslint.lintText(code, { filePath })

	return result.messages.map((message) => message.ruleId ?? 'fatal')
}

/** Строки, на которых сторож нашёл запрещённое имя. */
async function deniedLines(code: string, filePath: string): Promise<number[]> {
	const [result] = await eslint.lintText(code, { filePath })

	return result.messages
		.filter((message) => message.ruleId === 'id-denylist')
		.map((message) => message.line)
}

describe('eslint.config.ts: имя collection в src ядра', () => {
	it.each([
		['объявление переменной', DECLARED, 1],
		['функция', 'export function collection(): number {\n\treturn 0\n}', 1],
		[
			'параметр',
			'export function size(collection: string[]): number {\n\treturn collection.length\n}',
			1,
		],
		['поле', 'export class TSample {\n\tprotected _collection = 0\n}', 2],
		[
			'приватное поле',
			'export class TSample {\n\t#collection = 0\n\n\tget size(): number {\n\t\treturn this.#collection\n\t}\n}',
			2,
		],
		['ключ объекта', 'export const props = { collection: 1 }', 1],
		[
			'сокращённый ключ объекта',
			'export function kit(engine: object) {\n\tconst collection = engine\n\n\treturn { collection }\n}',
			4,
		],
		['член типа', 'export interface IKit {\n\tcollection: object\n}', 2],
		[
			'запись свойства',
			'export function bind(target: Record<string, object>) {\n\ttarget.collection = {}\n}',
			2,
		],
	])('%s — ошибка', async (_title, code, line) => {
		expect(await deniedLines(code, SRC)).toContain(line)
	})

	it.each([
		['слово — часть имени', 'export const collectionAdapter = 1'],
		[
			'класс и тип ядра',
			"import type { TCollectionEngine } from '@soldy-ui/core'\n\nexport type TEngine = TCollectionEngine<object>",
		],
		['путь импорта', "export { createEngineTabs } from './collection'"],
		['строка', "export const name = 'collection'"],
		[
			'чтение чужого свойства',
			'declare const external: Record<string, object>\n\nexport const read = external.collection',
		],
	])('%s — допустимо', async (_title, code) => {
		expect(await ruleIds(code, SRC)).toEqual([])
	})
})

describe('eslint.config.ts: имя collection вне src ядра', () => {
	it.each(PACKAGES)('%s — ошибка', async (filePath) => {
		expect(await ruleIds(DECLARED, filePath)).toContain('id-denylist')
	})

	it('<script lang="ts"> в .vue под packages/ui/vue/src — ошибка', async () => {
		const code =
			'<script setup lang="ts">\nconst collection = 1\n</script>\n\n<template>{{ collection }}</template>\n'

		expect(
			await ruleIds(code, 'packages/ui/vue/src/components/__fixture__/Fixture.vue'),
		).toContain('id-denylist')
	})

	it('<script lang="ts"> в .svelte под packages/ui/svelte/src — ошибка', async () => {
		const code = '<script lang="ts">\nconst collection = 1\n</script>\n\n<p>{collection}</p>\n'

		expect(
			await ruleIds(code, 'packages/ui/svelte/src/components/__fixture__/Fixture.svelte'),
		).toContain('id-denylist')
	})
})
