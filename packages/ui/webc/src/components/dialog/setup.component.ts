/**
 * setupDialog — setup-слой Dialog.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента; у окна, увезённого в цель, поиск
 * идёт от его якоря: от неё имена кнопок шапки, которые пишет плагин имён) и
 * связывает его с элементом через useAdapter. Логики здесь нет: нажатие мимо —
 * `TDismissPlugin`, фокус, Tab и Escape — `TModalFocusPlugin`, немой фон —
 * `THideOutsidePlugin`, запертая прокрутка — `TScrollLockPlugin`, слой, размер
 * и отступ в стилях — `TDialogLayoutPlugin`. Шаблон раскладывает то, что
 * отдали ядро и плагины: выходы `layout_backdropStyles` и
 * `dismiss_ownerAttribute` — на подложку и на окно.
 */

import { DialogDescriptor, type DescriptorPluginOutputs } from '@soldy-ui/setup'
import type { IDialog } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'

/** Выходы плагинов Dialog — их читает шаблон: стиль подложки и пометку окна владельцем. */
export type TDialogOutputs = DescriptorPluginOutputs<typeof DialogDescriptor>

export function setupDialog(
	host: HTMLElement,
	ctrl: IDialog | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IDialog, unknown, TDialogOutputs> {
	const adapter = createWebcAdapterContext(host, DialogDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
