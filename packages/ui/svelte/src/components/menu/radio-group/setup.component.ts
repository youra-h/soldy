/**
 * setupMenuRadioGroup — setup-слой группы переключателей меню.
 *
 * Группа переключателей — та же группа меню и своё значение. Как группа
 * меню, она входит в группировку коллекции меню (`TItemGroupExtension`); себя
 * переключателям внутри опускает проводкой (`TMenuRadioGroupExtension`), а
 * что в группе отмечен один, держит коллекция меню. Обе проводки опускают
 * своё лифтом (`setContext`) — переключатель внутри прочтёт его при своей
 * инициализации.
 */

import {
	MenuRadioGroupDescriptor,
	TItemGroupExtension,
	TMenuRadioGroupExtension,
} from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	useAdapter,
	type TRootReceiver,
} from '../../../adapter'
import type { MenuRadioGroupProps } from './base.component'

export function setupMenuRadioGroup(
	getProps: () => MenuRadioGroupProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const adapter = createSvelteAdapterContext(MenuRadioGroupDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})
		.use(TItemGroupExtension, { elevator: SvelteElevatorFactory })
		.use(TMenuRadioGroupExtension, { elevator: SvelteElevatorFactory })

	return useAdapter(adapter, getProps, receive)
}
