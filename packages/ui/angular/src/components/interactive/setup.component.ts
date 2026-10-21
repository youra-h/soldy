import { InteractiveDescriptor } from '@soldy-ui/setup'
import type { IInteractive } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupInteractive — setup-слой Interactive: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 * Своего компонента у слоя нет, как у Control: на нём стоят Slider, Rating,
 * Scroller и Pagination.
 */
export function setupInteractive(
	ctrl: IInteractive | undefined,
	props: object,
): TBinding<IInteractive> {
	const adapter = createAngularAdapterContext(InteractiveDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
