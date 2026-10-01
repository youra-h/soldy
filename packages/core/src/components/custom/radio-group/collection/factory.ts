import { TRadioGroupExtension } from './extensions'
import { activationExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TRadioGroupItem from './../item/item.class'
import type { IRadioGroupItem } from './../item/types'

/** Детали рабочей коллекции RadioGroup — по порядку установки. См. `tabsExtensions`. */
export function radioGroupExtensions(): TExtensionSet<IRadioGroupItem> {
	return {
		...activationExtensions<IRadioGroupItem>(TRadioGroupItem),
		// Свойства группы на радио и связь `value` ↔ активное радио. Без него
		// проп `value` у RadioGroup был бы объявлен, но мёртв, а радио не
		// собрались бы в группу без общего `name`
		radioGroup: () => new TRadioGroupExtension(),
	}
}
