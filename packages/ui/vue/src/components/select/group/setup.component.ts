import { SelectGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseSelectGroup, { type SelectGroupProps } from './base.component'

/**
 * Группа опций входит в группировку коллекции Select: ключ группы — опциям
 * внутри, подпись — группировке. Отдаёт их проводка (`TItemGroupExtension`).
 */
export default {
	name: '_SelectGroup',
	extends: BaseSelectGroup,
	expose: useExpose(),
	setup(props: SelectGroupProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(SelectGroupDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TItemGroupExtension, { elevator: VueElevatorFactory })

		return useAdapter(adapter, props, emit)
	},
}
