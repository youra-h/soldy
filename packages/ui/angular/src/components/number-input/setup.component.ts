import { NumberInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { INumberInput } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/** Ошибку, `id` и ссылки на части поле берёт от `Field` над собой (`TFieldControlExtension`). */
export function setupNumberInput(
	ctrl: INumberInput | undefined,
	props: object,
): TBinding<INumberInput> {
	const adapter = createAngularAdapterContext(NumberInputDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
