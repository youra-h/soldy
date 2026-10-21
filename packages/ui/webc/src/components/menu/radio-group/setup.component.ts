/**
 * setupMenuRadioGroup — setup-слой группы переключателей меню.
 *
 * Группа переключателей — та же группа меню и своё значение. Как группа меню,
 * она входит в группировку меню (`TItemGroupExtension`); себя переключателям
 * внутри опускает проводкой (`TMenuRadioGroupExtension`), а что в группе
 * отмечен один, держит коллекция меню. Контекст один: в коллекцию группа не
 * входит, и своей коллекции у неё нет — её переключатели пункты меню.
 */

import {
	MenuRadioGroupDescriptor,
	TItemGroupExtension,
	TMenuRadioGroupExtension,
} from '@soldy-ui/setup'
import type { IMenuRadioGroup } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupMenuRadioGroup(
	host: HTMLElement,
	ctrl: IMenuRadioGroup | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IMenuRadioGroup> {
	const elevator = createWebcElevator(host)
	const adapter = createWebcAdapterContext(host, MenuRadioGroupDescriptor(), { ctrl, props })
		.use(TItemGroupExtension, { elevator })
		.use(TMenuRadioGroupExtension, { elevator })

	return useAdapter(adapter, host, onUpdate)
}
