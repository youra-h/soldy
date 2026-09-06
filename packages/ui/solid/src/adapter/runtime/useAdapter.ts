/**
 * useAdapter — единственный Solid-хук на весь проект (аналог useAdapter
 * из Vue/React/Svelte-пакетов).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-слое компонента через
 * createAdapterContext) и связывает его с Solid:
 *
 * 1. Core → Solid: подписка на триггеры props (bindOutput)
 * 2. Solid → Core: синхронизация входных props (bindInput)
 * 3. События (Core → колбэк-пропы onXxx)
 * 4. DOM-биндинг через callback-ref
 * 5. Очистка при уничтожении компонента (onCleanup)
 *
 * Props передаются как есть: в Solid это объект геттеров, деструктурировать
 * его нельзя, но читать напрямую — можно и нужно.
 */

import { createEffect, createMemo, onCleanup } from 'solid-js'
import type { IAdapterContext } from '@soldy/setup'
import { TPluginsBindingExtension } from '@soldy/setup'
import { TElementPlugin } from '@soldy/plugins'
import type { IAccessorProp } from '@soldy/accessor'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

export type TBinding<TInstance = any> = {
	readonly ctrl: TInstance
	readonly plugins: any
	readonly state: Record<string, any>
	/** Мемо: DOM-атрибуты, не съеденные компонентом */
	forwardProps: () => Record<string, any>
	/** callback-ref для корневого элемента */
	ref: (el: Element) => void
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
	props: Record<string, any>,
): TBinding<TInstance> {
	const inspector = createInspector(adapter.accessor)

	// 1. Реактивность: Core ↔ Solid
	const { state, bindOutput, bindInput } = useSyncProps(adapter.accessor, inspector)

	// 1.1. Core → Solid: подписка на всё время жизни, отписка на onCleanup
	onCleanup(bindOutput())

	// 1.2. Solid → Core: эффект читает props, поэтому перезапускается при изменении
	createEffect(() => bindInput(props))

	// 2. События
	onCleanup(useSyncEvents(adapter.accessor, inspector, props))

	// 3. Очистка контекста
	onCleanup(() => adapter.destroy())

	const forwardProps = createMemo(() =>
		computeForwardProps(props, adapter.accessor, inspector),
	)

	return {
		ctrl: adapter.instance as TInstance,
		plugins: adapter.bundle,
		state,
		forwardProps,

		ref(el: Element) {
			const plugin = adapter.bundle?.get(TElementPlugin)

			if (plugin) {
				plugin.element = el as HTMLElement

				onCleanup(() => {
					plugin.element = null
				})

				return
			}

			const extension = adapter.get<TPluginsBindingExtension>(TPluginsBindingExtension)

			if (!extension) return

			extension.bindElement(el)

			onCleanup(() => extension.bindElement(null))
		},
	}
}
