import { TActivationCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TCollectionFacadeProps } from '../../../../base/collection'
import { radioGroupExtensions } from '../factory'
import { withOwnerIds, completeEngine } from '../../../../base/collection/create/internal'
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
		// Движок мог прийти снаружи собранным на любом уровне — `completeEngine`
		// доставит в него то, чего не хватает RadioGroup. Именно здесь, а не в
		// теле: базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: withOwnerIds(
					completeEngine(options.engine, radioGroupExtensions(options.owner)),
					options.owner,
				) as TRadioGroupCollection,
			},
		)

		this.applyProps(props)
	}
}
