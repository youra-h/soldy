import { TActivationCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TCollectionFacadeProps } from '../../../../base/collection'
import { RADIO_GROUP_EXTENSIONS } from '../factory'
import { createEngineRadioGroup } from '../create'
import { completeEngine } from '../../../../base/collection/create/internal'
import type { TRadioGroupCollectionExtensions, TRadioGroupCollectionFacadeEngine } from '../types'
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
		options: TCollectionFacadeOptions<TRadioGroupCollectionFacadeEngine, IRadioGroup>,
	) {
		// Движок пришёл снаружи — дособрать до компонента; нет — собрать свой.
		// Здесь, а не в теле: базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: options.engine
					? completeEngine(options.engine, RADIO_GROUP_EXTENSIONS(), options.owner)
					: createEngineRadioGroup({ owner: options.owner }),
			},
		)

		this.applyProps(props)
	}
}
