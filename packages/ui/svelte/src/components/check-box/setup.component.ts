/**
 * setupCheckBox — setup-слой CheckBox.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда. Так
 * же — приёмник корня (`receive`): запись в связываемый проп `ref`
 * компонента, `$bindable` компилятор тоже пускает только в компонент.
 *
 * Поле формы `Field` над флажком: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) лифтом
 * (`getContext`), а своему содержимому опускает пустую связку
 * (`setContext`): контролы в его слотах — его содержимое.
 */

import { CheckBoxDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { CheckBoxProps } from './base.component'

export function setupCheckBox(
	getProps: () => CheckBoxProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(CheckBoxDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldControlExtension, { elevator })

	// Переключает значение плагин флажка по `change` поля; отметку и «выбрано
	// частично» разметка пишет свойствами `<input>`
	return useAdapter(adapter, getProps, receive)
}
