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
 * Общее с остальными адаптерами — в связке `bindComponent` из setup; здесь
 * только сигнал состояния и эмиттеры.
 *
 * Состояние — сигнал, а не поле + markForCheck(): markForCheck помечает путь
 * грязным, но не планирует проверку, поэтому работал только благодаря Zone.js.
 * Сигнал уведомляет шаблон сам и одинаково работает в zone- и zoneless-режиме.
 */

import { computed, signal, type EventEmitter, type Signal } from '@angular/core'
import { bindComponent, toInstanceState } from '@soldy/setup'
import type { IAdapterContext, TInstanceState } from '@soldy/setup'
import type { IPluginBundle } from '@soldy/plugins'
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

export function useAdapter<TInstance extends object = object>(
	adapter: IAdapterContext<TInstance>,
): TBinding<TInstance> {
	const binding = bindComponent(adapter, AngularProfile)
	const values = signal<Record<string, unknown>>(binding.state())

	const unbindOutput = binding.bindOutput(({ exportName }, value) => {
		values.update((prev) =>
			Object.is(prev[exportName], value) ? prev : { ...prev, [exportName]: value },
		)
	})

	return {
		state: computed(() => toInstanceState<TInstance>(values())),

		ctrl: adapter.instance,
		plugins: adapter.bundle,

		// ngOnChanges отдаёт дельту — только изменившиеся входы, поэтому
		// `writeChanged`: `writeAll` сбросил бы к умолчанию все остальные
		syncInputs(inputs: object): void {
			binding.writeChanged(inputs)
		},

		syncEvents(outputs: Record<string, EventEmitter<unknown>>): () => void {
			// Аутпут объявлен кодогенерацией по той же поверхности: у события
			// без аутпута некому отдать значение
			return binding.bindEvents((exportName, args) => outputs[exportName]?.emit(args[0]))
		},

		bindElement(el: Element | null): void {
			adapter.bindElement(el)
		},

		destroy(): void {
			unbindOutput()
			adapter.destroy()
		},
	}
}
