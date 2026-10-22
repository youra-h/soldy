import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ISelectItem, TSelectItemCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, type TBinding } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { SelectItemInputNames, TSelectItemSurface } from './base.component'
import { setupSelectItem } from './setup.component'

/**
 * TSelectItemComponent — опция Select: корень и строка внутри — Button, как
 * у Vue.
 *
 * Селектор атрибутный, как у Button: `<div so-select-item>`. Корень — сам
 * элемент потребителя, а написанное на нём делится между корнем и строкой,
 * как у элемента ListBox. Корень несёт классы, `attrs`, `dataset` и место в
 * коллекции (`order`) — их раскладывает `TComponentBase` (стратегия
 * `'host'`). Вся ARIA опции — на строке: `role="option"` от ядра, `id` и
 * `aria-selected` от коллекции, — и тот же `dataset` (`data-selected`,
 * `data-highlighted`): фон выбора и подсветки тема рисует на самой кнопке.
 * Кладёт их директива набора поверх того, что кнопка пишет себе сама, — узел
 * с ролью у опции один: `role="option"` перекрывает роль кнопки на `span`, а
 * `tabindex="-1"` выводит строку из обхода: фокус остаётся на поле. Статикой
 * `tabindex` на строке не поставить — его перепишет база кнопки, — поэтому он
 * в наборе, снизу. Всё, что потребитель записал на опцию, кроме `class` и
 * `style`, доходит до строки (`control`): статику переносит база, привязки и
 * слушатели — рендерер адаптера (`provideAttrs()`).
 *
 * Тег строки фиксирован (`span`), а не берётся из `tag` опции: `tag` — тег
 * корня, под фиксированный тег строки написан `TSelectItem._ariaTag`.
 *
 * Клик выбирает через контекст фасада (`adapters.select.choose()`), тем же
 * путём, что клавиатура поля: выключенной опции отказывает Select, а после
 * выбора он решает, закрыть ли панель. Слушатель потребителя на опции —
 * `(click)` — стоит на строке рядом с ним и слышит клик следом.
 *
 * Отметка выбранного (`indicator` поля) рисуется внутри краёв строки: обёртка
 * стоит, пока сторона задана, — она резервирует место, и строка не прыгает
 * при выборе; иконка внутри — только у выбранной опции. Обёртка `aria-hidden`:
 * состояние скринридеру объявляет `aria-selected`.
 *
 * Слоты: `leading` и `trailing` проецируются, `default` (scope
 * `{ text, selected }`) — шаблоном или проекцией, без него — текст;
 * `indicator-icon` (scope `{ selected }`) — шаблоном. Шаблоны слотов уходят в
 * слив в конце шаблона: в основной проекции они сняли бы запасной текст.
 *
 * `div[so-select-item]` стоит первым: по первому селектору Angular выбирает
 * тег хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра
 * по умолчанию.
 *
 * Selector: div[so-select-item], [so-select-item]
 */
@Component({
	selector: 'div[so-select-item], [so-select-item]',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './select-item.component.html',
})
export class TSelectItemComponent extends TSelectItemSurface<ISelectItem> {
	constructor() {
		super(SelectItemInputNames, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
			order: 'order',
		})
	}

	protected createBinding(
		ctrl: ISelectItem | undefined,
		inputs: object,
	): TBinding<ISelectItem, TSelectItemCollectionFacade> {
		return setupSelectItem(ctrl, inputs)
	}

	/** Клик по строке: выбор через Select — выключенной опции он откажет. */
	protected choose(): void {
		this.facade()?.context?.adapters.select.choose()
	}
}
