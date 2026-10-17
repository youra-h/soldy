import { TComponentView } from '../../../base/component-view'
import type { IComponentViewProps, TComponentViewEvents } from '../../../base/component-view'

/**
 * Разделитель меню (`Menu.Separator`) — линия между группами пунктов.
 *
 * `role="separator"` (APG Menu): скринридер видит границу, навигация её
 * пропускает — в коллекцию меню разделитель не входит. Своих свойств нет.
 */
export class TMenuSeparator extends TComponentView<IComponentViewProps, TComponentViewEvents> {
	static override baseClass = 'so-menu-separator'

	constructor(props: Partial<IComponentViewProps> = {}) {
		super(props)

		this._aria.add('role', 'separator')
	}
}
