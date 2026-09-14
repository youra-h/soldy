import { describe, it, expect } from 'vitest'
import { TSESLint } from '@typescript-eslint/utils'
import tsParser from '@typescript-eslint/parser'
import plugin from '../plugin'

const linter = new TSESLint.Linter({ configType: 'flat' })

/** Сообщения правила `soldy/no-explicit-any` для фрагмента кода. */
function lint(code: string) {
	return linter.verify(
		code,
		[
			{
				files: ['**/*.ts'],
				languageOptions: { parser: tsParser },
				plugins: { soldy: plugin },
				rules: { 'soldy/no-explicit-any': 'error' },
			},
		],
		'fixture.ts',
	)
}

describe('soldy/no-explicit-any', () => {
	describe('пропускает any, который стирает инвариантность', () => {
		it.each([
			['констрейнт карты событий', 'type A<T extends Record<string, (...args: any) => any>> = T'],
			['дефолт параметра типа', 'class C<TItem extends object = any> {}'],
			['extends условного типа', 'type X<T> = T extends TComponent<any, any, infer S> ? S : never'],
			['extends условного типа с типом библиотеки', 'type X<T> = T extends Array<any> ? T : never'],
			['rest конструкторного типа', 'type Ctor<T> = new (...args: any[]) => T'],
			['rest абстрактного конструкторного типа', 'type Ctor<T> = abstract new (...args: any[]) => T'],
			['this статической фабрики', 'declare function create<T>(this: new (...args: any[]) => T): T'],
			['аргумент дженерика проекта в типе', 'let engine: TCollectionEngine<object, any>'],
			['аргумент дженерика проекта в new', 'const engine = new TCollectionEngine<object, any>({})'],
			['аргумент дженерика проекта в extends интерфейса', 'interface I extends IItemExtension<object, any> {}'],
			['аргумент дженерика проекта в extends/implements класса', 'class K extends TBase<any> implements IThing<any> {}'],
			['квалифицированное имя дженерика проекта', 'let events: core.TEvented<any>'],
			['дженерик проекта внутри Partial', 'class D { static defaults: Partial<IInputControlProps<any>> = {} }'],
			['универсальная функция', 'type TEvents = Record<string, (...args: any) => any>'],
			['универсальная функция с any[]', 'type F = (...args: any[]) => any'],
		])('%s', (_title, code) => {
			expect(lint(code)).toEqual([])
		})
	})

	describe('ловит any, который прячет тип', () => {
		it.each([
			['переменная', 'let x: any', 1],
			['параметр функции', 'function f(value: any) {}', 1],
			['Record<string, any>', 'type R = Record<string, any>', 1],
			['Partial<any>', 'type P = Partial<any>', 1],
			['Array<any>', 'let list: Array<any>', 1],
			['Map<string, any>', 'let map: Map<string, any>', 1],
			['Iterable<any>: I без заглавной — не имя проекта', 'type Q = Iterable<any>', 1],
			['rest функции, которая возвращает не any', 'let hook: (...args: any[]) => void', 1],
			['возврат функции с конкретными параметрами', 'let trackBy: (item: object) => any', 1],
			['лишний параметр рядом с rest', 'let fn: (first: any, ...args: any[]) => any', 3],
			['ложная ветка условного типа', 'type X<T> = T extends object ? T : any', 1],
			['не-rest параметр конструкторного типа', 'type Ctor<T> = new (source: any) => T', 1],
			['возвращаемый тип геттера', 'class C { get context(): any { return 1 } }', 1],
			['приведение', 'const value = 1 as any', 1],
		])('%s', (_title, code, count) => {
			const messages = lint(code)

			expect(messages).toHaveLength(count)
			expect(messages.every((m) => m.ruleId === 'soldy/no-explicit-any')).toBe(true)
		})
	})
})
