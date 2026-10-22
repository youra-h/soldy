/**
 * setupNumberInput — setup-слой NumberInput.
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
 * Логики здесь нет: что набирается, решает ядро, правку браузера до него
 * доводит плагин набора, клавиши шага и кнопки шага с удержанием — свои
 * плагины на корне, очищает поле его команда `clear`.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) лифтом
 * (`getContext`), а своему содержимому опускает пустую связку
 * (`setContext`): контролы в его слотах — его содержимое.
 */

import { NumberInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { NumberInputProps } from './base.component'

export function setupNumberInput(
	getProps: () => NumberInputProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(NumberInputDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldControlExtension, { elevator })

	// Текст и формат — по локали поддерева (плагин языка), имена кнопок
	// очистки и шага — плагин имён поля
	return useAdapter(adapter, getProps, receive)
}
