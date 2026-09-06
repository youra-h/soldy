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

import type { IAdapterContext } from '@soldy/setup'
import { TPluginsBindingExtension } from '@soldy/setup'
import { TElementPlugin } from '@soldy/plugins'
import type { IAccessorProp } from '@soldy/accessor'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps.svelte'
import { useSyncEvents } from './useSyncEvents'

export type TBinding<TInstance = any> = {
	readonly ctrl: TInstance
	readonly plugins: any
	readonly state: Record<string, any>
	readonly forwardProps: Record<string, any>
	/** Svelte-attachment: `<div {@attach binding.attachElement}>` */
	attachElement: (node: Element) => (() => void) | void
}

/** Собирает имена props/событий, которые «съедает» компонент. Остальное уходит в DOM. */
function computeForwardProps(
	props: Record<string, any>,
	accessor: IAdapterContext['accessor'],
	inspector: ReturnType<typeof createInspector>,
): Record<string, any> {
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

	const rest: Record<string, any> = {}

	for (const key of Object.keys(props)) {
		if (!consumed.has(key)) rest[key] = props[key]
	}

	return rest
}

export function useAdapter<TInstance = any>(
	adapter: IAdapterContext,
	getProps: () => Record<string, any>,
): TBinding<TInstance> {
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
		ctrl: adapter.instance as TInstance,
		plugins: adapter.bundle,
		state,

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
