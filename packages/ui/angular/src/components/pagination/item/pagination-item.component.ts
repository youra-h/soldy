import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IPaginationItem, TPaginationItemCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, type TBinding } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { PaginationItemInputNames, TPaginationItemSurface } from './base.component'
import { setupPaginationItem } from './setup.component'

/**
 * TPaginationItemComponent — страница пагинации: внутренняя часть, как тост у
 * Toasts. Её рисует только `TPaginationComponent`, по одной на каждую страницу
 * окна, потребитель её в разметку не ставит, и из пакета она не выходит.
 *
 * Корень — место страницы в списке, `<li so-pagination-item>`: классы, `attrs`
 * и `dataset` (`data-selected` — текущая, его пишет активация коллекции, как у
 * таба; `data-disabled`) раскладывает на него `TComponentBase` (стратегия
 * `'host'`). Атрибутов потребителя у страницы нет: ставит её только владелец.
 *
 * Строка — Button с номером или текстом страницы. На ней `size` и `variant`
 * страницы (их диктует пагинация), `disabled` и набор `aria` —
 * `aria-current="page"` у текущей, его пишет расширение коллекции. Текущая —
 * обычная, не выключенная кнопка: каждая страница — своя остановка Tab.
 * Нажатие делает страницу текущей — активацией коллекции, как у таба, а
 * значение пагинации за ней пишет расширение коллекции. Нажатие по текущей
 * ничего не меняет.
 *
 * Содержимое — шаблон слота `default` со scope `{ text }`: его пробрасывает
 * пагинация из своего слота `item`. Без него — текст страницы.
 *
 * Selector: li[so-pagination-item], [so-pagination-item]
 */
@Component({
	selector: 'li[so-pagination-item], [so-pagination-item]',
	standalone: true,
	imports: [NgTemplateOutlet, AttributesDirective, TButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './pagination-item.component.html',
})
export class TPaginationItemComponent extends TPaginationItemSurface<IPaginationItem> {
	constructor() {
		super(PaginationItemInputNames, { strategy: 'host', sets: ['attrs', 'dataset'] })
	}

	protected createBinding(
		ctrl: IPaginationItem | undefined,
		inputs: object,
	): TBinding<IPaginationItem, TPaginationItemCollectionFacade> {
		return setupPaginationItem(ctrl, inputs)
	}

	/** Нажатие строки: страница становится текущей — активацией коллекции. */
	protected activate(): void {
		const context = this.facade()?.context

		if (context) context.adapters.activation.active = true
	}
}
