/**
 * useComponent — единственный React-хук на весь проект.
 *
 * 1. Создаёт adapter-context (instance + bundle + accessor) один раз за маунт
 * 2. Навешивает синхронизацию (useSyncProps / useSyncEvents)
 * 3. Привязывает DOM-элемент через TElementPlugin
 * 4. Вызывает adapter.destroy() при размонтировании компонента
 *
 * Возвращает ctrl, plugins, ref, forwardProps и state (экспортированные props).
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { IAdapterContext, IComponentDescriptor } from '@soldy/setup'
import { createAdapterContext, TPluginsBindingExtension } from '@soldy/setup'
import { TElementPlugin } from '@soldy/plugins'
import type { IAccessorProp } from '@soldy/accessor'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

export type TDescriptorSource = IComponentDescriptor | (() => IComponentDescriptor)

export type TUseComponentOptions = {
	/** Переопределить стартовый набор расширений adapter-context'а. */
	defaultExtensions?: any[]
}

export type TComponentBinding<TInstance = any> = {
	ctrl: TInstance
	plugins: any
	ref: (el: Element | null) => void
	forwardProps: Record<string, any>
	state: Record<string, any>
}

/** TElementPlugin есть только у компонентов с DOM-слоем (ComponentView и ниже). */
function resolveDefaultExtensions(descriptor: IComponentDescriptor): any[] {
	const hasElementPlugin = descriptor.plugins.some((p) => (p.ctor as any) === TElementPlugin)

	return hasElementPlugin ? [TPluginsBindingExtension] : []
}

/** Собирает имена props/событий, которые «съедает» компонент. Остальное уходит в DOM. */
function computeForwardProps(
	props: Record<string, any>,
	accessor: IAdapterContext['accessor'],
	inspector: ReturnType<typeof createInspector>,
): Record<string, any> {
	const consumed = new Set<string>(['children', 'plugins'])

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

export function useComponent<TProps extends Record<string, any> = Record<string, any>, TInstance = any>(
	descriptorSource: TDescriptorSource,
	props: TProps,
	options: TUseComponentOptions = {},
): TComponentBinding<TInstance> {
	const descriptor = useMemo<IComponentDescriptor>(
		() => (typeof descriptorSource === 'function' ? descriptorSource() : descriptorSource),
		[descriptorSource],
	)

	// Ленивое создание через ref: в StrictMode рендер вызывается дважды,
	// но adapter должен создаваться ровно один раз за маунт.
	const adapterRef = useRef<IAdapterContext | null>(null)

	if (!adapterRef.current) {
		adapterRef.current = createAdapterContext(
			descriptor,
			{ ctrl: props.ctrl, props },
			{ defaultExtensions: options.defaultExtensions ?? resolveDefaultExtensions(descriptor) },
		)
	}

	const adapter = adapterRef.current
	const inspector = useMemo(() => createInspector(adapter.accessor), [adapter])

	const state = useSyncProps(adapter.accessor, inspector)

	useSyncEvents(adapter.accessor, inspector, props)

	// React props → Core (вход от пользователя)
	useEffect(() => {
		for (const prop of adapter.accessor.getProps(false) as IAccessorProp[]) {
			const exportName = inspector.getExportPropName(prop)
			const value = props[exportName] ?? props[prop.name.name]

			if (value === undefined) continue

			// Не пишем в Core, если значение не изменилось: сеттеры вроде
			// `visible` → show()/hide() эмитят show:before/hide:before даже
			// при том же значении, что даёт бесконечный цикл ре-рендеров.
			if (adapter.accessor.getValue(prop) === value) continue

			adapter.accessor.setValue(prop, value)
		}
	}, [adapter, inspector, props])

	// DOM-биндинг: привязываем элемент напрямую к TElementPlugin,
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

	// Очистка: destroy эмитит 'destroy', расширения отписываются сами.
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
