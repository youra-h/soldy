import {
	MenuRadioGroupDescriptor,
	TItemGroupExtension,
	TMenuRadioGroupExtension,
} from '@soldy-ui/setup'
import type { IMenuRadioGroup } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding } from '../../../adapter'

/** Группа переключателей — группа меню, которая ещё опускает себя переключателям. */
export function setupMenuRadioGroup(
	ctrl: IMenuRadioGroup | undefined,
	props: object,
): TBinding<IMenuRadioGroup> {
	const adapter = createAngularAdapterContext(MenuRadioGroupDescriptor(), { ctrl, props })
		.use(TItemGroupExtension, { elevator: AngularElevatorFactory })
		.use(TMenuRadioGroupExtension, { elevator: AngularElevatorFactory })

	return useAdapter(adapter)
}
