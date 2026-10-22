import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IPopover } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective } from '../../adapter'
import { TButtonComponent } from '../button'
import { TFrameComponent } from '../frame'
import { TIconComponent } from '../icon'
import { TPopoverSurface } from '../../generated/popover.metadata'
import { setupPopover } from './setup.component'

/**
 * TPopoverComponent — панель с произвольным содержимым у триггера:
 * немодальный диалог.
 *
 * Обёртки нет: корень — сам элемент потребителя (`<span so-popover>`),
 * обёртка триггера и якорь панели. Строчный тег по умолчанию — затем же, что у
 * Vue: поповер встаёт и в строку текста, и в ряд тегов. На корне — наборы
 * `attrs` и `dataset` (`data-open` — для темы и для потребителя, который
 * красит свой триггер по контексту); ARIA на корне нет — она у панели и у
 * триггера. Раскладывает их `TComponentBase` (стратегия `'host'`).
 *
 * Триггер — шаблон слота со scope (`<ng-template slot="trigger"
 * let-triggerAria="triggerAria" let-triggerDataset="triggerDataset">`): своего
 * экземпляра у содержимого слота нет, и связку с панелью (`aria-haspopup`,
 * `aria-expanded`, `aria-controls`) и вид «нажат» (`data-selected`) он
 * получает двумя наборами, а на свой элемент кладёт их директивой
 * `[so-attributes]`. Лежит триггер внутри корня, поэтому нажатие по открытому
 * триггеру — нажатие внутри владельца, и панель не мигает. Связка меняется на
 * каждое открытие, а триггер остаётся тем же узлом: вывод шаблона отдаёт новый
 * контекст тому же представлению, и фокус на триггере переживает открытие и
 * закрытие.
 *
 * Панель — Frame в шаблоне: телепорт, слой, привязка к корню, пометка
 * владельцем. Якорь — корень, его узел шаблону отдаёт база (`rootElement()`):
 * на сервере и до первой отрисовки его нет, как и самого слоя. Открытость —
 * `visible` панели, а не `rendered`: закрытие её прячет, а не размонтирует.
 * `contained` оставляет панель в корне: она прижата к краю (`edge`)
 * ближайшего позиционированного предка.
 *
 * Содержимое — основная проекция, в обёртке `.so-popover__content`;
 * `lazyMount` убирает его из документа до первого открытия, но компоненты в
 * нём Angular создаёт всё равно — их создаёт тот, кто написал содержимое, как в
 * панели таба. Крестик есть, только пока поповер можно закрыть (`@if`, а не
 * `rendered` кнопки: скрытая кнопка со своими плагинами стояла бы в каждой
 * панели), его значок — шаблон слота `close-icon`, без него — иконка роли
 * `close`.
 *
 * Логики здесь нет: клик по триггеру, нажатие и фокус мимо, фокус, Escape, Tab
 * и жест ведут плагины (см. `setupPopover`). Крестик только ставит
 * `open = false`, а куда вернуть фокус, решает плагин фокуса.
 *
 * `span[so-popover]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: span[so-popover], [so-popover]
 */
@Component({
	selector: 'span[so-popover], [so-popover]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TFrameComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './popover.component.html',
})
export class TPopoverComponent extends TPopoverSurface<IPopover> {
	constructor() {
		super(setupPopover, { strategy: 'host', sets: ['attrs', 'dataset'] })
	}

	/** Клик по крестику: поповер закрыт. Куда вернуть фокус, решает плагин фокуса. */
	protected close(): void {
		const popover = this.instance()

		if (popover) popover.open = false
	}
}
