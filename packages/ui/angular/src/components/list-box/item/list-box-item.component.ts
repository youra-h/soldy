import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IListBoxItem, TListBoxItemCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, type TBinding } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { ListBoxItemInputNames, TListBoxItemSurface } from './base.component'
import { setupListBoxItem } from './setup.component'

/**
 * TListBoxItemComponent — элемент списка: корень и строка внутри — Button,
 * как у Vue.
 *
 * Селектор — элементный, `<so-list-box-item>`: атрибуты потребителя у
 * элемента делятся между корнем и строкой, и корнем служит сам элемент
 * компонента, как у поля. Корень несёт классы, `attrs`, `dataset` и место в
 * коллекции (`order`) — их раскладывает `TComponentBase` (стратегия `'host'`):
 * тема читает `data-content-fit` с него. Строка несёт `aria` и тот же
 * `dataset` — выбор и подсветку тема красит на `.s-button`; кладёт их
 * директива набора поверх того, что кнопка пишет себе сама, — `role="option"`
 * и `tabindex="-1"` элемента перекрывают роль и остановку Tab кнопки на `div`.
 * Статические атрибуты, которые потребитель записал на элемент, кроме `class`
 * и `style`, база переносит на строку (`control`).
 *
 * Тег строки фиксирован (`div`), а не берётся из `tag` элемента: `tag` — тег
 * корня, под фиксированный тег строки написан `TListBoxItem._ariaTag`.
 *
 * Клик выбирает через контекст фасада (`adapters.list.choose()`), а не
 * `selection.toggle()`: выключенному элементу отказывает список, тем же путём,
 * что и клавиатура. Слушатель потребителя на элементе слышит клик следом:
 * клик всплывает со строки на корень.
 *
 * Слоты: `leading` и `trailing` проецируются (`<span slot="leading">`),
 * `default` (scope `{ text, selected }`) — проекцией или шаблоном
 * (`<ng-template slot="default" let-text="text">`), без него — текст;
 * `indicator-icon` (scope `{ selected }`) — шаблоном. Шаблоны слотов уходят в
 * слив в конце шаблона: в основной проекции они сняли бы запасной текст.
 *
 * Selector: so-list-box-item
 */
@Component({
	selector: 'so-list-box-item',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './list-box-item.component.html',
})
export class TListBoxItemComponent extends TListBoxItemSurface<IListBoxItem> {
	constructor() {
		super(ListBoxItemInputNames, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}

	protected createBinding(
		ctrl: IListBoxItem | undefined,
		inputs: object,
	): TBinding<IListBoxItem, TListBoxItemCollectionFacade> {
		return setupListBoxItem(ctrl, inputs)
	}

	/** Клик по строке: выбор через список — выключенному он откажет. */
	protected choose(): void {
		this.facade()?.context?.adapters.list.choose()
	}
}
