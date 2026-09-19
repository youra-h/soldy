/**
 * useAdapter — основной React-хук связывания (аналог useAdapter из Vue-пакета).
 * Держание adapter-context между рендерами и его уничтожение — отдельный хук,
 * useAdapterContext из этого же файла-баррела (см. `useAdapterContext.ts`).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-хуке компонента через
 * createAdapterContext + useAdapterContext) и связывает его с React через
 * связку `bindComponent` из setup. Своё здесь — только куда писать значение
 * (связка — внешнее хранилище для `useSyncExternalStore`), как отдать событие
 * (колбэк-проп) и в какой момент цикла React это делать:
 *
 * 1. Core → React: подписка на состояние связки
 * 2. React → Core: входные пропсы, сменившиеся с прошлого рендера родителя
 * 3. События → колбэк-пропы
 * 4. DOM-биндинг через контекст (TElementPlugin)
 *
 * Контекст может смениться: useAdapterContext пересобирает его, когда React
 * заново устанавливает эффекты (StrictMode, `<Activity>`). Пересборка — такое
 * же монтирование: пропсы применяет сборка, у нового контекста своя связка, и
 * состояние заполняется заново из неё.
 *
 * Возвращает ctrl, plugins, ref, forwardProps и state (экспортированные props).
 */

import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useSyncExternalStore,
} from 'react'
import { bindComponent, toInstanceState } from '@soldy/setup'
import type {
	IAdapterContext,
	IComponentBinding,
	IComponentContract,
	TAdapterState,
} from '@soldy/setup'
import type { IPluginBundle } from '@soldy/plugins'
import { ReactProfile } from '../common'

export type TBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
> = {
	ctrl: C['instance']
	plugins: IPluginBundle | null
	ref: (el: Element | null) => void
	/** Пропсы, которые компонент не съел: уходят атрибутами в DOM. */
	forwardProps: Partial<TProps>
	/** Свойства инстанса и выходы плагинов со снимком через `valueOf()` — см. `TAdapterState`. */
	state: TAdapterState<C>
}

/** Связка своего контекста: контекст пересобран — связка новая. */
type TStore = Readonly<{
	adapter: IAdapterContext
	binding: IComponentBinding
}>

function bind(adapter: IAdapterContext): TStore {
	return { adapter, binding: bindComponent(adapter, ReactProfile) }
}

function rebind(_: TStore, adapter: IAdapterContext): TStore {
	return bind(adapter)
}

/** Инстанс и выходы плагинов берутся из контракта в типе контекста — его выводит `createAdapterContext`. */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
): TBinding<C, TProps> {
	const [store, dispatch] = useReducer(rebind, adapter, bind)

	// Контекст пересобран: у нового инстанса и плагинов свои значения и своя
	// связка. Обновление во время рендера React применяет сразу, не отрисовав прошлое
	if (store.adapter !== adapter) dispatch(adapter)

	const { binding } = store

	// 1. Core → React. Рендер идёт по снимку, подписка — при коммите, и React
	// сам сверяет снимок после подписки: изменение ядра между ними не теряется.
	// Подписка перечитывает каждое свойство тем же путём, что и триггер
	const state = useSyncExternalStore(binding.subscribe, binding.getSnapshot, binding.getSnapshot)

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
		state: toInstanceState<C>(state),
	}
}
