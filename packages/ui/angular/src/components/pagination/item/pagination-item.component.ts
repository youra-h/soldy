import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IPaginationItem } from '@soldy-ui/core'
import { AttributesDirective } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TPaginationItemSurface } from '../../../generated/pagination-item.metadata'
import { setupPaginationItem } from './setup.component'

/**
 * Страница пагинации — внутренняя часть: её рисует только пагинация, по одной на
 * страницу окна. Текущая — не выключенная кнопка: каждая страница — своя остановка Tab.
 */
@Component({
	selector: 'li[so-pagination-item], [so-pagination-item]',
	imports: [NgTemplateOutlet, AttributesDirective, TButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './pagination-item.component.html',
})
export class TPaginationItemComponent extends TPaginationItemSurface<IPaginationItem> {
	constructor() {
		super(setupPaginationItem, { strategy: 'host', sets: ['attrs', 'dataset'] })
	}

	/** Нажатие строки: страница становится текущей — активацией коллекции. */
	protected activate(): void {
		const context = this.facade()?.context

		if (context) context.adapters.activation.active = true
	}
}
