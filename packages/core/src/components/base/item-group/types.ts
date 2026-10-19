import type { IComponentView, IComponentViewProps, TComponentViewEvents } from '../component-view'
import type { TAria, TAriaAttributes } from '../../../common'

export type TItemGroupEvents = TComponentViewEvents & {
	/** change:label */
	'change:label': (value: string) => void
	/** change:labelAria — набор атрибутов подписи изменился */
	'change:labelAria': (value: TAriaAttributes) => void
}

export interface IItemGroupProps extends IComponentViewProps {
	/** Подпись группы. Пустая — подписи нет */
	label?: string
}

/**
 * Группа элементов коллекции под общей подписью — `Menu.Group`,
 * `ListBox.Group` и `Select.Group`.
 */
export interface IItemGroup extends IComponentView<IItemGroupProps, TItemGroupEvents> {
	/** Подпись группы. Пустая — подписи нет */
	label: string
	/** Атрибуты подписи: её `id`, на который ссылается группа, пишет плагин связок */
	readonly labelAria: TAria
}
