import { ValueControlDescriptor } from '@soldy-ui/setup'
import type { IValueControl } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

/** Тип значения сужает наследник: ползунок — числом или их списком, пагинация — ключом. */
export function setupValueControl(
	host: HTMLElement,
	ctrl: IValueControl<unknown> | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IValueControl<unknown>> {
	const adapter = createWebcAdapterContext(host, ValueControlDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
