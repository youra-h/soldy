/**
 * Тип-зеркало стратегии именования событий из naming.ts (`callbackEventNaming`).
 *
 * TypeScript не умеет применять рантайм-функции на уровне типов, поэтому логика
 * продублирована условными типами. Оба определения обязаны меняться СИНХРОННО.
 *
 * Благодаря этому событийные пропы компонентов выводятся автоматически из
 * дескрипторов, без ручного перечисления:
 *
 *   TCallbackEventProps<DescriptorAllEvents<typeof ComponentViewDescriptor>>
 *     → { onShow?, onChangeVisible?, onElementReady?, ... }
 *
 * Используется React- и Svelte-адаптерами: в обоих события — колбэк-пропы.
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

/** ToPascalCase<'show:before'> → 'ShowBefore' */
type ToPascalCase<S extends string> = Join<CapitalizeAll<Split<S, '-' | ':'>>, ''>

/** TCallbackEventName<'show:before'> → 'onShowBefore' */
export type TCallbackEventName<T extends string> = `on${ToPascalCase<T>}`

/** TCallbackEventProps<DescriptorAllEvents<...>> → { onShow?: ..., onChangeVisible?: ... } */
export type TCallbackEventProps<T extends object> = {
	[K in keyof T as K extends string ? TCallbackEventName<K> : never]?: T[K]
}
