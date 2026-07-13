/**
 * Контракт компонента — фреймворк-независимое описание.
 * Единственный источник истины для всех адаптеров (Vue/React/Angular/Svelte/Solid).
 */

/** Описание одного свойства */
export interface PropertyContract<TInstance = any> {
	/** Чтение значения из core-инстанса */
	get: (instance: TInstance) => any
	/** Запись значения в core-инстанс (опционально — если readonly) */
	set?: (instance: TInstance, value: any) => void
	/**
	 * Имена core-событий, при которых нужно перечитать get.
	 * Обычно одно: ['change:visible']. Для вычисляемых — несколько: ['change:rendered', 'change:visible'].
	 */
	triggers: string[]
}

/** Контракт компонента */
export interface ComponentContract<TInstance = any> {
	/** Свойства, пробрасываемые в шаблон */
	props: Record<string, PropertyContract<TInstance>>
	/** Core-события (show, hide, created, ...) */
	events: string[]
	/** Плагины, необходимые компоненту */
	plugins: (new (...args: any[]) => any)[]
}

/** @internal — внутренний тип с конструктором */
type Ctor = new (...args: any[]) => any

/**
 * Создаёт контракт компонента с поддержкой наследования через .extend().
 */
export function createContract<TInstance = any>(contract: ComponentContract<TInstance>) {
	return {
		...contract,

		/** Расширяет контракт новыми props, events, plugins */
		extend(extension: Partial<ComponentContract<TInstance>>): ReturnType<typeof createContract<TInstance>> {
			return createContract({
				props: { ...contract.props, ...extension.props },
				events: [...contract.events, ...(extension.events ?? [])],
				plugins: [...contract.plugins, ...(extension.plugins ?? [])],
			})
		},
	}
}
