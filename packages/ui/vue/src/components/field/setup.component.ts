import { FieldDescriptor, TFieldExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	useIcon,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseField, { type FieldProps } from './base.component'

/**
 * Логики здесь нет: какие части видны, решает ядро, `id` частей, `for`
 * подписи и ссылки контрола на части — плагин связок. С контролом поле
 * связывает проводка: поле опускает связку по лифту, контрол её берёт своим
 * расширением.
 */
export default {
	name: '_Field',
	extends: BaseField,
	expose: useExpose(),
	setup(props: FieldProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(FieldDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TFieldExtension, { elevator: VueElevatorFactory })

		return { ...useAdapter(adapter, props, emit), errorIconTag: useIcon('error') }
	},
}
