import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IListBox } from '@soldy-ui/core'
import { AttributesDirective, SlotDirective, provideElevator } from '../../adapter'
import { TListBoxItemComponent } from './item'
import { TListBoxGroupComponent } from './group'
import { TListBoxSurface } from '../../generated/list-box.metadata'
import { setupListBox } from './setup.component'

/**
 * TListBoxComponent — список с выбором.
 *
 * Селектор атрибутный, как у Button: `<div so-list-box>`. Корень — сам
 * элемент потребителя, а написанное на нём делится, как у поля. Классы,
 * `attrs`, `dataset` и скрытие раскладывает на него `TComponentBase`
 * (стратегия `'host'`). Корень — рамка: шапка, узел списка
 * (`.so-list-box__list`) и подвал. Набор `aria` владельца — это сам список
 * (`role="listbox"`, `aria-multiselectable`, имя от `aria_label`), и на узел
 * списка его кладёт директива набора: в `listbox` ARIA пускает только опции,
 * а шапка и подвал — место полей и кнопок. Узел списка — и остановка Tab
 * (`tabindex="0"` статикой шаблона): по элементам ходят стрелки его
 * клавиатуры (`TListKeyboardPlugin`), и свои клавиши она берёт с этого узла.
 * Всё, что потребитель записал на список, кроме `class` и `style`, доходит до
 * узла списка (`control`): статику переносит база, привязки и слушатели —
 * рендерер адаптера (`provideAttrs()`). `aria-label` и `id` называют список,
 * а не рамку без роли, `tabindex="-1"` снимает его с остановок Tab, а
 * `(keydown)` слушает список.
 *
 * Контекстов два — свой и фасада коллекции (`setupListBox`), и входы фасада
 * (`items`, `mode`, `engine`, `trackBy`) — входы того же элемента. Свой слой
 * лифта список отдаёт поддереву провайдером (`provideElevator()`): элементы
 * разметки — его содержимое — и элементы из данных в его шаблоне прочтут из
 * слоя движок и регистратор этого списка, а соседний список — свои.
 *
 * Элементы разметки — `<div so-list-box-item>` в содержимом. Без них список
 * рисует то, что рисует коллекция, по секциям группировки (`drawnSections`), —
 * запасным содержимым `<ng-content>`: группу с подписью —
 * `<div so-list-box-group>`, между секциями — немой разделитель.
 *
 * `div[so-list-box]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-list-box], [so-list-box]
 */
@Component({
	selector: 'div[so-list-box], [so-list-box]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		SlotDirective,
		TListBoxItemComponent,
		TListBoxGroupComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './list-box.component.html',
})
export class TListBoxComponent extends TListBoxSurface<IListBox> {
	constructor() {
		super((ctrl, inputs) => setupListBox(ctrl, inputs, this.engine), {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}
}
