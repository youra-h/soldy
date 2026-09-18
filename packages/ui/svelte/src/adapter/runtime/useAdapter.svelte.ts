/**
 * useAdapter — единственный Svelte-хук на весь проект (аналог useAdapter
 * из Vue/React-пакетов).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-слое компонента через
 * createAdapterContext) и связывает его со Svelte через связку `bindComponent`
 * из setup. Своё здесь — только куда писать значение (руна `$state`), как
 * отдать событие (колбэк-проп) и в какой момент цикла Svelte это делать:
 *
 * 1. Core → Svelte: подписка на триггеры свойств
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

import { bindComponent, toInstanceState } from '@soldy/setup'
import type { IAdapterContext, TInstanceState } from '@soldy/setup'
import type { IPluginBundle } from '@soldy/plugins'
import { SvelteProfile } from '../common'

/** Пропсы, которые компонент не съел. `children` и `ctrl` он съедает всегда. */
type TForwardProps<TProps extends object> = Omit<Partial<TProps>, 'children' | 'ctrl'>

export type TBinding<TInstance = object, TProps extends object = object> = {
	readonly ctrl: TInstance
	readonly plugins: IPluginBundle | null
	/** Свойства инстанса со снимком через `valueOf()` — см. `TInstanceState`. */
	readonly state: TInstanceState<TInstance>
	readonly forwardProps: TForwardProps<TProps>
	/** Svelte-attachment: `<div {@attach binding.attachElement}>` */
	attachElement: (node: Element) => (() => void) | void
}

export function useAdapter<TProps extends object, TInstance extends object = object>(
	adapter: IAdapterContext<TInstance>,
	getProps: () => TProps,
): TBinding<TInstance, TProps> {
	const binding = bindComponent(adapter, SvelteProfile)
	const state = $state<Record<string, unknown>>(binding.state())

	// 1. Core → Svelte: подписка живёт всё время жизни компонента,
	// возвращённая функция отписки становится cleanup'ом эффекта.
	$effect(() =>
		binding.bindOutput((prop, value) => {
			state[prop.exportName] = value
		}),
	)

	// 2. Svelte → Core: эффект читает props, поэтому перезапускается при их изменении.
	$effect(() => {
		binding.writeAll(getProps())
	})

	// 3. События: подписка одна на всё время жизни, props читаются лениво в колбэке.
	$effect(() =>
		binding.bindEvents((exportName, args) => {
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
		state: toInstanceState<TInstance>(state),

		get forwardProps() {
			return forwardProps
		},

		attachElement(node: Element) {
			adapter.bindElement(node)

			return () => adapter.bindElement(null)
		},
	}
}
