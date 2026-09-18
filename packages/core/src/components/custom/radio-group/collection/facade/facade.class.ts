import { TActivationCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TCollectionFacadeProps } from '../../../../base/collection'
import { RadioGroupFactory, RADIO_GROUP_EXTENSIONS, RADIO_GROUP_OWNER_EXTENSIONS } from '../factory'
import { resolveEngine } from '../../../../base/collection/create/internal'
import type {
	TRadioGroupCollection,
	TRadioGroupCollectionExtensions,
	TRadioGroupCollectionFacadeEngine,
} from '../types'
import type { IRadioGroupItem } from '../../item/types'
import type { IRadioGroup } from '../../types'

/**
 * Фасад коллекции радио.
 *
 * Состав и активное радио — из `TActivationCollectionFacade`, своего нет:
 * расширение `radioGroup` событий не шлёт, а его работа видна через свойства
 * группы и радио.
 */
export class TRadioGroupCollectionFacade extends TActivationCollectionFacade<
	IRadioGroupItem,
	TRadioGroupCollectionExtensions
> {
	constructor(
		props: TCollectionFacadeProps<IRadioGroupItem> = {},
		options: TCollectionFacadeOptions<TRadioGroupCollectionFacadeEngine, IRadioGroup> = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `resolveEngine`
		// дополнит его до того, что нужно RadioGroup. Именно здесь, а не в
		// теле: базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: resolveEngine(
					options,
					RADIO_GROUP_EXTENSIONS(),
					RADIO_GROUP_OWNER_EXTENSIONS,
					'RadioGroup',
					RadioGroupFactory,
				) as TRadioGroupCollection,
			},
		)

		this.applyProps(props)
	}
}
