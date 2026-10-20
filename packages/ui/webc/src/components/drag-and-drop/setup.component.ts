/**
 * setupDragAndDrop — setup-слой DragAndDrop.
 *
 * Собирает обёртку (`createWebcAdapterContext`) с её проводкой
 * (`TDragAndDropExtension`): свой экземпляр она опускает лифтом своему хосту.
 * Коллекции в её свете — Tabs, ListBox, Accordion — собираются следом, находят
 * его вверх по документу и подхватывают своим расширением
 * (`TDragAndDropCollectionExtension`). Связка у элемента новая на каждое
 * подключение, и экземпляр опускается заново.
 */

import { DragAndDropDescriptor, TDragAndDropExtension } from '@soldy-ui/setup'
import type { IDragAndDrop } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupDragAndDrop(
	host: HTMLElement,
	ctrl: IDragAndDrop | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IDragAndDrop> {
	const adapter = createWebcAdapterContext(host, DragAndDropDescriptor(), { ctrl, props }).use(
		TDragAndDropExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
