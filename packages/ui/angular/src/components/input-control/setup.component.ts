import { InputControlDescriptor } from '@soldy-ui/setup'
import type { IInputControl } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/** Значение слоя — любого типа: число у оценки, строка у поля. */
export function setupInputControl(
	ctrl: IInputControl<unknown> | undefined,
	props: object,
): TBinding<IInputControl<unknown>> {
	const adapter = createAngularAdapterContext(InputControlDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
