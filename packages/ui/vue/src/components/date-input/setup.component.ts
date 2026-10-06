import { DateInputDescriptor } from '@soldy-ui/setup'
import { useAdapter, useIcon, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseDateInput, { type DateInputProps } from './base.component'

/**
 * Логики здесь нет: части, их текст и наборы отдаёт ядро, клавиши, указатель и
 * буфер обмена ловят плагины поля на корне, очищает поле его команда `clear`.
 * Атрибуты снаружи падают на корень, как у любого компонента: поля ввода,
 * между которым их делить, у даты нет.
 */
export default {
	name: '_DateInput',
	extends: BaseDateInput,
	setup(props: DateInputProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(DateInputDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return { ...useAdapter(adapter, props, emit), clearIconTag: useIcon('close') }
	},
}
