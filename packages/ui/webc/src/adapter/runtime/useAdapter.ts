/**
 * useAdapter — runtime-слой Web Components (аналог useAdapter из остальных пакетов).
 *
 * Принимает ГОТОВЫЙ adapter-context и хост-элемент, возвращает TBinding:
 *
 * - state: текущие значения props из Core (обычный объект)
 * - syncProps(props): элемент → Core, только переданные ключи
 * - bindElement(el): DOM-биндинг для TElementPlugin
 * - destroy(): снятие подписок + adapter.destroy()
 *
 * Общее с остальными адаптерами — в обмене `adapter.connect()` из setup. Своё
 * здесь: реактивности у платформы нет, поэтому состояние — обычный объект, об
 * изменении сообщает колбэк onUpdate (перерисовку планирует базовый класс
 * элемента), а события уходят `CustomEvent` на хосте.
 */

import { toInstanceState } from '@soldy-ui/setup'
import type { IAdapterContext, IComponentContract, TInstanceState } from '@soldy-ui/setup'
import type { IPluginBundle } from '@soldy-ui/plugins'
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

export function useAdapter<C extends IComponentContract>(
	adapter: IAdapterContext<C>,
	host: HTMLElement,
	onUpdate: (name: string, value: unknown) => void,
): TBinding<C['instance']> {
	const binding = adapter.connect(WebcProfile)
	const state: Record<string, unknown> = {}

	// Подписка сразу отдаёт значение каждого свойства — тем же вызовом, что и
	// триггер: так состояние и заполняется, а элемент помечает его к отрисовке
	const unsubscribe = binding.state.subscribe((name, value) => {
		state[name] = value
		onUpdate(name, value)
	})

	const unbindEvents = binding.events.listen((exportName, args) => {
		host.dispatchEvent(
			new CustomEvent(exportName, {
				detail: args.length > 1 ? args : args[0],
				bubbles: true,
				composed: true,
			}),
		)
	})

	return {
		state: toInstanceState<C>(state),
		ctrl: adapter.instance,
		plugins: adapter.bundle,

		// Элемент отдаёт не полный набор, а то, что задано: по одному атрибуту или
		// свойству. Выставленное до подключения применила сборка контекста.
		// Поэтому `writeChanged`: `writeAll` сбросил бы к умолчанию остальные
		syncProps(props: object): void {
			binding.inputs.delta(props)
		},

		bindElement(el: Element | null): void {
			adapter.bindElement(el)
		},

		destroy(): void {
			unsubscribe()
			unbindEvents()
			adapter.destroy()
		},
	}
}
