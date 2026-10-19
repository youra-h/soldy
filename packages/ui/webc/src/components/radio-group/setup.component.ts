/**
 * setupRadioGroup — setup-слой RadioGroup.
 *
 * Два контекста, как у остальных коллекций: собственный (пропсы группы) и
 * фасада коллекции (состав и отмеченное радио), одной связкой. Drag-and-drop
 * нет: радио одной группы стоят где угодно в разметке, и порядка на экране у
 * них нет. Движок и регистратор радио расширение коллекции опускает лифтом —
 * хосту группы: радио, что стоят ниже, находят их вверх по документу.
 *
 * `engine` — готовая коллекция снаружи, свойство элемента (`el.engine`):
 * фасад работает на ней, а без неё собирает свою (`completeEngine`).
 *
 * Поле формы `Field` связывается с группой, а не с радио: подпись поля
 * называет группу ссылкой, ошибка — группы (`TFieldControlExtension` на
 * своём контексте). Своему содержимому группа опускает пустую связку своим
 * хостом: радио и контролы в их подписях связку поля не берут.
 */

import {
	RadioGroupCollectionDescriptor,
	RadioGroupDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
} from '@soldy-ui/setup'
import type { IRadioGroup, TRadioGroupCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupRadioGroup(
	host: HTMLElement,
	ctrl: IRadioGroup | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IRadioGroup, TRadioGroupCollectionFacade> {
	const adapter = createWebcAdapterContext(host, RadioGroupDescriptor(), {
		ctrl,
		props,
	}).use(TFieldControlExtension, { elevator: createWebcElevator(host) })
	const owner = useAdapter(adapter, host, onUpdate)

	const collectionAdapter = createWebcAdapterContext(
		host,
		RadioGroupCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: createWebcElevator(host) })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, adapter, host, onUpdate))
}
