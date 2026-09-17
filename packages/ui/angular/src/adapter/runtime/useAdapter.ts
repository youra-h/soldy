/**
 * useAdapter — основной Angular runtime-слой (аналог useAdapter в React/Vue).
 *
 * Принимает ГОТОВЫЙ adapter-context и возвращает TBinding:
 *
 * - state: сигнал с текущими значениями props из Core
 * - syncInputs(inputs): Angular → Core (вызывается из ngOnChanges / ngOnInit)
 * - syncEvents(outputs): подписывает Angular EventEmitter'ы на Core-события
 * - bindElement(el): DOM-биндинг для TElementPlugin
 * - destroy(): очистка подписок + adapter.destroy()
 *
 * Состояние — сигнал, а не поле + markForCheck(): markForCheck помечает путь
 * грязным, но не планирует проверку, поэтому работал только благодаря Zone.js.
 * Сигнал уведомляет шаблон сам и одинаково работает в zone- и zoneless-режиме.
 */

import { computed, signal, type EventEmitter, type Signal } from '@angular/core'
import { toInstanceState } from '@soldy/setup'
import type { IAdapterContext, TInstanceState } from '@soldy/setup'
import type { IPluginBundle } from '@soldy/plugins'
import { createInspector } from '../common/createInspector'
import { buildInitialState, bindOutput, bindInput } from './useSyncProps'
import { bindEvents } from './useSyncEvents'

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
	const inspector = createInspector(adapter.accessor)
	const values = signal<Record<string, unknown>>(buildInitialState(adapter.accessor, inspector))

	const unbindOutput = bindOutput(adapter.accessor, inspector, (name, value) => {
		values.update((prev) => (Object.is(prev[name], value) ? prev : { ...prev, [name]: value }))
	})

	return {
		state: computed(() => toInstanceState<TInstance>(values())),

		ctrl: adapter.instance,
		plugins: adapter.bundle,

		syncInputs(inputs: object): void {
			bindInput(adapter.accessor, inspector, inputs)
		},

		syncEvents(outputs: Record<string, EventEmitter<unknown>>): () => void {
			return bindEvents(adapter.accessor, inspector, outputs)
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
