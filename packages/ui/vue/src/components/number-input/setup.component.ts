import { NumberInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	extendBinding,
	useExpose,
	roleIcon,
	useSplitAttrs,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseNumberInput, { type NumberInputProps } from './base.component'

/**
 * Логики здесь нет: что набирается, решает ядро, правку браузера до него
 * доводит плагин набора, клавиши шага и кнопки шага с удержанием — свои
 * плагины на корне, очищает поле его команда `clear`. Атрибуты снаружи
 * делятся, как у Input: класс и стиль — корню, остальное — вводу. Ошибку,
 * `id` и ссылки на подпись и справку даёт поле формы `Field` над ним — своим
 * расширением.
 */
export default {
	name: '_NumberInput',
	inheritAttrs: false,
	extends: BaseNumberInput,
	expose: useExpose(),
	setup(props: NumberInputProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(NumberInputDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TFieldControlExtension, { elevator: VueElevatorFactory })

		return extendBinding(useAdapter(adapter, props, emit), {
			...useSplitAttrs(),
			clearIconTag: roleIcon('close'),
			minusIconTag: roleIcon('minus'),
			plusIconTag: roleIcon('plus'),
		})
	},
}
