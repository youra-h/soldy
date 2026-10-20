/**
 * setupListBoxGroup — setup-слой группы ListBox.
 *
 * Контекст один: в коллекцию группа не входит, её элементы — элементы списка,
 * и движок они находят лифтом списка вверх по документу — сквозь группу.
 *
 * В группировку списка группа входит своей проводкой (`TItemGroupExtension`):
 * ключ группы она опускает лифтом своему хосту — его находят элементы в её
 * свете, — а подпись регистрирует в группировке. Связка у элемента новая на
 * каждое подключение, и ключ опускается заново.
 */

import { ListBoxGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupListBoxGroup(
	host: HTMLElement,
	ctrl: IItemGroup | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IItemGroup> {
	const adapter = createWebcAdapterContext(host, ListBoxGroupDescriptor(), { ctrl, props }).use(
		TItemGroupExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
