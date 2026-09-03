/**
 * Тип-трансформер, зеркалящий стратегию именования из naming.ts (ReactNaming).
 *
 * TypeScript не умеет применять рантайм-функции на уровне типов, поэтому логика
 * toPascalCase() / ReactNaming.event из naming.ts продублирована здесь как
 * условные типы. Оба определения должны изменяться СИНХРОННО.
 *
 * Благодаря этому событийные пропсы React-компонентов выводятся автоматически
 * из core-типов, без ручного дублирования:
 *
 *   ReactEventProps<TComponentEvents>
 *     → { onShow?, onChangeVisible?, onChangePresent?, ... }
 */

/** Split<'show:before', '-' | ':'> → ['show', 'before'] */
type Split<S extends string, D extends string> = S extends `${infer T}${D}${infer U}`
	? [T, ...Split<U, D>]
	: [S]

/** Join<['Show', 'Before'], ''> → 'ShowBefore' */
type Join<P extends string[], Sep extends string> = P extends [
	infer F extends string,
	...infer R extends string[],
]
	? R extends []
		? F
		: `${F}${Sep}${Join<R, Sep>}`
	: ''

/** CapitalizeAll<['show', 'before']> → ['Show', 'Before'] */
type CapitalizeAll<T extends string[]> = T extends [
	infer F extends string,
	...infer R extends string[],
]
	? [Capitalize<F>, ...CapitalizeAll<R>]
	: []

/** ToPascalCase<'show:before'> → 'ShowBefore' (зеркалит toPascalCase из naming.ts) */
type ToPascalCase<S extends string> = Join<CapitalizeAll<Split<S, '-' | ':'>>, ''>

/** ReactEventName<'show:before'> → 'onShowBefore' (зеркалит ReactNaming.event) */
export type ReactEventName<T extends string> = `on${ToPascalCase<T>}`

/** ReactEventProps<TComponentEvents> → { onShow?: ..., onChangeVisible?: ... } */
export type ReactEventProps<T extends Record<string, (...args: any[]) => any>> = {
	[K in keyof T as K extends string ? ReactEventName<K> : never]?: T[K]
}

/** NamespacedEvents<T, 'element'> → { 'element:ready': ..., 'element:removed': ... } */
export type NamespacedEvents<
	T extends Record<string, (...args: any[]) => any>,
	N extends string,
> = {
	[K in keyof T as K extends string ? `${N}:${K}` : never]: T[K]
}

/** MergeEvents<[A, B]> → A & B (объединение нескольких событийных интерфейсов) */
export type MergeEvents<T extends readonly Record<string, (...args: any[]) => any>[]> = T extends [
	infer F,
	...infer R,
]
	? F extends Record<string, (...args: any[]) => any>
		? R extends Record<string, (...args: any[]) => any>[]
			? R extends []
				? F
				: F & MergeEvents<R>
			: F
		: Record<string, never>
	: Record<string, never>

