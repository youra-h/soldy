/**
 * Тип-трансформер, зеркалящий стратегию именования из naming.ts (ReactNaming).
 *
 * TypeScript не умеет применять рантайм-функции на уровне типов, поэтому логика
 * toPascalCase() / ReactNaming.event из naming.ts продублирована здесь как
 * условные типы. Оба определения должны изменяться СИНХРОННО.
 *
 * Благодаря этому событийные пропсы React-компонентов выводятся автоматически
 * из дескрипторов (@soldy/setup), без ручного дублирования:
 *
 *   ReactEventProps<DescriptorAllEvents<typeof ComponentDescriptor>>
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

/** ReactEventProps<DescriptorAllEvents<...>> → { onShow?: ..., onChangeVisible?: ... } */
export type ReactEventProps<T extends object> = {
	[K in keyof T as K extends string ? ReactEventName<K> : never]?: T[K]
}

