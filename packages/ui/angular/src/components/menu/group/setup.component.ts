import { MenuGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding } from '../../../adapter'

/** Ключ группировки пунктам — через слой лифта: `ngOnInit` группы идёт раньше их сборки. */
export function setupMenuGroup(ctrl: IItemGroup | undefined, props: object): TBinding<IItemGroup> {
	const adapter = createAngularAdapterContext(MenuGroupDescriptor(), { ctrl, props }).use(
		TItemGroupExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
