/**
 * useAdapter — основной React-хук связывания (аналог useAdapter из Vue-пакета).
 * Держание adapter-context между рендерами — отдельный хук, useAdapterContext
 * из этого же файла-баррела (см. `useAdapterContext.ts`).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-хуке компонента через
 * createAdapterContext + useAdapterContext) и связывает его с React через
 * связку `bindComponent` из setup. Своё здесь — только куда писать значение
 * (`useReducer`), как отдать событие (колбэк-проп) и в какой момент цикла
 * React это делать:
 *
 * 1. Core → React: подписка на триггеры свойств
 * 2. React → Core: входные пропсы, сменившиеся с прошлого рендера родителя
 * 3. События → колбэк-пропы
 * 4. DOM-биндинг через контекст (TElementPlugin)
 * 5. Очистка (adapter.destroy) при размонтировании
 *
 * Возвращает ctrl, plugins, ref, forwardProps и state (экспортированные props).
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react'
import { bindComponent, toInstanceState } from '@soldy/setup'
import type { IAdapterContext, TAdapterState } from '@soldy/setup'
import type { IPluginBundle } from '@soldy/plugins'
import { ReactProfile } from '../common'

export type TBinding<
	TInstance = object,
	TProps extends object = object,
	TOutputs extends object = object,
> = {
	ctrl: TInstance
	plugins: IPluginBundle | null
	ref: (el: Element | null) => void
	/** Пропсы, которые компонент не съел: уходят атрибутами в DOM. */
	forwardProps: Partial<TProps>
	/** Свойства инстанса и выходы плагинов со снимком через `valueOf()` — см. `TAdapterState`. */
	state: TAdapterState<TInstance, TOutputs>
}

type TState = Readonly<Record<string, unknown>>
type TAction = { name: string; value: unknown }

/** То же значение — тот же объект состояния: React не перерисует компонент зря. */
function reducer(prev: TState, action: TAction): TState {
	if (Object.is(prev[action.name], action.value)) return prev

	return { ...prev, [action.name]: action.value }
}

/** Выходы плагинов берутся из типа контекста — его выводит `createAdapterContext`. */
export function useAdapter<
	TProps extends object,
	TInstance extends object = object,
	TOutputs extends object = object,
>(
	adapter: IAdapterContext<TInstance, TOutputs>,
	props: TProps,
): TBinding<TInstance, TProps, TOutputs> {
	const binding = useMemo(() => bindComponent(adapter, ReactProfile), [adapter])
	const [state, dispatch] = useReducer(reducer, undefined, () => binding.state())

	// 1. Core → React
	useEffect(
		() => binding.bindOutput((prop, value) => dispatch({ name: prop.exportName, value })),
		[binding],
	)

	// 2. React → Core: эффект получает все props на каждом рендере родителя, а
	// связка пишет из них только сменившиеся с прошлого раза — иначе повтор
	// откатил бы то, что с тех пор поменяли ядро или код через инстанс
	useEffect(() => {
		binding.writeAll(props)
	}, [props, binding])

	// 3. События. useLayoutEffect: подписка до первой отрисовки, чтобы не
	// пропустить события, привязанные к DOM (`ready` из TElementPlugin через rAF)
	const propsRef = useRef(props)
	propsRef.current = props

	useLayoutEffect(
		() =>
			binding.bindEvents((exportName, args) => {
				const callback: unknown = Reflect.get(propsRef.current, exportName)

				if (typeof callback === 'function') callback(...args)
			}),
		[binding],
	)

	// 4. DOM-биндинг: контекст сам знает, есть ли у набора TElementPlugin
	const ref = useCallback((el: Element | null) => adapter.bindElement(el), [adapter])

	// 5. Очистка: destroy эмитит 'destroy', расширения отписываются сами.
	useEffect(() => () => adapter.destroy(), [adapter])

	const forwardProps = useMemo(() => binding.forward(props), [props, binding])

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		ref,
		forwardProps,
		state: toInstanceState<TInstance, TOutputs>(state),
	}
}
