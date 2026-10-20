import {
	MenuRadioGroupDescriptor,
	TItemGroupExtension,
	TMenuRadioGroupExtension,
} from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseMenuRadioGroup, { type MenuRadioGroupProps } from './base.component'

/**
 * Группа переключателей — та же группа меню и своё значение. Как группа меню,
 * она входит в группировку коллекции меню (`TItemGroupExtension`); себя
 * переключателям внутри опускает проводкой (`TMenuRadioGroupExtension`), а
 * что в группе отмечен один, держит коллекция меню.
 */
export default {
	name: '_MenuRadioGroup',
	extends: BaseMenuRadioGroup,
	expose: useExpose(),
	setup(props: MenuRadioGroupProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(MenuRadioGroupDescriptor(), {
			ctrl: props.ctrl,
			props,
		})
			.use(TItemGroupExtension, { elevator: VueElevatorFactory })
			.use(TMenuRadioGroupExtension, { elevator: VueElevatorFactory })

		return useAdapter(adapter, props, emit)
	},
}
