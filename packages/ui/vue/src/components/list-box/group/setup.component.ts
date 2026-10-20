import { ListBoxGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseListBoxGroup, { type ListBoxGroupProps } from './base.component'

/**
 * Группа списка входит в группировку коллекции списка: ключ группы —
 * элементам внутри, подпись — группировке. Отдаёт их проводка
 * (`TItemGroupExtension`).
 */
export default {
	name: '_ListBoxGroup',
	extends: BaseListBoxGroup,
	expose: useExpose(),
	setup(props: ListBoxGroupProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ListBoxGroupDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TItemGroupExtension, { elevator: VueElevatorFactory })

		return useAdapter(adapter, props, emit)
	},
}
