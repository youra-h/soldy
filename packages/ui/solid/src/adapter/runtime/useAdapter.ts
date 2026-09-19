/**
 * useAdapter — единственный Solid-хук на весь проект (аналог useAdapter
 * из Vue/React/Svelte-пакетов).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-слое компонента через
 * createAdapterContext) и связывает его с Solid через связку `bindComponent`
 * из setup. Своё здесь — только куда писать значение (`createStore`), как
 * отдать событие (колбэк-проп) и в какой момент цикла Solid это делать:
 *
 * 1. Core → Solid: подписка на состояние связки
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
import type { IAdapterContext, IComponentContract, TAdapterState } from '@soldy/setup'
import type { IPluginBundle } from '@soldy/plugins'
import { SolidProfile } from '../common'

export type TBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
> = {
	readonly ctrl: C['instance']
	readonly plugins: IPluginBundle | null
	/** Свойства инстанса и выходы плагинов со снимком через `valueOf()` — см. `TAdapterState`. */
	readonly state: TAdapterState<C>
	/** Мемо: DOM-атрибуты, не съеденные компонентом */
	forwardProps: () => Partial<TProps>
	/** callback-ref для корневого элемента */
	ref: (el: Element) => void
}

/** Инстанс и выходы плагинов берутся из контракта в типе контекста — его выводит `createAdapterContext`. */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
): TBinding<C, TProps> {
	const binding = bindComponent(adapter, SolidProfile)
	const [state, setState] = createStore<Record<string, unknown>>({})

	// 1. Core → Solid: подписка на всё время жизни, отписка на onCleanup.
	// Подписка сразу отдаёт значение каждого свойства — тем же вызовом, что и
	// триггер: так стор и заполняется. Merge-форма, а не setState(key, value):
	// при значении-функции путевая форма трактовала бы его как updater.
	onCleanup(binding.subscribe((prop, value) => setState({ [prop.exportName]: value })))

	// 2. Solid → Core: эффект читает все props и перезапускается при смене любого,
	// а связка пишет из них только сменившиеся с прошлого раза
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
		state: toInstanceState<C>(state),
		forwardProps,

		ref(el: Element) {
			adapter.bindElement(el)

			onCleanup(() => adapter.bindElement(null))
		},
	}
}
