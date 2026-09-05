/**
 * useAdapter — основной Angular runtime-слой (аналог useAdapter в React/Vue).
 *
 * Принимает ГОТОВЫЙ adapter-context и ChangeDetectorRef.
 * Возвращает TAngularBinding — объект с состоянием и методами жизненного цикла:
 *
 * - state: текущие значения props из Core (обновляется через markForCheck)
 * - syncInputs(inputs): Angular → Core (вызывается из ngOnChanges / ngOnInit)
 * - syncEvents(outputs): подписывает Angular EventEmitter'ы на Core-события
 * - bindElement(el): DOM-биндинг для TElementPlugin
 * - destroy(): очистка подписок + adapter.destroy()
 */

import type { ChangeDetectorRef, EventEmitter } from '@angular/core'
import type { IAdapterContext } from '@soldy/setup'
import { TPluginsBindingExtension } from '@soldy/setup'
import { TElementPlugin } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import { createInspector } from '../common/createInspector'
import { buildInitialState, bindOutput, bindInput } from './useSyncProps'
import { bindEvents } from './useSyncEvents'

export type TAngularBinding<TInstance = any> = {
	readonly state: Record<string, any>
	readonly ctrl: TInstance
	readonly plugins: IPluginBundle
	syncInputs(inputs: Record<string, any>): void
	syncEvents(outputs: Record<string, EventEmitter<any>>): () => void
	bindElement(el: HTMLElement | null): void
	destroy(): void
}

export function useAdapter<TInstance = any>(
	adapter: IAdapterContext,
	cdr: ChangeDetectorRef,
): TAngularBinding<TInstance> {
	const inspector = createInspector(adapter.accessor)
	let _state = buildInitialState(adapter.accessor, inspector)

	const unbindOutput = bindOutput(adapter.accessor, inspector, (name, value) => {
		if (!Object.is(_state[name], value)) {
			_state = { ..._state, [name]: value }
			cdr.markForCheck()
		}
	})

	return {
		get state() {
			return _state
		},

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
