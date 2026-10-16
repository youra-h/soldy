/**
 * setupCheckBox — setup-слой CheckBox.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Логики здесь нет: переключает значение плагин флажка по `change`
 * поля, на корень классы и `attrs` кладёт база элемента, а поле, его `aria` и
 * отметку ведёт шаблон.
 */

import { CheckBoxDescriptor } from '@soldy-ui/setup'
import type { ICheckBox } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupCheckBox(
	host: HTMLElement,
	ctrl: ICheckBox | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ICheckBox> {
	const adapter = createWebcAdapterContext(host, CheckBoxDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
