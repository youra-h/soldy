/** В коллекцию группа не входит: её опции находят движок Select лифтом сквозь неё. */

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
