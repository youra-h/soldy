import { LabelDescriptor } from '@soldy-ui/setup'
import type { ILabel } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupLabel(
	host: HTMLElement,
	ctrl: ILabel | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ILabel> {
	const adapter = createWebcAdapterContext(host, LabelDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
