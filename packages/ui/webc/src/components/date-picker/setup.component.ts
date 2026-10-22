/**
 * setupDatePicker — setup-слой DatePicker.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента: её DatePicker отдаёт полям и
 * календарю, а плагин имён пишет имена кнопок, панели и концов диапазона и
 * текст кнопок подвала) и связывает его с элементом через useAdapter. Логики
 * здесь нет: общее полям и календарю, значение, открытость и подтверждение
 * выбора держит ядро DatePicker, очищает его команда `clear`, кнопку
 * календаря и Alt+↓ ловит плагин открытия, нажатие мимо — `TDismissPlugin`,
 * фокус панели — плагин фокуса, жест — `TSwipePlugin`. Шаблон раскладывает то,
 * что они отдали: выход `dismiss_ownerAttribute` — пометкой на панель.
 *
 * Поля, календарь и движок его коллекции — экземпляры ядра на всю жизнь
 * DatePicker: шаблон отдаёт их деталям целиком (`ctrl`, `engine`), как Select —
 * экземпляр поля своей детали Input.
 *
 * Поле формы `Field` над DatePicker связывается с ним, а не с его полями: поля
 * — детали его разметки (`embedded`), и связку поля формы они не берут. Связку
 * берёт расширение DatePicker (`TFieldControlExtension`) вверх по документу, а
 * своему содержимому опускает пустую своим хостом.
 */

import {
	DatePickerDescriptor,
	TFieldControlExtension,
	type DescriptorAllProps,
	type DescriptorPluginOutputs,
} from '@soldy-ui/setup'
import type { IDatePicker } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

/**
 * Что шаблон DatePicker читает в состоянии сверх инстанса: выходы плагинов —
 * пометку панели владельцем, имена концов диапазона и текст кнопок подвала, —
 * и имя DatePicker — пропсы плагина имени (`aria_label`, `aria_labelledBy`,
 * `aria_describedBy`): у одной даты их получает поле, как у Vue. Проп плагина
 * с триггерами связка держит в состоянии, как и выход.
 */
export type TDatePickerOutputs = DescriptorPluginOutputs<typeof DatePickerDescriptor> &
	Pick<
		DescriptorAllProps<typeof DatePickerDescriptor>,
		'aria_label' | 'aria_labelledBy' | 'aria_describedBy'
	>

export function setupDatePicker(
	host: HTMLElement,
	ctrl: IDatePicker | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IDatePicker, unknown, TDatePickerOutputs> {
	const adapter = createWebcAdapterContext(host, DatePickerDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
