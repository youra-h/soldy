import { TRadioGroupExtension } from './extensions'
import { activationExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TRadioGroupItem from './../item/item.class'
import type { IRadioGroupItem } from './../item/types'
import type { IRadioGroup } from './../types'

/** Детали рабочей коллекции RadioGroup — по порядку установки. См. `tabsExtensions`. */
export function radioGroupExtensions(owner?: IRadioGroup): TExtensionSet<IRadioGroupItem> {
	const set = activationExtensions<IRadioGroupItem>(TRadioGroupItem)

	// Свойства группы на радио и связь `value` ↔ активное радио. Без него проп
	// `value` у RadioGroup был бы объявлен, но мёртв, а радио не собрались бы
	// в группу без общего `name`
	if (owner) set.radioGroup = () => new TRadioGroupExtension({ owner })

	return set
}
