import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IListBox, TListBoxCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, SlotDirective, provideElevator, type TBinding } from '../../adapter'
import { TListBoxItemComponent } from './item'
import { ListBoxInputNames, TListBoxSurface } from './base.component'
import { setupListBox } from './setup.component'

/**
 * TListBoxComponent — список с выбором.
 *
 * Селектор — элементный, `<so-list-box>`: атрибуты потребителя у списка
 * делятся, как у поля, и корнем служит сам элемент компонента. Классы,
 * `attrs`, `dataset` и скрытие раскладывает на него `TComponentBase`
 * (стратегия `'host'`). Корень — рамка: шапка, узел списка
 * (`.so-list-box__list`) и подвал. Набор `aria` владельца — это сам список
 * (`role="listbox"`, `aria-multiselectable`, имя от `aria_label`), и на узел
 * списка его кладёт директива набора: в `listbox` ARIA пускает только опции,
 * а шапка и подвал — место полей и кнопок. Узел списка — и остановка Tab
 * (`tabindex="0"` статикой шаблона): по элементам ходят стрелки его
 * клавиатуры (`TListKeyboardPlugin`), и свои клавиши она берёт с этого узла.
 * Статические атрибуты, которые потребитель записал на список, кроме `class`
 * и `style`, база переносит на узел списка (`control`): `aria-label` и `id`
 * называют список, а не рамку без роли, `tabindex="-1"` снимает его с
 * остановок Tab.
 *
 * Контекстов два — свой и фасада коллекции (`setupListBox`), и входы фасада
 * (`items`, `mode`, `engine`, `trackBy`) — входы того же элемента. Свой слой
 * лифта список отдаёт поддереву провайдером (`provideElevator()`): элементы
 * разметки — его содержимое — и элементы из данных в его шаблоне прочтут из
 * слоя движок и регистратор этого списка, а соседний список — свои.
 *
 * Элементы разметки — `<so-list-box-item>` в содержимом. Без них список рисует
 * то, что рисует коллекция (`drawn`), — запасным содержимым `<ng-content>`.
 *
 * Selector: so-list-box
 */
@Component({
	selector: 'so-list-box',
	standalone: true,
	imports: [NgTemplateOutlet, AttributesDirective, SlotDirective, TListBoxItemComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './list-box.component.html',
})
export class TListBoxComponent extends TListBoxSurface<IListBox> {
	constructor() {
		super(ListBoxInputNames, { strategy: 'host', sets: ['attrs', 'dataset'], control: true })
	}

	protected createBinding(
		ctrl: IListBox | undefined,
		inputs: object,
	): TBinding<IListBox, TListBoxCollectionFacade> {
		return setupListBox(ctrl, inputs, this.engine)
	}
}
