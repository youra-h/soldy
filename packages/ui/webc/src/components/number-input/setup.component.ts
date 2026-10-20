/**
 * setupNumberInput — setup-слой NumberInput.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента: по ней ядро пишет текст в формате
 * числа, а плагин имён — имена кнопок очистки и шага) и связывает его с
 * элементом через useAdapter. Логики здесь нет: что набирается, решает ядро,
 * правку браузера до него доводит плагин набора, клавиши шага и кнопки шага с
 * удержанием — свои плагины на корне; на корень классы и наборы кладёт база
 * элемента, а ввод, его наборы, текст, кнопки и скрытое поле ведёт шаблон.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — ближайшую
 * связку вверх по документу, а своему содержимому опускает пустую связку
 * своим хостом: контролы в его слотах — его содержимое.
 */

import { NumberInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { INumberInput } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupNumberInput(
	host: HTMLElement,
	ctrl: INumberInput | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<INumberInput> {
	const adapter = createWebcAdapterContext(host, NumberInputDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
