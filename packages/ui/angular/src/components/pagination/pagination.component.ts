import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IPagination, TPaginationCollectionFacade } from '@soldy-ui/core'
import {
	AttributesDirective,
	RoleIconDirective,
	SlotDirective,
	provideElevator,
	type TBinding,
} from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { TPaginationItemComponent } from './item'
import { PaginationInputNames, TPaginationSurface } from './base.component'
import { setupPagination } from './setup.component'

/**
 * TPaginationComponent — постраничная навигация: стрелка «назад», список
 * страниц, стрелка «вперёд».
 *
 * Обёртки нет: корень — сам элемент потребителя, `<nav so-pagination>`,
 * ориентир для скринридера. Имя ему даёт приложение — `aria_label` или
 * `aria_labelledBy`: что листают, знает только оно. Классы (`--size-*`,
 * `--variant-*`), наборы ядра и `data-disabled` раскладывает на корень
 * `TComponentBase` (стратегия `'host'`).
 *
 * Контекстов два — свой и фасада коллекции (`setupPagination`), и вход фасада
 * `engine` — вход того же элемента. Свой слой лифта пагинация отдаёт поддереву
 * провайдером (`provideElevator()`): страницы прочтут из слоя движок этой
 * пагинации.
 *
 * Страницы и пропуски — по порядку окна (`cells`): страница — внутренняя
 * часть `<li so-pagination-item>`, пропуск — разметка владельца. Петля — по
 * ключу места (`track cell.key`): записи окна новые на каждую смену, а
 * страница, оставшаяся на экране при сдвиге окна, — тот же экземпляр и тот же
 * узел, и фокус с неё не слетает. Содержимого у пагинации нет: страницы кладёт
 * в коллекцию она сама, а содержимое страницы — слот `item`, который получает
 * страницу через scope. Значки стрелок — шаблоны слотов `prev-icon` и
 * `next-icon`: есть ли что-то в `<ng-content>`, Angular не сообщает.
 *
 * Стрелки — `prev()` и `next()` пагинации, методы инстанса, как обработчик
 * `@click` во Vue; выключенность считает пагинация (`prevDisabled`,
 * `nextDisabled`), имена — плагин имён по локали поддерева.
 *
 * `nav[so-pagination]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: nav[so-pagination], [so-pagination]
 */
@Component({
	selector: 'nav[so-pagination], [so-pagination]',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		SlotDirective,
		TButtonComponent,
		TIconComponent,
		TPaginationItemComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './pagination.component.html',
})
export class TPaginationComponent extends TPaginationSurface<IPagination> {
	constructor() {
		super(PaginationInputNames, { strategy: 'host' })
	}

	protected createBinding(
		ctrl: IPagination | undefined,
		inputs: object,
	): TBinding<IPagination, TPaginationCollectionFacade> {
		return setupPagination(ctrl, inputs, this.engine)
	}
}
