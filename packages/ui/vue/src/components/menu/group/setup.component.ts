import { MenuGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseMenuGroup, { type MenuGroupProps } from './base.component'

/**
 * Группа меню входит в группировку коллекции меню: ключ группы — пунктам
 * внутри, подпись — группировке. Отдаёт их проводка (`TItemGroupExtension`).
 */
export default {
	name: '_MenuGroup',
	extends: BaseMenuGroup,
	expose: useExpose(),
	setup(props: MenuGroupProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(MenuGroupDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TItemGroupExtension, { elevator: VueElevatorFactory })

		return useAdapter(adapter, props, emit)
	},
}
