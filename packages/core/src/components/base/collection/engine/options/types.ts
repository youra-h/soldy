import type { TEvented } from '@soldy-ui/core'

/** Опции движка: значения, которые компонент передаёт своим расширениям. */
export type TEngineOptions = Record<string, unknown>

/**
 * Область наблюдателя опции: всё, на что в ней подписались, снимается перед
 * следующим вызовом наблюдателя и при отписке от него.
 */
export interface IOptionScope {
	/** Подписка, живущая до следующей смены опции. */
	on<TSource extends Record<string, (...args: any) => any>, K extends keyof TSource>(
		source: TEvented<TSource>,
		event: K,
		handler: TSource[K],
	): void
	/** Любое снятие, которое нужно сделать при смене опции. */
	add(dispose: () => void): void
}

/** Наблюдатель опции: текущее значение и область, живущая до следующей смены. */
export type TOptionWatcher<TValue> = (value: TValue | undefined, scope: IOptionScope) => void

/** Чтение и наблюдение опций — то, что видит расширение (`ctx.options`). */
export interface IEngineOptionsReader<TOptions extends TEngineOptions> {
	/** Текущее значение опции. */
	get<K extends keyof TOptions>(key: K): TOptions[K] | undefined
	/**
	 * Наблюдать опцию: колбэк вызывается сразу с текущим значением и на каждую
	 * смену, в том числе на `undefined`. Возвращает отписку.
	 */
	watch<K extends keyof TOptions>(key: K, watcher: TOptionWatcher<TOptions[K]>): () => void
}
