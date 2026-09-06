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

import type { IAdapterContext } from '@soldy/setup'
import { TPluginsBindingExtension } from '@soldy/setup'
import { TElementPlugin } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import { createInspector } from '../common'
import { useSyncProps, type TWebcState } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

export type TBinding<TInstance = any> = {
	readonly state: TWebcState
	readonly ctrl: TInstance
	readonly plugins: IPluginBundle
	syncProps(props: Record<string, any>): void
	bindElement(el: HTMLElement | null): void
	destroy(): void
}

export function useAdapter<TInstance = any>(
	adapter: IAdapterContext,
	host: HTMLElement,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<TInstance> {
	const inspector = createInspector(adapter.accessor)
	const { state, bindOutput, bindInput } = useSyncProps(adapter.accessor, inspector, onUpdate)

	const unbindOutput = bindOutput()
	const unbindEvents = useSyncEvents(adapter.accessor, inspector, host)

	return {
		state,
		ctrl: adapter.instance as TInstance,
		plugins: adapter.bundle,

		syncProps(props: Record<string, any>): void {
			bindInput(props)
		},

		bindElement(el: HTMLElement | null): void {
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
