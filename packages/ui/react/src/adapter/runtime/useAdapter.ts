/**
 * useAdapter — основной React-хук связывания (аналог useAdapter из Vue-пакета).
 * Держание adapter-context между рендерами и его уничтожение — отдельный хук,
 * useAdapterContext из этого же файла-баррела (см. `useAdapterContext.ts`).
 *
 * Принимает ГОТОВЫЙ adapter-context (создаётся в setup-хуке компонента через
 * createAdapterContext + useAdapterContext) и связывает его с React через
 * обмен `adapter.connect()` из setup. Своё здесь — только куда писать значение
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
 *
 * Фасад коллекции связывает `useCollectionAdapter` — те же шаги 1–3 без
 * того, что принадлежит компоненту.
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
import { toInstanceState } from '@soldy-ui/setup'
import type {
	IAdapterContext,
	TExchange,
	IComponentContract,
	TAdapterState,
	TStateSnapshot,
} from '@soldy-ui/setup'
import type { IPluginBundle } from '@soldy-ui/plugins'
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

/**
 * То же, что `TBinding`, но без `ctrl` и `ref`: они принадлежат компоненту, а
 * не фасаду его коллекции (см. `useCollectionAdapter`).
 */
export type TCollectionBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
> = {
	plugins: IPluginBundle | null
	/** Пропсы, которые не съели ни компонент, ни фасад: уходят атрибутами в DOM. */
	forwardProps: Partial<TProps>
	/** Свойства фасада и выходы плагинов его дескриптора — как у `TBinding`. */
	state: TAdapterState<C>
}

/** Связка своего контекста: контекст пересобран — связка новая. */
type TStore = Readonly<{
	adapter: IAdapterContext
	binding: TExchange
}>

function bind(adapter: IAdapterContext): TStore {
	return { adapter, binding: adapter.connect(ReactProfile) }
}

function rebind(_: TStore, adapter: IAdapterContext): TStore {
	return bind(adapter)
}

/**
 * Общая часть `useAdapter` и `useCollectionAdapter`: связка контекста,
 * состояние, входы и события. Отдаёт то, из чего каждый хук собирает свой
 * результат.
 */
function useExchange(
	adapter: IAdapterContext,
	props: object,
): { binding: TExchange; state: TStateSnapshot } {
	const [store, dispatch] = useReducer(rebind, adapter, bind)

	// Контекст пересобран: у нового инстанса и плагинов свои значения и своя
	// связка. Обновление во время рендера React применяет сразу, не отрисовав прошлое
	if (store.adapter !== adapter) dispatch(adapter)

	const { binding } = store

	// 1. Core → React. Рендер идёт по снимку, подписка — при коммите, и React
	// сам сверяет снимок после подписки: изменение ядра между ними не теряется.
	// Подписка перечитывает каждое свойство тем же путём, что и триггер
	const state = useSyncExternalStore(
		binding.state.subscribe,
		binding.state.getSnapshot,
		binding.state.getSnapshot,
	)

	// 2. React → Core: эффект получает все props на каждом рендере родителя, а
	// связка пишет из них только сменившиеся с прошлого раза — иначе повтор
	// откатил бы то, что с тех пор поменяли ядро или код через инстанс
	useEffect(() => {
		binding.inputs.full(props)
	}, [props, binding])

	// 3. События. useLayoutEffect: подписка до первой отрисовки, чтобы не
	// пропустить события, привязанные к DOM (`ready` из TElementPlugin через rAF)
	const propsRef = useRef(props)
	propsRef.current = props

	useLayoutEffect(
		() =>
			binding.events.listen((exportName, args) => {
				const callback: unknown = Reflect.get(propsRef.current, exportName)

				if (typeof callback === 'function') callback(...args)
			}),
		[binding],
	)

	return { binding, state }
}

/** Инстанс и выходы плагинов берутся из контракта в типе контекста — его выводит `createAdapterContext`. */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
): TBinding<C, TProps> {
	const { binding, state } = useExchange(adapter, props)

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

/**
 * Адаптер фасада коллекции — всё то же, кроме того, что принадлежит компоненту.
 *
 * У коллекционного компонента контекстов два: свой и фасада. Состояние, входы
 * и события у фасада те же, что у компонента, а `ctrl` и `ref` — нет:
 *
 * - `ctrl` у фасада это `T*CollectionFacade`, тогда как снаружи под этим именем
 *   ждут сам компонент;
 * - своего узла у фасада нет: он делит набор компонента, и корень к
 *   `TElementPlugin` привязывает `useAdapter` компонента.
 *
 * `props` — все пропсы компонента: фасад берёт из них свои входы и колбэки
 * своих событий. `forward` — то, что не съел компонент (`forwardProps` его
 * `useAdapter`): фасад отбирает из них свои имена, и в DOM уходит только то,
 * что не съели ни компонент, ни фасад.
 */
export function useCollectionAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
	forward: Partial<TProps>,
): TCollectionBinding<C, TProps> {
	const { binding, state } = useExchange(adapter, props)

	const forwardProps = useMemo(() => binding.forward(forward), [forward, binding])

	return {
		plugins: adapter.bundle,
		forwardProps,
		state: toInstanceState<C>(state),
	}
}
