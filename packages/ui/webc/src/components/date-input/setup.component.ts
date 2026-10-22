/**
 * setupDateInput — setup-слой DateInput.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента: по ней ядро строит формат частей,
 * их имена и подсказки, а плагин имён — имя кнопки очистки) и связывает его с
 * элементом через useAdapter. Логики здесь нет: части, их текст и наборы
 * отдаёт ядро, клавиши, указатель, буфер обмена и касание ловят плагины поля
 * на корне, очищает поле его команда `clear`; на корень классы и наборы кладёт
 * база элемента, а ряд частей, кнопку очистки и скрытое поле ведёт шаблон.
 *
 * Поле формы `Field` над полем: ошибку и ссылки на части группа берёт от него
 * своим расширением (`TFieldControlExtension`) — ближайшую связку вверх по
 * документу, а своему содержимому опускает пустую связку своим хостом:
 * контролы в его слотах — его содержимое. Поле — деталь чужой разметки
 * (`embedded`: поля DatePicker) — связку не берёт: её взял владелец.
 */

import { DateInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { IDateInput } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupDateInput(
	host: HTMLElement,
	ctrl: IDateInput | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IDateInput> {
	const adapter = createWebcAdapterContext(host, DateInputDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
