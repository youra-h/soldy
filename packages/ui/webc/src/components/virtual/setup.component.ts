import { TVirtualExtension, VirtualDescriptor } from '@soldy-ui/setup'
import type { IVirtual } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

/** Окно опускается лифтом хоста; ListBox и Table в свете находят его вверх по документу. */
export function setupVirtual(
	host: HTMLElement,
	ctrl: IVirtual | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IVirtual> {
	const adapter = createWebcAdapterContext(host, VirtualDescriptor(), { ctrl, props }).use(
		TVirtualExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
