/**
 * setupMenuGroup — setup-слой группы меню.
 *
 * Контекст один: в коллекцию группа не входит, её пункты — пункты меню, и
 * движок они находят лифтом меню вверх по документу — сквозь группу.
 *
 * В группировку меню группа входит своей проводкой (`TItemGroupExtension`):
 * ключ группы она опускает лифтом своему хосту — его находят пункты в её
 * свете, — а подпись регистрирует в группировке. Связка у элемента новая на
 * каждое подключение, и ключ опускается заново.
 */

import { MenuGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupMenuGroup(
	host: HTMLElement,
	ctrl: IItemGroup | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IItemGroup> {
	const adapter = createWebcAdapterContext(host, MenuGroupDescriptor(), { ctrl, props }).use(
		TItemGroupExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
