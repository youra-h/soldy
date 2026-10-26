import { describe, it, expect } from 'vitest'
import { findModuleEffects, keepsForEffect } from '../side-effects'

/**
 * The rule of `side-effects.ts` on fixtures: which top-level statements are
 * effects and how a `sideEffects` pattern matches a file. The workspace as a
 * whole is checked by `workspace.spec.ts` next to it.
 */

/** Statements reported for a module, as written. */
function effects(path: string, text: string): string[] {
	return findModuleEffects(path, text).map(({ text: statement }) => statement)
}

describe('эффект модуля — то, что исполняется на верхнем уровне', () => {
	it.each([
		['вызов', "defineElement('so-button', TButtonElement)"],
		['присваивание', 'window.soldy = registry'],
		['правка своего объекта', "Object.defineProperty(components, 'Submenu', { get })"],
		['импорт без имён', "import '@ungap/custom-elements'"],
		['ветка', 'if (typeof window !== "undefined") start()'],
		['статический блок класса', 'export class TRegistry { static { register(this) } }'],
	])('%s — эффект', (_title, statement) => {
		expect(effects('module.ts', statement)).toHaveLength(1)
	})

	it.each([
		['объявление со значением', 'export const ButtonDescriptor = defineDescriptor(() => ({}))'],
		['класс', 'export class TButton extends TControl { static defaultValues = {} }'],
		['функция', 'export function roleIcon(role: string) { return role }'],
		['импорт с именами', "import { TButton } from '@soldy-ui/core'"],
		['импорт типа', "import type { IButton } from '@soldy-ui/core'"],
		['реэкспорт', "export * from './components'"],
		['экспорт по умолчанию', 'export default defineTheme({ name: "oren" })'],
		['директива', "'use client'\nexport const x = 1"],
	])('%s — не эффект', (_title, statement) => {
		expect(effects('module.ts', statement)).toEqual([])
	})

	it('строка эффекта — в файле, как он написан', () => {
		const text = "import { a } from './a'\n\nstart(a)\n"

		expect(findModuleEffects('module.ts', text)).toEqual([{ line: 3, text: 'start(a)' }])
	})
})

describe('модуль компонента — код, который исполняется при импорте', () => {
	it('Vue: блок <script> — модуль, <script setup> — экземпляр', () => {
		const text = [
			'<script lang="ts">',
			'register()',
			'export default {}',
			'</script>',
			'<script setup lang="ts">',
			'useSomething()',
			'</script>',
			'<template><div /></template>',
		].join('\n')

		expect(findModuleEffects('Button.vue', text)).toEqual([{ line: 2, text: 'register()' }])
	})

	it('Svelte: <script module> — модуль, из скрипта экземпляра — только импорты', () => {
		const text = [
			'<script lang="ts" module>',
			'register()',
			'</script>',
			'<script lang="ts">',
			"import './effect'",
			"import { setup } from './setup'",
			'const binding = setup()',
			'</script>',
			'<div></div>',
		].join('\n')

		expect(effects('Button.svelte', text)).toEqual(['register()', "import './effect'"])
	})

	it('Svelte: значение атрибута с ">" не обрывает тег', () => {
		const text =
			'<script lang="ts" generics="T extends Record<string, unknown>">\nconst a = 1\n</script>'

		expect(effects('List.svelte', text)).toEqual([])
	})
})

describe('шаблон sideEffects — как его читает webpack', () => {
	it.each([
		['*.css', 'dist/index.css', true],
		['*.css', 'src/index.css', true],
		['*.css', 'index.css', true],
		['*.css', 'dist/index.js', false],
		['./dist/*.css', 'dist/index.css', true],
		['./dist/*.css', 'dist/nested/index.css', false],
		['dist/**/*.css', 'dist/nested/index.css', true],
		['dist/**/*.css', 'dist/index.css', true],
		['./src/index.css', './src/index.css', true],
	])('%s и %s: %s', (pattern, path, kept) => {
		expect(keepsForEffect([pattern], path)).toBe(kept)
	})

	it('false — не оставляет ничего, true — всё', () => {
		expect(keepsForEffect(false, 'dist/index.css')).toBe(false)
		expect(keepsForEffect(true, 'dist/index.js')).toBe(true)
	})

	it('без поля — всё: так читают пакет без объявления', () => {
		expect(keepsForEffect(undefined, 'dist/index.js')).toBe(true)
	})
})
