/**
 * useAdapter — единственный Solid-хук на весь проект (аналог useAdapter
 * из Vue/React/Svelte-пакетов).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-слое компонента через
 * createAdapterContext) и связывает его с Solid через связку `bindComponent`
 * из setup. Своё здесь — только куда писать значение (`createStore`), как
 * отдать событие (колбэк-проп) и в какой момент цикла Solid это делать:
 *
 * 1. Core → Solid: подписка на триггеры свойств
 * 2. Solid → Core: входные пропсы в эффекте
 * 3. События (Core → колбэк-пропы onXxx)
 * 4. DOM-биндинг через callback-ref
 * 5. Очистка при уничтожении компонента (onCleanup)
 *
 * Props передаются как есть: в Solid это объект геттеров, деструктурировать
 * его нельзя, но читать напрямую — можно и нужно.
 */

import { createEffect, createMemo, onCleanup } from 'solid-js'
import { createStore } from 'solid-js/store'
import { bindComponent, toInstanceState } from '@soldy/setup'
import type { IAdapterContext, TInstanceState } from '@soldy/setup'
import type { IPluginBundle } from '@soldy/plugins'
import { SolidProfile } from '../common'

export type TBinding<TInstance = object, TProps extends object = object> = {
	readonly ctrl: TInstance
	readonly plugins: IPluginBundle | null
	/** Свойства инстанса со снимком через `valueOf()` — см. `TInstanceState`. */
	readonly state: TInstanceState<TInstance>
	/** Мемо: DOM-атрибуты, не съеденные компонентом */
	forwardProps: () => Partial<TProps>
	/** callback-ref для корневого элемента */
	ref: (el: Element) => void
}

export function useAdapter<TProps extends object, TInstance extends object = object>(
	adapter: IAdapterContext<TInstance>,
	props: TProps,
): TBinding<TInstance, TProps> {
	const binding = bindComponent(adapter, SolidProfile)
	const [state, setState] = createStore<Record<string, unknown>>(binding.state())

	// 1. Core → Solid: подписка на всё время жизни, отписка на onCleanup.
	// Merge-форма, а не setState(key, value): при значении-функции путевая
	// форма трактовала бы его как updater.
	onCleanup(binding.bindOutput((prop, value) => setState({ [prop.exportName]: value })))

	// 2. Solid → Core: эффект читает props, поэтому перезапускается при изменении
	createEffect(() => binding.writeAll(props))

	// 3. События
	onCleanup(
		binding.bindEvents((exportName, args) => {
			const callback: unknown = Reflect.get(props, exportName)

			if (typeof callback === 'function') callback(...args)
		}),
	)

	// 4. Очистка контекста
	onCleanup(() => adapter.destroy())

	const forwardProps = createMemo(() => binding.forward(props))

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		state: toInstanceState<TInstance>(state),
		forwardProps,

		ref(el: Element) {
			adapter.bindElement(el)

			onCleanup(() => adapter.bindElement(null))
		},
	}
}
