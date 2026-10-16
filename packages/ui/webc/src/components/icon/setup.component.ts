/**
 * setupIcon — setup-слой Icon.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Логики здесь нет: размер (`width`, `height`) плагин раскладки
 * отдаёт выходом `layout_styles`, имя — плагин доступного имени, а на корень
 * их раскладывает база элемента. Роль иконки — свой атрибут элемента, ядру она
 * не уходит: рисунок по ней строит шаблон.
 */

import { IconDescriptor } from '@soldy-ui/setup'
import type { IIcon } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

export function setupIcon(
	host: HTMLElement,
	ctrl: IIcon | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IIcon> {
	const adapter = createWebcAdapterContext(host, IconDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
