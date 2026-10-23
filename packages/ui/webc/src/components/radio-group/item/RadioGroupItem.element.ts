/**
 * `<label is="so-radio-group-item">` — радио: корень — подпись, поле внутри.
 * Только на `label`, поэтому радио в подписи `Label` нет: `label` в `label`
 * HTML запрещает. Номера места на корне нет: радио стоят где угодно, и он увёл
 * бы радио по чужому флекс-ряду. docs/architecture.md, Layer 8d, «Коллекция».
 */

import { RadioGroupCollectionItemDescriptor, RadioGroupItemDescriptor } from '@soldy-ui/setup'
import type { IRadioGroupItem, TRadioGroupItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { radioGroupItemTemplate } from './radio-group-item.template'
import { setupRadioGroupItem } from './setup.component'

export const TRadioGroupItemElement: TElementClassOf<
	typeof HTMLLabelElement,
	typeof RadioGroupItemDescriptor,
	IRadioGroupItem,
	TRadioGroupItemCollectionFacade
> = ElementBase(HTMLLabelElement, {
	descriptor: RadioGroupItemDescriptor,
	facade: RadioGroupCollectionItemDescriptor,
	template: radioGroupItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupRadioGroupItem,
})

export type TRadioGroupItemElementProps = TElementType<typeof TRadioGroupItemElement>
