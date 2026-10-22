import { SwitchDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ISwitch } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/** Поле формы `Field` над переключателем связывает расширение `TFieldControlExtension`. */
export function setupSwitch(ctrl: ISwitch | undefined, props: object): TBinding<ISwitch> {
	const adapter = createAngularAdapterContext(SwitchDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
