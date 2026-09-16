/**
 * useAdapter — runtime-слой Web Components (аналог useAdapter из остальных пакетов).
 *
 * Принимает ГОТОВЫЙ adapter-context и хост-элемент, возвращает TBinding:
 *
 * - state: текущие значения props из Core (обычный объект)
 * - syncProps(props): элемент → Core
 * - bindElement(el): DOM-биндинг для TElementPlugin
 * - destroy(): снятие подписок + adapter.destroy()
 *
 * Об изменениях сообщает колбэк onUpdate: своей реактивности у платформы нет,
 * планировать перерисовку — задача базового класса элемента.
 */

import { TPluginsBindingExtension, toInstanceState } from '@soldy/setup'
import type { IAdapterContext, TInstanceState } from '@soldy/setup'
import { TElementPlugin } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

export type TBinding<TInstance = object> = {
	/** Свойства инстанса со снимком через `valueOf()` — см. `TInstanceState`. */
	readonly state: TInstanceState<TInstance>
	readonly ctrl: TInstance
	readonly plugins: IPluginBundle | null
	syncProps(props: object): void
	bindElement(el: Element | null): void
	destroy(): void
}

export function useAdapter<TInstance extends object = object>(
	adapter: IAdapterContext<TInstance>,
	host: HTMLElement,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<TInstance> {
	const inspector = createInspector(adapter.accessor)
	const { state, bindOutput, bindInput } = useSyncProps(adapter.accessor, inspector, onUpdate)

	const unbindOutput = bindOutput()
	const unbindEvents = useSyncEvents(adapter.accessor, inspector, host)

	return {
		state: toInstanceState<TInstance>(state),
		ctrl: adapter.instance,
		plugins: adapter.bundle,

		syncProps(props: object): void {
			bindInput(props)
		},

		bindElement(el: Element | null): void {
			const plugin = adapter.bundle?.get(TElementPlugin)

			if (plugin) {
				plugin.element = el

				return
			}

			adapter.get<TPluginsBindingExtension>(TPluginsBindingExtension)?.bindElement(el)
		},

		destroy(): void {
			unbindOutput()
			unbindEvents()
			adapter.destroy()
		},
	}
}
