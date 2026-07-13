import type { ComponentContract } from './contract'

/**
 * Колбэки, которые адаптер предоставляет для обработки изменений.
 * Это контракт между sync() и фреймворк-адаптером.
 */
export interface SyncCallbacks {
	/** Вызывается при изменении свойства core-инстанса */
	onPropertyChange: (name: string, value: any) => void
	/** Вызывается при core-событии (show, hide, created, ...) */
	onEvent: (name: string, ...args: any[]) => void
}

export interface SyncOptions {
	instance: any
	props: Record<string, any>
	plugins?: any
}

/**
 * Универсальная функция синхронизации.
 * Не знает ничего о Vue/React/Angular — только вызывает колбэки.
 *
 * @returns Функция dispose() для отписки от всех событий.
 */
export function sync(
	contract: ReturnType<typeof import('./contract').createContract>,
	options: SyncOptions,
	callbacks: SyncCallbacks,
): () => void {
	const { instance, props } = options
	const disposers: (() => void)[] = []

	// 1. Подписка на core-события
	for (const event of contract.events) {
		const handler = (...args: any[]) => callbacks.onEvent(event, ...args)
		instance.events.on(event, handler)
		disposers.push(() => instance.events.off(event, handler))
	}

	// 2. Подписка на trigger-события свойств
	for (const [name, prop] of Object.entries(contract.props)) {
		for (const event of prop.triggers) {
			const handler = (...args: any[]) => {
				const value = args.length === 1 ? args[0] : args
				callbacks.onPropertyChange(name, value)
			}
			instance.events.on(event, handler)
			disposers.push(() => instance.events.off(event, handler))
		}
	}

	// 3. Синхронизация props → core (сеттеры)
	for (const [name, prop] of Object.entries(contract.props)) {
		if (!prop.set) continue
		const handler = (value: any) => {
			if (value !== undefined) prop.set!(instance, value)
		}
		// props[name] — реактивное, обёртка зависит от фреймворка.
		// Для Vue: watch(() => props[name], handler)
		// Для React: useEffect(() => handler(props[name]), [props[name]])
		// Здесь оставляем ручное управление — адаптер сам вызовет set при изменении props.
	}

	// 4. Подписка на события плагинов
	for (const Plugin of contract.plugins) {
		// Адаптер сам подпишется на нужные события плагинов
	}

	return () => disposers.forEach((d) => d())
}
