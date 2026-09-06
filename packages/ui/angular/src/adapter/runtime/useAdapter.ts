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

import { signal, type EventEmitter, type Signal } from '@angular/core'
import type { IAdapterContext } from '@soldy/setup'
import { TPluginsBindingExtension } from '@soldy/setup'
import { TElementPlugin } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import { createInspector } from '../common/createInspector'
import { buildInitialState, bindOutput, bindInput } from './useSyncProps'
import { bindEvents } from './useSyncEvents'

export type TBinding<TInstance = any> = {
	readonly state: Signal<Record<string, any>>
	readonly ctrl: TInstance
	readonly plugins: IPluginBundle
	syncInputs(inputs: Record<string, any>): void
	syncEvents(outputs: Record<string, EventEmitter<any>>): () => void
	bindElement(el: HTMLElement | null): void
	destroy(): void
}

export function useAdapter<TInstance = any>(adapter: IAdapterContext): TBinding<TInstance> {
	const inspector = createInspector(adapter.accessor)
	const state = signal<Record<string, any>>(buildInitialState(adapter.accessor, inspector))

	const unbindOutput = bindOutput(adapter.accessor, inspector, (name, value) => {
		state.update((prev) => (Object.is(prev[name], value) ? prev : { ...prev, [name]: value }))
	})

	return {
		state,

		ctrl: adapter.instance as TInstance,
		plugins: adapter.bundle,

		syncInputs(inputs: Record<string, any>): void {
			bindInput(adapter.accessor, inspector, inputs)
		},

		syncEvents(outputs: Record<string, EventEmitter<any>>): () => void {
			return bindEvents(adapter.accessor, inspector, outputs)
		},

		bindElement(el: HTMLElement | null): void {
			const plugin = adapter.bundle?.get(TElementPlugin)

			if (plugin) {
				plugin.element = el
			} else {
				adapter.get(TPluginsBindingExtension)?.bindElement(el ?? null)
			}
		},

		destroy(): void {
			unbindOutput()
			adapter.destroy()
		},
	}
}
