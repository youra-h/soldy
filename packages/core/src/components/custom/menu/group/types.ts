import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
} from '../../../base/component-view'
import type { TAria, TAriaAttributes } from '../../../../common'

export type TMenuGroupEvents = TComponentViewEvents & {
	/** change:label */
	'change:label': (value: string) => void
	/** change:labelAria — набор атрибутов подписи изменился */
	'change:labelAria': (value: TAriaAttributes) => void
}

export interface IMenuGroupProps extends IComponentViewProps {
	/** Подпись группы. Пустая — подписи нет */
	label?: string
}

/** Группа пунктов меню под общей подписью (`Menu.Group`). */
export interface IMenuGroup extends IComponentView<IMenuGroupProps, TMenuGroupEvents> {
	/** Подпись группы. Пустая — подписи нет */
	label: string
	/** Атрибуты подписи: её `id`, на который ссылается группа, пишет плагин связок */
	readonly labelAria: TAria
}
