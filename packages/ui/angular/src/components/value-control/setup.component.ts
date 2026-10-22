import { ValueControlDescriptor } from '@soldy-ui/setup'
import type { IValueControl } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/** Значение слоя — любого типа: число у ползунка, ключ у пагинации. */
export function setupValueControl(
	ctrl: IValueControl<unknown> | undefined,
	props: object,
): TBinding<IValueControl<unknown>> {
	const adapter = createAngularAdapterContext(ValueControlDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
