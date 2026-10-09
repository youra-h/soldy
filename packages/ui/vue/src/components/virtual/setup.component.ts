import { TVirtualExtension, VirtualDescriptor } from '@soldy-ui/setup'
import {
	useAdapter,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseVirtual, { type VirtualProps } from './base.component'

/**
 * Окно для длинных списков: коллекции внутри (ListBox, Table) рисуют только
 * видимые элементы. Своего узла у компонента нет — один слот, как у
 * DragAndDrop; окно коллекциям опускает проводка обёртки по лифту.
 */
export default {
	name: '_Virtual',
	extends: BaseVirtual,
	setup(props: VirtualProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(VirtualDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TVirtualExtension, { elevator: VueElevatorFactory })

		return useAdapter(adapter, props, emit)
	},
}
