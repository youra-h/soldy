/**
 * setupRadioGroupItem — setup-слой радио.
 *
 * Два контекста, как у элементов остальных коллекций: собственный (пропсы
 * радио) и фасада (отмечено ли радио в группе), одной связкой. Расширение
 * элемента берёт лифтом движок и регистратор группы — ближайшей выше по
 * документу — и отдаёт фасаду контекст радио. Порядок связок — как у Vue:
 * фасад первым, и в группу радио входит, когда его контекст принят, — при
 * подключении элемента; запись группы радио при входе до своей связки
 * событиями не доходит, а её состояние своя связка прочтёт сразу.
 */

import {
	RadioGroupCollectionItemDescriptor,
	RadioGroupItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IRadioGroupItem, TRadioGroupItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupRadioGroupItem(
	host: HTMLElement,
	ctrl: IRadioGroupItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IRadioGroupItem, TRadioGroupItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, RadioGroupItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		RadioGroupCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		elevator: createWebcElevator(host),
	})

	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
