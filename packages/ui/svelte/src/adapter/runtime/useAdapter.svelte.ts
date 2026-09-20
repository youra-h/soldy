/**
 * useAdapter — единственный Svelte-хук на весь проект (аналог useAdapter
 * из Vue/React-пакетов).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-слое компонента через
 * createAdapterContext) и связывает его со Svelte через обмен `adapter.connect()`
 * из setup. Своё здесь — только куда писать значение (руна `$state`), как
 * отдать событие (колбэк-проп) и в какой момент цикла Svelte это делать:
 *
 * 1. Core → Svelte: подписка на состояние связки
 * 2. Svelte → Core: входные пропсы в эффекте
 * 3. События (Core → колбэк-пропы onXxx)
 * 4. DOM-биндинг через attachment (аналог callback-ref в React)
 * 5. Очистка при уничтожении компонента
 *
 * Принимает геттер props: в Svelte 5 деструктуризация рвёт реактивность,
 * поэтому наружу передаётся сам объект `$props()`, а читается он лениво.
 *
 * Файл `.svelte.ts` — иначе руны `$effect` / `$derived` недоступны.
 */

import { onDestroy } from 'svelte'
import { toInstanceState } from '@soldy/setup'
import type { IAdapterContext, IComponentContract, TAdapterState } from '@soldy/setup'
import type { IPluginBundle } from '@soldy/plugins'
import { SvelteProfile } from '../common'

/** Пропсы, которые компонент не съел. `children` и `ctrl` он съедает всегда. */
type TForwardProps<TProps extends object> = Omit<Partial<TProps>, 'children' | 'ctrl'>

export type TBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
> = {
	readonly ctrl: C['instance']
	readonly plugins: IPluginBundle | null
	/** Свойства инстанса и выходы плагинов со снимком через `valueOf()` — см. `TAdapterState`. */
	readonly state: TAdapterState<C>
	readonly forwardProps: TForwardProps<TProps>
	/** Svelte-attachment: `<div {@attach binding.attachElement}>` */
	attachElement: (node: Element) => (() => void) | void
}

/** Инстанс и выходы плагинов берутся из контракта в типе контекста — его выводит `createAdapterContext`. */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	getProps: () => TProps,
): TBinding<C, TProps> {
	const binding = adapter.connect(SvelteProfile)
	const state = $state<Record<string, unknown>>({})

	// 1. Core → Svelte: подписка сразу, при инициализации компонента, а не в
	// эффекте — иначе изменение ядра до эффекта не дошло бы. Она же отдаёт
	// значение каждого свойства тем же вызовом, что и триггер: так состояние и
	// заполняется. onDestroy, а не cleanup эффекта: эффект на сервере не
	// выполняется, а отписаться нужно и там
	onDestroy(
		binding.state.subscribe((name, value) => {
			state[name] = value
		}),
	)

	// 2. Svelte → Core: эффект читает все props и перезапускается при смене любого,
	// а связка пишет из них только сменившиеся с прошлого раза
	$effect(() => {
		binding.inputs.full(getProps())
	})

	// 3. События: подписка одна на всё время жизни, props читаются лениво в колбэке.
	$effect(() =>
		binding.events.listen((exportName, args) => {
			const callback: unknown = Reflect.get(getProps(), exportName)

			if (typeof callback === 'function') callback(...args)
		}),
	)

	// 4. Очистка контекста
	$effect(() => () => adapter.destroy())

	const forwardProps = $derived(binding.forward(getProps()))

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		state: toInstanceState<C>(state),

		get forwardProps() {
			return forwardProps
		},

		attachElement(node: Element) {
			adapter.bindElement(node)

			return () => adapter.bindElement(null)
		},
	}
}
