/**
 * TTabsContentExtension — связывает панель с её табом.
 *
 * Панель не регистрируется в коллекции: её нет в `items`. Она находит уже
 * существующий таб по совпадению `value` и берёт его `TItemContext` — тот же
 * контекст, с которым работает `TTabItemCollectionFacade`. Дальше активность и
 * ARIA-связка читаются через обычные item-адаптеры.
 *
 * Перерешение нужно в двух случаях: панель смонтировалась раньше своего таба
 * (тогда ждём `item:added`) и у панели сменилось `value`.
 */

import { TItemContextRegistry } from '@soldy/core'
import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'

export interface ITabsContentExtensionOptions {
	/** Инстанс панели (TTabsContent) — источник `value`. */
	content: any
	elevator: TElevatorFactory
}

/** Таб, чьё значение совпало со значением панели. */
function findByValue(engine: any, value: unknown): any {
	for (const item of engine.driver) {
		if (item.value === value) return item
	}

	return undefined
}

export class TTabsContentExtension {
	constructor(context: IAdapterContext, options: ITabsContentExtensionOptions) {
		const { content, elevator } = options
		const engine = elevator(ITEM_CONTEXT_ELEVATOR).up() as any

		if (!engine) return

		const facade = context.instance as any
		const registry = new TItemContextRegistry(engine.getCore())

		const resolve = (): void => {
			const item = findByValue(engine, content.value)

			if (item) facade.setContext(registry.get(item))
		}

		resolve()

		// Панель могла смонтироваться раньше своего таба
		engine.driver.events.on('item:added', resolve)
		content.events.on('change:value', resolve)

		context.events.on('destroy', () => {
			engine.driver.events.off('item:added', resolve)
			content.events.off('change:value', resolve)
		})
	}
}
