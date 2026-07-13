import type { TComponentEvents } from '@soldy/core'

/**
 * Контракт компонента — фреймворк-независимое описание.
 * Единственный источник истины для всех адаптеров (Vue/React/Angular/Svelte/Solid).
 */

/** Описание одного свойства */
export interface PropertyContract<TEvents extends Record<string, any> = TComponentEvents> {
	/** Чтение значения из core-инстанса */
	get: (instance: any) => any
	/** Запись значения в core-инстанс (опционально — если readonly) */
	set?: (instance: any, value: any) => void
	/**
	 * Имена core-событий, при которых нужно перечитать get.
	 * Типизировано — только ключи из TEvents.
	 */
	triggers: (keyof TEvents)[]
}

export interface ComponentContract<TEvents extends Record<string, any> = TComponentEvents> {
	props: Record<string, PropertyContract<TEvents>>
	events: (keyof TEvents)[]
	plugins: (new (...args: any[]) => any)[]
}

export function createContract<TEvents extends Record<string, any>>(
	contract: ComponentContract<TEvents>,
): ComponentContract<TEvents> & {
	extend: <TExtEvents extends Record<string, any>>(
		extension: Partial<ComponentContract<TExtEvents>>,
	) => ComponentContract<TEvents & TExtEvents> & {
		extend: (...args: any[]) => any
	}
} {
	return {
		...contract,

		extend<TExtEvents extends Record<string, any>>(
			extension: Partial<ComponentContract<TExtEvents>>,
		) {
			return createContract<TEvents & TExtEvents>({
				props: { ...contract.props, ...extension.props },
				events: [...contract.events, ...(extension.events ?? [])] as (keyof (TEvents & TExtEvents))[],
				plugins: [...contract.plugins, ...(extension.plugins ?? [])],
			})
		},
	}
}
