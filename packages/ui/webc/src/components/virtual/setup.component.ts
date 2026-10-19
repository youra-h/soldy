/**
 * setupVirtual — setup-слой Virtual.
 *
 * Собирает обёртку (`createWebcAdapterContext`) с её проводкой
 * (`TVirtualExtension`): подключение к окну она опускает лифтом своему хосту.
 * Коллекции в её свете — ListBox, Table — собираются следом, находят его вверх
 * по документу и подхватывают своим расширением
 * (`TVirtualCollectionExtension`). Связка у элемента новая на каждое
 * подключение, и подключение опускается заново.
 */

import { TVirtualExtension, VirtualDescriptor } from '@soldy-ui/setup'
import type { IVirtual } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupVirtual(
	host: HTMLElement,
	ctrl: IVirtual | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IVirtual> {
	const adapter = createWebcAdapterContext(host, VirtualDescriptor(), { ctrl, props }).use(
		TVirtualExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
