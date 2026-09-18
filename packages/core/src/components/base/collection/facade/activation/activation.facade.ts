import { TBatchCollectionFacade } from '../batch'
import type { ICollectionComponentOptions, TActivationCollectionFacadeEvents } from '../types'
import type { IComponentProps } from '../../../component'
import type {
	IExtension,
	TActivationExtension,
	TBatchExtension,
	TPlainExtension,
} from '../../engine'

/**
 * Фасад коллекции с расширением `activation`: активный элемент.
 *
 * Подключают Tabs и RadioGroup. Активный элемент у коллекции один, и снять
 * его, не выбрав другой, пользователь не может, — это не выбор, поэтому база
 * своя, а не `TSelectionCollectionFacade`. Правило то же, что у соседей:
 * фасады повторяют **состав расширений**, а не таксономию компонентов, и
 * сужение дженерика делает наследование без `activation` ошибкой компиляции.
 *
 * Пока потребитель был один (Tabs), базы не заводили: подстраиваться под
 * неизвестное требование дороже, чем поднять пятнадцать строк, когда оно
 * появится. Вторым стал RadioGroup.
 */
export abstract class TActivationCollectionFacade<
	TItem extends object,
	TExtensions extends {
		plain: TPlainExtension<any>
		batch: TBatchExtension<any>
		activation: TActivationExtension<any>
	} & Record<string, IExtension<any>>,
	TEvents extends TActivationCollectionFacadeEvents<TItem> =
		TActivationCollectionFacadeEvents<TItem>,
> extends TBatchCollectionFacade<TItem, TExtensions, TEvents> {
	constructor(
		props: Partial<IComponentProps> = {},
		options: ICollectionComponentOptions<TItem, TExtensions>,
	) {
		super(props, options)

		this.events.relayAll(this.extensions.activation.events)
	}

	get activeItem(): TItem | undefined {
		return this.extensions.activation.activeItem
	}

	activate(item: TItem): void {
		this.extensions.activation.activate(item)
	}
}
