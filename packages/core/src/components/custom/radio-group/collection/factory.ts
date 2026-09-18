import type { TRadioGroupCollection } from './types'
import { TRadioGroupExtension } from './extensions'
import { activationExtensions, assembleEngine } from './../../../base/collection/create/internal'
import type {
	TBaseExtensionSet,
	TOwnerExtensionSet,
} from './../../../base/collection/create/internal'
import TRadioGroupItem from './../item/item.class'
import type { IRadioGroupItem } from './../item/types'
import type { IRadioGroup } from './../types'

/**
 * Состав коллекции RadioGroup — объявлением, а не функцией сборки.
 *
 * Разделён надвое, потому что владелец есть не всегда: коллекцию можно собрать
 * снаружи (`createEngine`) и передать компоненту, а инстанс `TRadioGroup`
 * появится только там. Из этих же наборов вычисляется, чего движку не хватает.
 */
export const RADIO_GROUP_EXTENSIONS = (): TBaseExtensionSet<IRadioGroupItem> => ({
	...activationExtensions<IRadioGroupItem>(TRadioGroupItem),
})

/** То, чему нужен инстанс компонента. */
export const RADIO_GROUP_OWNER_EXTENSIONS: TOwnerExtensionSet<IRadioGroupItem, IRadioGroup> = {
	// Свойства группы на радио и связь `value` ↔ активное радио. Без него проп
	// `value` у RadioGroup был бы объявлен, но мёртв, а радио не собрались бы
	// в группу без общего `name`
	radioGroup: (owner) => new TRadioGroupExtension({ owner }),
}

/**
 * Полная коллекция RadioGroup. Внутренняя: наружу ведёт
 * `createEngineRadioGroup`, который требует владельца явно.
 */
export const RadioGroupFactory = (owner: IRadioGroup): TRadioGroupCollection => {
	const engine = assembleEngine<IRadioGroupItem>(RADIO_GROUP_EXTENSIONS())

	for (const build of Object.values(RADIO_GROUP_OWNER_EXTENSIONS)) engine.use(build(owner))

	return engine as TRadioGroupCollection
}
