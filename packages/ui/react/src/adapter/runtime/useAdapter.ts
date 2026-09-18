/**
 * useAdapter — основной React-хук связывания (аналог useAdapter из Vue-пакета).
 * Держание adapter-context между рендерами и его уничтожение — отдельный хук,
 * useAdapterContext из этого же файла-баррела (см. `useAdapterContext.ts`).
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
 *
 * Контекст может смениться: useAdapterContext пересобирает его, когда React
 * заново устанавливает эффекты (StrictMode, `<Activity>`). Связка нового
 * контекста продолжает память прошлой, а состояние заполняется заново из неё.
 *
 * Возвращает ctrl, plugins, ref, forwardProps и state (экспортированные props).
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react'
import { bindComponent, toInstanceState } from '@soldy/setup'
import type { IAdapterContext, IComponentBinding, TAdapterState } from '@soldy/setup'
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

/**
 * Связка контекста и её состояние — одно целое: состояние заполняется из
 * `state()` своей связки и дальше пишется её подпиской на триггеры.
 */
type TStore = Readonly<{
	adapter: IAdapterContext
	binding: IComponentBinding
	state: TState
}>

type TAction =
	/** Ядро сообщило новое значение свойства. */
	| { type: 'output'; name: string; value: unknown }
	/** Контекст пересобран — связать новый, продолжив память прошлой связки. */
	| { type: 'rebind'; adapter: IAdapterContext }

function bind(adapter: IAdapterContext, previous?: IComponentBinding): TStore {
	const binding = bindComponent(adapter, ReactProfile, previous)

	return { adapter, binding, state: binding.state() }
}

function reducer(prev: TStore, action: TAction): TStore {
	if (action.type === 'rebind') return bind(action.adapter, prev.binding)

	// То же значение — тот же объект состояния: React не перерисует компонент зря
	if (Object.is(prev.state[action.name], action.value)) return prev

	return { ...prev, state: { ...prev.state, [action.name]: action.value } }
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
	const [store, dispatch] = useReducer(reducer, adapter, bind)

	// Контекст пересобран: у нового инстанса и плагинов свои значения, а связка
	// продолжает память прошлой — пропсы с тех пор фреймворк заново не задавал.
	// Обновление во время рендера React применяет сразу, не отрисовав прошлое
	if (store.adapter !== adapter) dispatch({ type: 'rebind', adapter })

	const { binding, state } = store

	// 1. Core → React
	useEffect(
		() =>
			binding.bindOutput((prop, value) =>
				dispatch({ type: 'output', name: prop.exportName, value }),
			),
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

	const forwardProps = useMemo(() => binding.forward(props), [props, binding])

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		ref,
		forwardProps,
		state: toInstanceState<TInstance, TOutputs>(state),
	}
}
