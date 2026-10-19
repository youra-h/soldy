/**
 * setupInput — setup-слой Input.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента: по ней плагин имён пишет имя
 * кнопки очистки) и связывает его с элементом через useAdapter. Логики здесь
 * нет: текст в ядро несёт плагин ввода, на корень классы и `attrs` кладёт база
 * элемента, а поле, его `aria`, текст и кнопку очистки ведёт шаблон.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — ближайшую
 * связку вверх по документу, а своему содержимому опускает пустую связку
 * своим хостом: контролы в его слотах — его содержимое.
 */

import { InputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { IInput } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupInput(
	host: HTMLElement,
	ctrl: IInput | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IInput> {
	const adapter = createWebcAdapterContext(host, InputDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
