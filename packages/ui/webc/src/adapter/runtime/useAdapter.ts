/**
 * Связка Web Components над готовым adapter-context. Реактивности у платформы
 * нет: состояние — обычный объект, об изменении сообщает `onUpdate`, а
 * перерисовку планирует база элемента. События ядра — `CustomEvent` на
 * элементе; у разметки владельца они не всплывают. AGENTS.md (Web
 * Components), «Связка».
 */

import { TActionEvent } from '@soldy-ui/core'
import { toInstanceState } from '@soldy-ui/setup'
import type {
	IAdapterContext,
	IComponentContract,
	TAdapterState,
	TInstanceState,
} from '@soldy-ui/setup'
import { WebcProfile } from '../common'
import { isOwnerMarkup } from './marks'

/**
 * Свойства инстанса с выходами плагинов и свойства фасадов. Выходы — одним
 * видом с инстансом, фасад владельца — с фасадом: из пересечения трёх видов
 * TypeScript не выводит инстанс по ожидаемому типу контекста шаблона.
 */
export type TBindingState<
	TInstance,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
> = TInstanceState<TInstance & TOutputs> & TInstanceState<TFacade & TOwnerFacade>

/** `TFacade` — фасад коллекции, через его контекст шаблон зовёт команды коллекции. */
export type TBinding<
	TInstance = object,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
> = {
	readonly state: TBindingState<TInstance, TFacade, TOutputs, TOwnerFacade>
	readonly ctrl: TInstance
	readonly facade: TFacade
	syncProps(props: object): void
	bindElement(el: Element | null): void
	destroy(): void
}

/** Связка фасада: `ctrl` и узел принадлежат компоненту, а не фасаду. */
export type TCollectionBinding<TFacade = object> = {
	readonly state: TInstanceState<TFacade>
	readonly facade: TFacade
	syncProps(props: object): void
	destroy(): void
}

export type TUpdateListener = (name: string, value: unknown) => void

type TExchange<C extends IComponentContract> = {
	readonly state: TAdapterState<C>
	syncProps(props: object): void
	destroy(): void
}

type TJoined = {
	readonly state: Readonly<Record<string, unknown>>
	syncProps(props: object): void
	destroy(): void
}

/** Событие «до» (аргумент `TActionEvent`) отменяемо: отменённое отменяет событие ядра. */
function dispatch(
	host: HTMLElement,
	name: string,
	args: readonly unknown[],
	bubbles: boolean,
): void {
	const detail = args.length > 1 ? args : args[0]
	const action = detail instanceof TActionEvent ? detail : undefined
	const event = new CustomEvent(name, {
		detail,
		bubbles,
		composed: true,
		cancelable: action !== undefined,
	})

	if (!host.dispatchEvent(event)) action?.preventDefault()
}

function useExchange<C extends IComponentContract>(
	adapter: IAdapterContext<C>,
	host: HTMLElement,
	onUpdate: TUpdateListener,
): TExchange<C> {
	const binding = adapter.connect(WebcProfile)
	const bubbles = !isOwnerMarkup(host)
	const state: Record<string, unknown> = {}

	// Подписка сразу отдаёт значение каждого свойства — так состояние и заполняется
	const unsubscribe = binding.state.subscribe((name, value) => {
		state[name] = value
		onUpdate(name, value)
	})

	const unbindEvents = binding.events.listen((exportName, args) => {
		dispatch(host, exportName, args, bubbles)
	})

	// Отброшенных сборок у Web Components нет: связку заводит подключение
	adapter.attach()

	return {
		state: toInstanceState<C>(state),

		// Дельта, а не `full`: элемент отдаёт по одному атрибуту или свойству
		syncProps(props: object): void {
			binding.inputs.delta(props)
		},

		destroy(): void {
			unsubscribe()
			unbindEvents()
			adapter.destroy()
		},
	}
}

export function useAdapter<C extends IComponentContract>(
	adapter: IAdapterContext<C>,
	host: HTMLElement,
	onUpdate: TUpdateListener,
): TBinding<C['instance'], unknown, C['plugins']['outputs']> {
	return {
		...useExchange(adapter, host, onUpdate),
		ctrl: adapter.instance,
		facade: undefined,

		bindElement(el: Element | null): void {
			adapter.bindElement(el)
		},
	}
}

export function useCollectionAdapter<C extends IComponentContract>(
	adapter: IAdapterContext<C>,
	host: HTMLElement,
	onUpdate: TUpdateListener,
): TCollectionBinding<C['instance']> {
	return {
		...useExchange(adapter, host, onUpdate),
		facade: adapter.instance,
	}
}

/**
 * Живой вид нескольких состояний: свойство — из первого, где оно есть. Ключи
 * заполнила подписка при сборке, новых не появляется, значения читаются в
 * момент обращения.
 */
function joinStates(
	states: readonly Readonly<Record<string, unknown>>[],
): Readonly<Record<string, unknown>> {
	const view: Record<string, unknown> = {}

	for (const name of new Set(states.flatMap((state) => Object.keys(state)))) {
		Object.defineProperty(view, name, {
			enumerable: true,
			get: () => {
				for (const state of states) if (Object.hasOwn(state, name)) return state[name]

				return undefined
			},
		})
	}

	return view
}

/** Граница рантайма и типа, как `toInstanceState`: связь имён держат дескрипторы. */
function toBindingState<TInstance, TFacade, TOutputs, TOwnerFacade>(
	view: Readonly<Record<string, unknown>>,
): TBindingState<TInstance, TFacade, TOutputs, TOwnerFacade> {
	return view as TBindingState<TInstance, TFacade, TOutputs, TOwnerFacade>
}

/**
 * Одна связка из двух или трёх контекстов: свой, фасад элемента и, у пункта с
 * подменю, фасад своей коллекции. Узел — только свой; фасады уничтожаются
 * раньше компонента, пока его набор плагинов цел.
 */
export function joinBindings<TInstance, TFacade, TOutputs, TOwnerFacade = unknown>(
	owner: TBinding<TInstance, unknown, TOutputs>,
	facade: TCollectionBinding<TFacade>,
	ownerFacade?: TCollectionBinding<TOwnerFacade>,
): TBinding<TInstance, TFacade, TOutputs, TOwnerFacade> {
	const facades: TJoined[] = ownerFacade ? [facade, ownerFacade] : [facade]
	const ownerState: Readonly<Record<string, unknown>> = owner.state

	return {
		state: toBindingState<TInstance, TFacade, TOutputs, TOwnerFacade>(
			joinStates([ownerState, ...facades.map((each) => each.state)]),
		),
		ctrl: owner.ctrl,
		facade: facade.facade,

		syncProps(props: object): void {
			owner.syncProps(props)

			for (const each of facades) each.syncProps(props)
		},

		bindElement(el: Element | null): void {
			owner.bindElement(el)
		},

		destroy(): void {
			for (const each of facades) each.destroy()

			owner.destroy()
		},
	}
}
