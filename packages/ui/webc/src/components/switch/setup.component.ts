/**
 * setupSwitch — setup-слой Switch.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Логики здесь нет: переключает значение плагин по `change` поля,
 * на корень классы и `attrs` кладёт база элемента, а поле, его `aria` с
 * `role="switch"` и содержимое ручки ведёт шаблон.
 *
 * Поле формы `Field` над переключателем: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — ближайшую
 * связку вверх по документу, а своему содержимому опускает пустую связку
 * своим хостом: контролы в его слотах — его содержимое.
 */

import { SwitchDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ISwitch } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupSwitch(
	host: HTMLElement,
	ctrl: ISwitch | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ISwitch> {
	const adapter = createWebcAdapterContext(host, SwitchDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
