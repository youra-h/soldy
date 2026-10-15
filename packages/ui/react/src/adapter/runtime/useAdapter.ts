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
 * 4. DOM-биндинг через контекст (TElementPlugin), и тот же узел — `ref`
 *    потребителя (`TRootRef`)
 *
 * Контекст может смениться: useAdapterContext пересобирает его, когда React
 * заново устанавливает эффекты (StrictMode, `<Activity>`). Пересборка — такое
 * же монтирование: пропсы применяет сборка, у нового контекста своя связка, и
 * состояние заполняется заново из неё.
 *
 * Возвращает ctrl, plugins, ref и bindRef, forwardProps и state
 * (экспортированные props).
 *
 * Фасад коллекции связывает `useCollectionAdapter` — те же шаги 1–3 без
 * того, что принадлежит компоненту.
 */

import {
	useEffect,
	useInsertionEffect,
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
import { TRootRef, consumerRefOf } from './root-ref.class'
import { TStableSnapshot } from './stable-snapshot.class'

export type TBinding<
	C extends IComponentContract = IComponentContract,
	TProps extends object = object,
> = {
	ctrl: C['instance']
	plugins: IPluginBundle | null
	/** Ref корня: привязка к `TElementPlugin`, и тот же узел — `ref` потребителя. */
	ref: (el: Element | null) => void
	/**
	 * Ref корня внутри обёртки (`toWrappedRootProps`) — только привязка к
	 * `TElementPlugin`: `ref` потребителя получает обёртка, с его атрибутами.
	 */
	bindRef: (el: Element | null) => void
	/** Пропсы, которые компонент не съел: уходят атрибутами в DOM. */
	forwardProps: Partial<TProps>
	/** Свойства инстанса и выходы плагинов со снимком через `valueOf()` — см. `TAdapterState`. */
	state: TAdapterState<C>
}

/**
 * То же, что `TBinding`, но без `ctrl` и ref корня: они принадлежат
 * компоненту, а не фасаду его коллекции (см. `useCollectionAdapter`).
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

/** Связка своего контекста и её снимок для React: контекст пересобран — обе новые. */
type TStore = Readonly<{
	adapter: IAdapterContext
	binding: TExchange
	snapshot: TStableSnapshot
}>

function bind(adapter: IAdapterContext): TStore {
	const binding = adapter.connect(ReactProfile)

	return { adapter, binding, snapshot: new TStableSnapshot(binding.state.getSnapshot) }
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

	const { binding, snapshot } = store

	// 1. Core → React. Рендер идёт по снимку, подписка — при коммите, и React
	// сам сверяет снимок после подписки: изменение ядра между ними не теряется.
	// Подписка перечитывает каждое свойство тем же путём, что и триггер, а
	// перечитанное, но то же по содержимому, `TStableSnapshot` отдаёт прежним
	// объектом — иначе каждое монтирование перерисовывалось бы второй раз
	const state = useSyncExternalStore(
		binding.state.subscribe,
		snapshot.getSnapshot,
		snapshot.getSnapshot,
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

/**
 * Инстанс и выходы плагинов берутся из контракта в типе контекста — его
 * выводит `createAdapterContext`.
 *
 * `ref` в пропсах — `ref` потребителя: в React 19 это обычный проп, и ведёт он
 * к корню компонента (`TRootRef`).
 */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
): TBinding<C, TProps> {
	const { binding, state } = useExchange(adapter, props)

	// 4. DOM-биндинг: контекст сам знает, есть ли у набора TElementPlugin, а
	// корень потребителю отдаёт тот же ref корня
	const root = useMemo(() => new TRootRef(adapter), [adapter])
	const consumer = consumerRefOf(props)

	// `ref` потребителя коммита — раньше, чем React привяжет ref узлов: ref
	// корня того же коммита отдаст узел уже ему, а отброшенный рендер ничего не
	// запишет
	useInsertionEffect(() => root.consume(consumer), [root, consumer])
	// Сменился только `ref` потребителя: ref корня тот же, и React его не
	// зовёт, — новый получает узел здесь, после привязки ref узлов
	useLayoutEffect(() => root.sync(), [root, consumer])

	const forwardProps = useMemo(() => binding.forward(props), [props, binding])

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		ref: root.attach,
		bindRef: root.bind,
		forwardProps,
		state: toInstanceState<C>(state),
	}
}

/**
 * Адаптер фасада коллекции — всё то же, кроме того, что принадлежит компоненту.
 *
 * У коллекционного компонента контекстов два: свой и фасада. Состояние, входы
 * и события у фасада те же, что у компонента, а `ctrl` и ref корня — нет:
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
