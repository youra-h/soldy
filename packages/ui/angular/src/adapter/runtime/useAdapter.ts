/**
 * useAdapter — основной Angular runtime-слой (аналог useAdapter в React/Vue).
 *
 * Принимает ГОТОВЫЙ adapter-context и возвращает TBinding:
 *
 * - state: сигнал с текущими значениями props из Core
 * - syncInputs(inputs): Angular → Core, только изменившиеся входы (вызывается из
 *   ngOnChanges)
 * - syncEvents(outputs): подписывает Angular EventEmitter'ы на Core-события
 * - bindElement(el): DOM-биндинг для TElementPlugin
 * - destroy(): очистка подписок + adapter.destroy()
 *
 * Общее с остальными адаптерами — в обмене `adapter.connect()` из setup; здесь
 * только сигнал состояния и эмиттеры.
 *
 * Состояние — сигнал, а не поле + markForCheck(): markForCheck помечает путь
 * грязным, но не планирует проверку, поэтому работал только благодаря Zone.js.
 * Сигнал уведомляет шаблон сам и одинаково работает в zone- и zoneless-режиме.
 */

import { computed, signal, type EventEmitter, type Signal } from '@angular/core'
import { toInstanceState } from '@soldy-ui/setup'
import type {
	IAdapterContext,
	IComponentContract,
	TStateSnapshot,
	TInstanceState,
} from '@soldy-ui/setup'
import type { IPluginBundle } from '@soldy-ui/plugins'
import { AngularProfile } from '../common/profile'

export type TBinding<TInstance = any> = {
	/** Свойства инстанса со снимком через `valueOf()` — см. `TInstanceState`. */
	readonly state: Signal<TInstanceState<TInstance>>
	readonly ctrl: TInstance
	readonly plugins: IPluginBundle | null
	syncInputs(inputs: object): void
	syncEvents(outputs: Record<string, EventEmitter<unknown>>): () => void
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

	return {
		state: computed(() => toInstanceState<C>(values())),

		ctrl: adapter.instance,
		plugins: adapter.bundle,

		// ngOnChanges отдаёт дельту — только изменившиеся входы, поэтому
		// `writeChanged`: `writeAll` сбросил бы к умолчанию все остальные
		syncInputs(inputs: object): void {
			binding.inputs.delta(inputs)
		},

		syncEvents(outputs: Record<string, EventEmitter<unknown>>): () => void {
			// Аутпут объявлен кодогенерацией по той же поверхности: у события
			// без аутпута некому отдать значение
			return binding.events.listen((exportName, args) => outputs[exportName]?.emit(args[0]))
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
