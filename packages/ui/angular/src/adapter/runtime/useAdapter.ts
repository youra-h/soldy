/**
 * useAdapter — связка adapter-context с Angular, аналог `useAdapter` у Vue.
 *
 * - состояние — сигнал: он уведомляет шаблон сам, с Zone.js и без;
 * - компонент принят (`attach()`) сразу при создании связки;
 * - `syncInputs` — дельта `ngOnChanges`, `syncEvents` — события ядра в
 *   эмиттеры выходов, `destroy` — очистка.
 *
 * У коллекционного компонента контекстов два — свой и фасада (у пункта с
 * подменю три), а базе нужна одна связка: их сводит `joinBindings`. AGENTS.md
 * (Angular), «Коллекция: два контекста — одна связка».
 */

import { computed, signal, type EventEmitter, type Signal } from '@angular/core'
import { toInstanceState } from '@soldy-ui/setup'
import type {
	DescriptorAllEvents,
	DescriptorComponentProps,
	IAdapterContext,
	IComponentContract,
	IComponentDescriptor,
	TAdapterState,
	TStateSnapshot,
	TInstanceState,
} from '@soldy-ui/setup'
import { AngularProfile } from '../common/profile'

/**
 * Тип входа по пропу дескриптора — поле входа в сгенерированной
 * `T<Имя>Surface`: строгий шаблон сверяет привязку с ним.
 */
export type TInputValue<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInput extends keyof DescriptorComponentProps<TDescriptorFn>,
> = DescriptorComponentProps<TDescriptorFn>[TInput]

/** Первый аргумент события ядра — его шлёт `syncEvents`. */
type TOutputValue<THandler> = THandler extends (...args: infer TArgs) => unknown
	? TArgs extends readonly []
		? undefined
		: TArgs[0]
	: undefined

/** Тип выхода по событию дескриптора — геттер в сгенерированной `T<Имя>Surface`. */
export type TOutputEmitter<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TEvent extends keyof DescriptorAllEvents<TDescriptorFn>,
> = EventEmitter<TOutputValue<DescriptorAllEvents<TDescriptorFn>[TEvent]>>

/**
 * Состояние, как его читает шаблон: свойства инстанса, выходы плагинов и
 * свойства фасадов. Одноимённых у них нет — имена фасадов и плагинов
 * префиксуются.
 */
export type TBindingState<
	TInstance,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
> = TInstanceState<TInstance> &
	TInstanceState<TFacade> &
	TInstanceState<TOutputs> &
	TInstanceState<TOwnerFacade>

/** Заведённый эмиттер выхода по имени, иначе `undefined`. */
export type TOutputOf = (name: string) => EventEmitter<unknown> | undefined

/** Связка одного контекста. */
type TExchange<TState> = {
	readonly state: Signal<TState>
	syncInputs(inputs: object): void
	/** Возвращает отписку. */
	syncEvents(outputOf: TOutputOf): () => void
	destroy(): void
}

/** Связка компонента для базы; у компонента с фасадом её собирает `joinBindings`. */
export type TBinding<
	TInstance = any,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
> = TExchange<TBindingState<TInstance, TFacade, TOutputs, TOwnerFacade>> & {
	readonly ctrl: TInstance
	/** Фасад коллекции; у пункта с подменю — фасад элемента в коллекции над ним. */
	readonly facade: TFacade
	bindElement(el: Element | null): void
}

/** Связка фасада: без `ctrl` и узла — они у компонента. */
export type TCollectionBinding<TFacade = any> = TExchange<TInstanceState<TFacade>> & {
	readonly facade: TFacade
}

function useExchange<C extends IComponentContract>(
	adapter: IAdapterContext<C>,
): TExchange<TAdapterState<C>> {
	const binding = adapter.connect(AngularProfile)
	const values = signal<TStateSnapshot>({})
	const unsubscribe = binding.state.subscribe(() => values.set(binding.state.getSnapshot()))

	// Связку заводит `ngOnInit`, и на сервере тоже: хуки идут в порядке
	// шаблона, и элементы разметки входят в коллекцию в порядке DOM
	adapter.attach()

	return {
		state: computed(() => toInstanceState<C>(values())),

		// Дельта, а не `full`: тот сбросил бы к умолчанию остальные входы
		syncInputs(inputs: object): void {
			binding.inputs.delta(inputs)
		},

		// Эмиттер ищется на каждое событие: его заводит первое чтение выхода
		syncEvents(outputOf: TOutputOf): () => void {
			return binding.events.listen((exportName, args) => outputOf(exportName)?.emit(args[0]))
		},

		destroy(): void {
			unsubscribe()
			adapter.destroy()
		},
	}
}

export function useAdapter<C extends IComponentContract>(
	adapter: IAdapterContext<C>,
): TBinding<C['instance'], unknown, C['plugins']['outputs']> {
	return {
		...useExchange(adapter),
		ctrl: adapter.instance,
		facade: undefined,
		bindElement: (el) => adapter.bindElement(el),
	}
}

export function useCollectionAdapter<C extends IComponentContract>(
	adapter: IAdapterContext<C>,
): TCollectionBinding<C['instance']> {
	return { ...useExchange(adapter), facade: adapter.instance }
}

/**
 * Одна связка из своей и фасадов: состояние — одним видом, входы и события —
 * всем, узел — только свой, уничтожение — фасады раньше компонента: элемент
 * выходит из коллекции, пока его набор плагинов цел.
 */
export function joinBindings<TInstance, TFacade, TOutputs, TOwnerFacade = unknown>(
	owner: TBinding<TInstance, unknown, TOutputs>,
	facade: TCollectionBinding<TFacade>,
	ownerFacade?: TCollectionBinding<TOwnerFacade>,
): TBinding<TInstance, TFacade, TOutputs, TOwnerFacade> {
	// По порядку уничтожения: элемент выходит из коллекции над ним раньше своей
	const facades: readonly TExchange<unknown>[] = ownerFacade ? [facade, ownerFacade] : [facade]

	return {
		state: computed(() => ({ ...ownerFacade?.state(), ...facade.state(), ...owner.state() })),
		ctrl: owner.ctrl,
		facade: facade.facade,

		syncInputs(inputs: object): void {
			owner.syncInputs(inputs)

			for (const each of facades) each.syncInputs(inputs)
		},

		syncEvents(outputOf: TOutputOf): () => void {
			const stops = [owner, ...facades].map((each) => each.syncEvents(outputOf))

			return () => {
				for (const stop of stops) stop()
			}
		},

		bindElement: (el) => owner.bindElement(el),

		destroy(): void {
			for (const each of facades) each.destroy()

			owner.destroy()
		},
	}
}
