/**
 * useAdapter — основной Angular runtime-слой (аналог useAdapter в React/Vue).
 *
 * Принимает ГОТОВЫЙ adapter-context и возвращает TBinding:
 *
 * - state: сигнал с текущими значениями props из Core
 * - компонент принят (`adapter.attach()`) сразу при создании связки
 * - syncInputs(inputs): Angular → Core, только изменившиеся входы (вызывается из
 *   ngOnChanges)
 * - syncEvents(outputOf): Core → Angular, приёмник событий ядра; событие уходит
 *   в эмиттер выхода, если выход уже завёл его (`outputOf`)
 * - bindElement(el): DOM-биндинг для TElementPlugin
 * - destroy(): очистка подписок + adapter.destroy()
 *
 * Общее с остальными адаптерами — в обмене `adapter.connect()` из setup; здесь
 * только сигнал состояния и отдача событий эмиттерам выходов.
 *
 * Состояние — сигнал, а не поле + markForCheck(): markForCheck помечает путь
 * грязным, но не планирует проверку, поэтому работал только благодаря Zone.js.
 * Сигнал уведомляет шаблон сам и одинаково работает в zone- и zoneless-режиме.
 */

import { computed, signal, type EventEmitter, type Signal } from '@angular/core'
import { toInstanceState } from '@soldy-ui/setup'
import type {
	DescriptorAllEvents,
	DescriptorComponentProps,
	IAdapterContext,
	IComponentContract,
	IComponentDescriptor,
	TStateSnapshot,
	TInstanceState,
} from '@soldy-ui/setup'
import type { IPluginBundle } from '@soldy-ui/plugins'
import { AngularProfile } from '../common/profile'

/**
 * Вход по пропу дескриптора: тип его значения.
 *
 * Входы объявлены массивом имён, и значение входа Angular пишет в
 * одноимённое свойство инстанса. Строгая проверка шаблона сверяет привязку
 * `[text]="…"` с полем класса, а вход без поля пропускает молча. Поля
 * объявляет сгенерированный `T<Имя>Surface` (`generated/*.metadata.ts`) — по
 * фабрике дескриптора и имени из того же массива: свой проп, проп плагина
 * (`aria_label`) или служебный адаптера (`embedded`, `pluginProps`), как их
 * сводит `DescriptorComponentProps`. Имя вне пропсов дескриптора не
 * компилируется.
 */
export type TInputValue<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInput extends keyof DescriptorComponentProps<TDescriptorFn>,
> = DescriptorComponentProps<TDescriptorFn>[TInput]

/**
 * Что отдаёт выход — первый аргумент события ядра: `syncEvents` шлёт
 * `emit(args[0])`. У события без аргументов — `undefined`.
 */
type TOutputValue<THandler> = THandler extends (...args: infer TArgs) => unknown
	? TArgs extends readonly []
		? undefined
		: TArgs[0]
	: undefined

/**
 * Выход по событию дескриптора: эмиттер того, что шлёт `syncEvents`.
 *
 * Строгая проверка шаблона читает выход как свойство класса: привязка
 * `(actionPress)` без него не компилируется, а `$event` берёт тип у него. Выход
 * с этим типом — геттер сгенерированного `T<Имя>Surface`
 * (`generated/*.metadata.ts`) по фабрике дескриптора и полному имени события,
 * которые кодогенератор берёт из той же поверхности, что имена выходов; эмиттер
 * геттер заводит при первом чтении (`TComponentBase.createOutput`). Событие вне
 * карты дескриптора (`DescriptorAllEvents`) не компилируется.
 */
export type TOutputEmitter<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TEvent extends keyof DescriptorAllEvents<TDescriptorFn>,
> = EventEmitter<TOutputValue<DescriptorAllEvents<TDescriptorFn>[TEvent]>>

export type TBinding<TInstance = any> = {
	/** Свойства инстанса со снимком через `valueOf()` — см. `TInstanceState`. */
	readonly state: Signal<TInstanceState<TInstance>>
	readonly ctrl: TInstance
	readonly plugins: IPluginBundle | null
	syncInputs(inputs: object): void
	/**
	 * Ставит приёмник событий ядра. `outputOf` — эмиттер выхода по имени, если
	 * выход его уже завёл, иначе `undefined`; эмиттеров сам поиск не заводит.
	 * Возвращает отписку приёмника.
	 */
	syncEvents(outputOf: (name: string) => EventEmitter<unknown> | undefined): () => void
	bindElement(el: Element | null): void
	destroy(): void
}

export function useAdapter<C extends IComponentContract>(
	adapter: IAdapterContext<C>,
): TBinding<C['instance']> {
	const binding = adapter.connect(AngularProfile)
	const values = signal<TStateSnapshot>({})

	// Снимок связки неизменяемый и заменяется на каждое изменение: сигнал
	// получает его целиком. Подписка сразу отдаёт каждое свойство тем же
	// вызовом, что и триггер: так сигнал и заполняется
	const unsubscribe = binding.state.subscribe(() => values.set(binding.state.getSnapshot()))

	// Компонент принят: связку заводит `ngOnInit`, отброшенных сборок у
	// Angular нет
	adapter.attach()

	return {
		state: computed(() => toInstanceState<C>(values())),

		ctrl: adapter.instance,
		plugins: adapter.bundle,

		// ngOnChanges отдаёт дельту — только изменившиеся входы, поэтому
		// `inputs.delta`: `inputs.full` сбросил бы к умолчанию все остальные
		syncInputs(inputs: object): void {
			binding.inputs.delta(inputs)
		},

		syncEvents(outputOf: (name: string) => EventEmitter<unknown> | undefined): () => void {
			// Эмиттер ищется на каждое событие, а не один раз: его заводит первое
			// чтение выхода, и подписка из кода после монтирования получает
			// события с этого момента. Выход никто не читал — отдавать некому.
			// Отдаётся первый аргумент — его и обещает тип выхода (`TOutputEmitter`)
			return binding.events.listen((exportName, args) => outputOf(exportName)?.emit(args[0]))
		},

		bindElement(el: Element | null): void {
			adapter.bindElement(el)
		},

		destroy(): void {
			unsubscribe()
			adapter.destroy()
		},
	}
}
