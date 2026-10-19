/**
 * setupCheckBox — setup-слой CheckBox.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Логики здесь нет: переключает значение плагин флажка по `change`
 * поля, на корень классы и `attrs` кладёт база элемента, а поле, его `aria` и
 * отметку ведёт шаблон.
 *
 * Поле формы `Field` над флажком: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — ближайшую
 * связку вверх по документу, а своему содержимому опускает пустую связку
 * своим хостом: контролы в его слотах — его содержимое.
 */

import { CheckBoxDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ICheckBox } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupCheckBox(
	host: HTMLElement,
	ctrl: ICheckBox | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ICheckBox> {
	const adapter = createWebcAdapterContext(host, CheckBoxDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
