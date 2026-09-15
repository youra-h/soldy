/**
 * useAdapter — основной React-хук связывания (аналог useAdapter из Vue-пакета).
 * Держание adapter-context между рендерами — отдельный хук, useAdapterContext
 * из этого же файла-баррела (см. `useAdapterContext.ts`).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-хуке компонента через
 * createAdapterContext + useAdapterContext) и связывает его с React:
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
import { TPluginsBindingExtension, collectForwardProps, toInstanceState } from '@soldy/setup'
import type { IAdapterContext, TInstanceState } from '@soldy/setup'
import { TElementPlugin } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

export type TBinding<TInstance = object, TProps extends object = object> = {
	ctrl: TInstance
	plugins: IPluginBundle | null
	ref: (el: Element | null) => void
	/** Пропсы, которые компонент не съел: уходят атрибутами в DOM. */
	forwardProps: Partial<TProps>
	/** Свойства инстанса со снимком через `valueOf()` — см. `TInstanceState`. */
	state: TInstanceState<TInstance>
}

export function useAdapter<TProps extends object, TInstance extends object = object>(
	adapter: IAdapterContext<TInstance>,
	props: TProps,
): TBinding<TInstance, TProps> {
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
		() => collectForwardProps(props, adapter, inspector, 'children'),
		[props, adapter, inspector],
	)

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		ref,
		forwardProps,
		state: toInstanceState<TInstance>(state),
	}
}
