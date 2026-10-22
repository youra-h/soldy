/**
 * setupDateInput — setup-слой DateInput.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда, а от
 * него плагин связок строит `id` частей. Так же — приёмник корня (`receive`):
 * запись в связываемый проп `ref` компонента, `$bindable` компилятор тоже
 * пускает только в компонент.
 *
 * Логики здесь нет: части, их текст и наборы отдаёт ядро, клавиши, указатель,
 * буфер обмена и касание ловят плагины поля на корне, очищает поле его
 * команда `clear`.
 *
 * Поле формы `Field` над полем: ошибку и ссылки на подпись и справку поле
 * берёт от него своим расширением (`TFieldControlExtension`) лифтом
 * (`getContext`), а своему содержимому опускает пустую связку
 * (`setContext`): контролы в его слотах — его содержимое. Деталь чужой
 * разметки — поля DatePicker (`embedded`) — связку не берёт: её взял
 * DatePicker.
 */

import { DateInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { DateInputProps } from './base.component'

export function setupDateInput(
	getProps: () => DateInputProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(DateInputDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldControlExtension, { elevator })

	// Формат — по локали поддерева (плагин языка), имя кнопки очистки —
	// плагин имён поля, `id` частей — плагин связок
	return useAdapter(adapter, getProps, receive)
}
