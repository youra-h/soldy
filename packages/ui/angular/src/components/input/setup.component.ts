import { InputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { IInput } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/** Поле формы `Field` над полем связывает расширение `TFieldControlExtension`. */
export function setupInput(ctrl: IInput | undefined, props: object): TBinding<IInput> {
	const adapter = createAngularAdapterContext(InputDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
