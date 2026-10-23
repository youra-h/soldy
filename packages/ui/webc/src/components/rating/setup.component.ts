import { RatingDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { IRating } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupRating(
	host: HTMLElement,
	ctrl: IRating | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IRating> {
	const adapter = createWebcAdapterContext(host, RatingDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
