/**
 * useAdapter — единственный React-хук на весь проект (аналог useVue из Vue-пакета).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-хуке компонента через
 * createAdapterContext) и связывает его с React:
 *
 * 1. Core → React: подписка на триггеры props (bindOutput)
 * 2. React → Core: синхронизация входных props (bindInput)
 * 3. События (Core → React колбэки-пропсы)
 * 4. DOM-биндинг через TElementPlugin / TPluginsBindingExtension
 * 5. Очистка (adapter.destroy) при размонтировании
 *
 * Возвращает ctrl, plugins, ref, forwardProps и state (экспортированные props).
 */

import { useCallback, useEffect, useMemo } from 'react'
import type { IAdapterContext } from '@soldy/setup'
import { TPluginsBindingExtension } from '@soldy/setup'
import { TElementPlugin } from '@soldy/plugins'
import type { IAccessorProp } from '@soldy/accessor'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

export type TReactBinding<TInstance = any> = {
	ctrl: TInstance
	plugins: any
	ref: (el: Element | null) => void
	forwardProps: Record<string, any>
	state: Record<string, any>
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

export function useAdapter<TProps extends Record<string, any> = Record<string, any>, TInstance = any>(
	adapter: IAdapterContext,
	props: TProps,
): TReactBinding<TInstance> {
	const inspector = useMemo(() => createInspector(adapter.accessor), [adapter])

	// 1. Реактивность: Core ↔ React (output + input)
	const { state, bindOutput, bindInput } = useSyncProps(adapter.accessor, inspector)

	// 1.1. Core → React (Output): подписаться на триггеры и перечитывать значения
	useEffect(() => bindOutput(), [adapter, inspector])

	// 1.2. React → Core (Input): синхронизация входных props
	useEffect(() => {
		bindInput(props)
	}, [props, adapter, inspector])

	// 2. События (Core → React колбэки-пропсы)
	useSyncEvents(adapter.accessor, inspector, props)

	// 3. DOM-биндинг: привязываем элемент напрямую к TElementPlugin,
	// чтобы работало и после destroy (StrictMode remount).
	const ref = useCallback(
		(el: Element | null) => {
			const plugin = adapter.bundle?.get(TElementPlugin)

			if (plugin) {
				plugin.element = el as HTMLElement | null
			} else {
				adapter.get(TPluginsBindingExtension)?.bindElement(el ?? null)
			}
		},
		[adapter],
	)

	// 4. Очистка: destroy эмитит 'destroy', расширения отписываются сами.
	useEffect(() => () => adapter.destroy(), [adapter])

	const forwardProps = useMemo(
		() => computeForwardProps(props, adapter.accessor, inspector),
		[props, adapter, inspector],
	)

	return {
		ctrl: adapter.instance as TInstance,
		plugins: adapter.bundle,
		ref,
		forwardProps,
		state,
	}
}
