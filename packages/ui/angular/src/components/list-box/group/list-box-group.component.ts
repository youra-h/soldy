import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IItemGroup } from '@soldy-ui/core'
import { AttributesDirective, type TBinding } from '../../../adapter'
import { ListBoxGroupInputNames, TListBoxGroupSurface } from './base.component'
import { setupListBoxGroup } from './setup.component'

/**
 * TListBoxGroupComponent — элементы списка под общей подписью, как
 * `ListBox.Group` у Vue.
 *
 * Корень — сам элемент потребителя, как у Button: `<div so-list-box-group>`.
 * Всё, что потребитель пишет на элемент, относится к группе, поэтому селектор
 * атрибутный, а классы, скрытие и три набора ядра — `role="group"` и
 * `aria-labelledby` на подпись — раскладывает на него `TComponentBase`
 * (стратегия `'host'`). Первым — селектор с тегом умолчания ядра: по нему
 * Angular выбирает тег хоста, когда создаёт компонент сам.
 *
 * Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
 * группы тоже нет. Набор подписи (`labelAria`) — её `id` и роль
 * `presentation`: в `listbox` ARIA пускает только опции и группы. Элементы —
 * проекция: в коллекцию списка они входят сквозь группу, из слоя лифта
 * списка.
 *
 * Selector: div[so-list-box-group], [so-list-box-group]
 */
@Component({
	selector: 'div[so-list-box-group], [so-list-box-group]',
	standalone: true,
	imports: [AttributesDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './list-box-group.component.html',
})
export class TListBoxGroupComponent extends TListBoxGroupSurface<IItemGroup> {
	constructor() {
		super(ListBoxGroupInputNames, { strategy: 'host' })
	}

	protected createBinding(ctrl: IItemGroup | undefined, inputs: object): TBinding<IItemGroup> {
		return setupListBoxGroup(ctrl, inputs)
	}
}
