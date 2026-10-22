/**
 * setupSelectGroup — setup-слой группы опций Select.
 *
 * Контекст один: в коллекцию группа не входит, её опции — опции Select, и
 * движок они находят лифтом Select вверх по документу — сквозь группу, а из
 * увезённой панели — от её якоря, корня Select.
 *
 * В группировку Select группа входит своей проводкой (`TItemGroupExtension`):
 * ключ группы она опускает лифтом своему хосту — его находят опции в её свете,
 * — а подпись регистрирует в группировке. Связка у элемента новая на каждое
 * подключение, и ключ опускается заново.
 */

import { SelectGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupSelectGroup(
	host: HTMLElement,
	ctrl: IItemGroup | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IItemGroup> {
	const adapter = createWebcAdapterContext(host, SelectGroupDescriptor(), { ctrl, props }).use(
		TItemGroupExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
