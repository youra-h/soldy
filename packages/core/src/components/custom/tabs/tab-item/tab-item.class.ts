import TTabItemCustom from './tab-item-custom.class'
import type { ITabItem, TTabItemOptions, ITabItemProps, TTabItemEvents } from './types'

/**
 * Элемент таба для работы в коллекции.
 * Наследуется напрямую от TTabItemCustom без миксинов.
 */
export default class TTabItem
	extends TTabItemCustom<ITabItemProps, TTabItemEvents>
	implements ITabItem
{
	constructor(options: TTabItemOptions | Partial<ITabItemProps> = {}) {
		super(options)
	}

	override getProps(): ITabItemProps {
		return {
			...super.getProps(),
		}
	}

	override assign(source: Partial<ITabItem>): void {
		super.assign(source)
	}
}
