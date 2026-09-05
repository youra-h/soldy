/**
 * Тип-трансформер, зеркалящий стратегию именования из naming.ts (AngularNaming).
 *
 * TypeScript не умеет применять рантайм-функции на уровне типов, поэтому логика
 * toCamelCase() / AngularNaming.event из naming.ts продублирована здесь как
 * условные типы. Оба определения должны изменяться СИНХРОННО.
 *
 * Пример:
 *   AngularOutputName<'element:ready'>   → 'elementReady'
 *   AngularOutputName<'show:before'>     → 'showBefore'
 *   AngularOutputName<'change:visible'>  → 'changeVisible'
 */

/** Split<'show:before', '-' | ':'> → ['show', 'before'] */
type Split<S extends string, D extends string> = S extends `${infer T}${D}${infer U}`
	? [T, ...Split<U, D>]
	: [S]

type Join<P extends string[], Sep extends string> = P extends [
	infer F extends string,
	...infer R extends string[],
]
	? R extends []
		? F
		: `${F}${Sep}${Join<R, Sep>}`
	: ''

type CapitalizeAll<T extends string[]> = T extends [
	infer F extends string,
	...infer R extends string[],
]
	? [Capitalize<F>, ...CapitalizeAll<R>]
	: []

/** Первый сегмент остаётся в lowercase, остальные capitalize — как toCamelCase() */
type CamelCaseFrom1<T extends string[]> = T extends [
	infer F extends string,
	...infer R extends string[],
]
	? [F, ...CapitalizeAll<R>]
	: []

/** AngularOutputName<'element:ready'> → 'elementReady' */
export type AngularOutputName<T extends string> = Join<CamelCaseFrom1<Split<T, '-' | ':'>>, ''>

/** Из map событий дескриптора → map Angular-аутпутов (без EventEmitter, только имена) */
export type AngularOutputNames<T extends object> = {
	[K in keyof T as K extends string ? AngularOutputName<K> : never]: T[K]
}
