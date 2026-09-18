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
 * Общее с остальными адаптерами — в связке `bindComponent` из setup. Своё
 * здесь: реактивности у платформы нет, поэтому состояние — обычный объект, об
 * изменении сообщает колбэк onUpdate (перерисовку планирует базовый класс
 * элемента), а события уходят `CustomEvent` на хосте.
 */

import { bindComponent, toInstanceState } from '@soldy/setup'
import type { IAdapterContext, TInstanceState } from '@soldy/setup'
import type { IPluginBundle } from '@soldy/plugins'
import { WebcProfile } from '../common'

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
	const binding = bindComponent(adapter, WebcProfile)
	const state = binding.state()

	const unbindOutput = binding.bindOutput((prop, value) => {
		state[prop.exportName] = value
		onUpdate(prop.exportName, value)
	})

	const unbindEvents = binding.bindEvents((exportName, args) => {
		host.dispatchEvent(
			new CustomEvent(exportName, {
				detail: args.length > 1 ? args : args[0],
				bubbles: true,
				composed: true,
			}),
		)
	})

	return {
		state: toInstanceState<TInstance>(state),
		ctrl: adapter.instance,
		plugins: adapter.bundle,

		syncProps(props: object): void {
			binding.writeAll(props)
		},

		bindElement(el: Element | null): void {
			adapter.bindElement(el)
		},

		destroy(): void {
			unbindOutput()
			unbindEvents()
			adapter.destroy()
		},
	}
}
