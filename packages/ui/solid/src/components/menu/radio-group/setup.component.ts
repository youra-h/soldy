/**
 * setupMenuRadioGroup — setup-слой группы переключателей меню.
 *
 * Группа переключателей — та же группа меню и своё значение. Как группа
 * меню, она входит в группировку коллекции меню (`TItemGroupExtension`); себя
 * переключателям внутри опускает проводкой (`TMenuRadioGroupExtension`), а
 * что в группе отмечен один, держит коллекция меню. Обе проводки пишут в слой
 * лифта группы (`useElevator`), детям его отдаёт `Elevate` в разметке.
 */

import {
	MenuRadioGroupDescriptor,
	TItemGroupExtension,
	TMenuRadioGroupExtension,
} from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../../adapter'
import type { MenuRadioGroupProps } from './base.component'

export function setupMenuRadioGroup(props: MenuRadioGroupProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(MenuRadioGroupDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
		.use(TItemGroupExtension, { elevator })
		.use(TMenuRadioGroupExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
