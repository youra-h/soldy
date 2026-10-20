import { DateInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	roleIcon,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseDateInput, { type DateInputProps } from './base.component'

/**
 * Логики здесь нет: части, их текст и наборы отдаёт ядро, клавиши, указатель и
 * буфер обмена ловят плагины поля на корне, очищает поле его команда `clear`.
 * Атрибуты снаружи падают на корень, как у любого компонента: поля ввода,
 * между которым их делить, у даты нет. Ошибку и ссылки на подпись и справку
 * даёт поле формы `Field` над ним — своим расширением.
 */
export default {
	name: '_DateInput',
	extends: BaseDateInput,
	expose: useExpose(),
	setup(props: DateInputProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(DateInputDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TFieldControlExtension, { elevator: VueElevatorFactory })

		return { ...useAdapter(adapter, props, emit), clearIconTag: roleIcon('close') }
	},
}
