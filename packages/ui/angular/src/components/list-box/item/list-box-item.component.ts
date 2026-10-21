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
 * Селектор атрибутный, как у Button: `<div so-list-box-item>`. Корень — сам
 * элемент потребителя, а написанное на нём делится между корнем и строкой,
 * как у поля. Корень несёт классы, `attrs`, `dataset` и место в
 * коллекции (`order`) — их раскладывает `TComponentBase` (стратегия `'host'`):
 * тема читает `data-content-fit` с него. Строка несёт `aria` и тот же
 * `dataset` — выбор и подсветку тема красит на `.so-button`; кладёт их
 * директива набора поверх того, что кнопка пишет себе сама, — `role="option"`
 * и `tabindex="-1"` элемента перекрывают роль и остановку Tab кнопки на `div`.
 * Всё, что потребитель записал на элемент, кроме `class` и `style`, доходит до
 * строки (`control`): статику переносит база, привязки и слушатели — рендерер
 * адаптера (`provideAttrs()`).
 *
 * Тег строки фиксирован (`div`), а не берётся из `tag` элемента: `tag` — тег
 * корня, под фиксированный тег строки написан `TListBoxItem._ariaTag`.
 *
 * Клик выбирает через контекст фасада (`adapters.list.choose()`), а не
 * `selection.toggle()`: выключенному элементу отказывает список, тем же путём,
 * что и клавиатура. Слушатель потребителя на элементе — `(click)` — стоит на
 * строке рядом с ним и слышит клик следом.
 *
 * Слоты: `leading` и `trailing` проецируются (`<span slot="leading">`),
 * `default` (scope `{ text, selected }`) — проекцией или шаблоном
 * (`<ng-template slot="default" let-text="text">`), без него — текст;
 * `indicator-icon` (scope `{ selected }`) — шаблоном. Шаблоны слотов уходят в
 * слив в конце шаблона: в основной проекции они сняли бы запасной текст.
 *
 * `div[so-list-box-item]` стоит первым: по первому селектору Angular выбирает
 * тег хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра
 * по умолчанию.
 *
 * Selector: div[so-list-box-item], [so-list-box-item]
 */
@Component({
	selector: 'div[so-list-box-item], [so-list-box-item]',
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
			order: 'order',
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
