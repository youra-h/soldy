import { CheckBoxDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ICheckBox } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/** Поле формы `Field` над флажком связывает расширение `TFieldControlExtension`. */
export function setupCheckBox(ctrl: ICheckBox | undefined, props: object): TBinding<ICheckBox> {
	const adapter = createAngularAdapterContext(CheckBoxDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
