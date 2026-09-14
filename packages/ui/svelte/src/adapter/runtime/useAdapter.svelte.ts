/**
 * useAdapter — единственный Svelte-хук на весь проект (аналог useAdapter
 * из Vue/React-пакетов).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-слое компонента через
 * createAdapterContext) и связывает его со Svelte:
 *
 * 1. Core → Svelte: подписка на триггеры props (bindOutput)
 * 2. Svelte → Core: синхронизация входных props (bindInput)
 * 3. События (Core → колбэк-пропы onXxx)
 * 4. DOM-биндинг через attachment (аналог callback-ref в React)
 * 5. Очистка при уничтожении компонента
 *
 * Принимает геттер props: в Svelte 5 деструктуризация рвёт реактивность,
 * поэтому наружу передаётся сам объект `$props()`, а читается он лениво.
 *
 * Файл `.svelte.ts` — иначе руны `$effect` / `$derived` недоступны.
 */

import { TPluginsBindingExtension, toInstanceState } from '@soldy/setup'
import type { IAdapterContext, TInstanceState } from '@soldy/setup'
import { TElementPlugin } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import type { IAccessorProp } from '@soldy/accessor'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps.svelte'
import { useSyncEvents } from './useSyncEvents'

/** Пропсы, которые компонент не съел. `children`, `plugins` и `ctrl` он съедает всегда. */
type TForwardProps<TProps extends object> = Omit<Partial<TProps>, 'children' | 'plugins' | 'ctrl'>

export type TBinding<TInstance = object, TProps extends object = object> = {
	readonly ctrl: TInstance
	readonly plugins: IPluginBundle | null
	/** Свойства инстанса со снимком через `valueOf()` — см. `TInstanceState`. */
	readonly state: TInstanceState<TInstance>
	readonly forwardProps: TForwardProps<TProps>
	/** Svelte-attachment: `<div {@attach binding.attachElement}>` */
	attachElement: (node: Element) => (() => void) | void
}

/** Собирает имена props/событий, которые «съедает» компонент. Остальное уходит в DOM. */
function computeForwardProps<TProps extends object>(
	props: TProps,
	accessor: IAdapterContext['accessor'],
	inspector: ReturnType<typeof createInspector>,
): TForwardProps<TProps> {
	const consumed = new Set<string>(['children', 'plugins', 'ctrl'])

	for (const prop of accessor.getProps(true) as IAccessorProp[]) {
		consumed.add(inspector.getExportPropName(prop))
		consumed.add(prop.name.name)

		for (const trigger of inspector.getExportTriggers(prop)) {
			consumed.add(trigger)
		}
	}

	for (const evt of accessor.getEvents()) {
		consumed.add(inspector.getExportEventName(evt.name))
	}

	const rest: Partial<TProps> = {}

	for (const key of Object.keys(props)) {
		if (!consumed.has(key)) Reflect.set(rest, key, Reflect.get(props, key))
	}

	return rest
}

export function useAdapter<TProps extends object, TInstance extends object = object>(
	adapter: IAdapterContext<TInstance>,
	getProps: () => TProps,
): TBinding<TInstance, TProps> {
	const inspector = createInspector(adapter.accessor)

	// 1. Реактивность: Core ↔ Svelte
	const { state, bindOutput, bindInput } = useSyncProps(adapter.accessor, inspector)

	// 1.1. Core → Svelte: подписка живёт всё время жизни компонента,
	// возвращённая функция отписки становится cleanup'ом эффекта.
	$effect(() => bindOutput())

	// 1.2. Svelte → Core: эффект читает props, поэтому перезапускается при их изменении.
	$effect(() => {
		bindInput(getProps())
	})

	// 2. События: подписка одна на всё время жизни, props читаются лениво в колбэке.
	$effect(() => useSyncEvents(adapter.accessor, inspector, getProps))

	// 3. Очистка контекста
	$effect(() => () => adapter.destroy())

	const forwardProps = $derived(computeForwardProps(getProps(), adapter.accessor, inspector))

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		state: toInstanceState<TInstance>(state),

		get forwardProps() {
			return forwardProps
		},

		attachElement(node: Element) {
			const plugin = adapter.bundle?.get(TElementPlugin)

			if (plugin) {
				plugin.element = node as HTMLElement

				return () => {
					plugin.element = null
				}
			}

			const extension = adapter.get<TPluginsBindingExtension>(TPluginsBindingExtension)

			if (!extension) return

			extension.bindElement(node)

			return () => extension.bindElement(null)
		},
	}
}
