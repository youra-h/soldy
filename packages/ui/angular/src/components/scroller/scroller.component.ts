import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IScroller } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, TextPipe, type TBinding } from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { ScrollerInputNames, TScrollerSurface } from './base.component'
import { setupScroller } from './setup.component'

/**
 * TScrollerComponent — лента произвольного содержимого в одну строку, которую
 * двигают две кнопки.
 *
 * Обёртки нет: корень — сам элемент потребителя (`<div so-scroller>`), ряд из
 * трёх мест — кнопка «назад», вьюпорт, кнопка «вперёд». Классы и все три
 * набора ядра (`attrs` с `dir`, `aria`, `dataset` с `data-can-prev` и
 * `data-can-next` — по ним тема гасит подсказку у края и снимает обе кнопки,
 * когда листать нечего) раскладывает на него `TComponentBase` (стратегия
 * `'host'`). Атрибуты потребителя остаются на корне, как у Vue.
 *
 * Кнопки стоят снаружи вьюпорта намеренно: роль ряда у первого потребителя
 * (`role="listbox"` у тегов) приходит на вьюпорт, а листбокс владеет только
 * опциями — кнопке внутри него места нет. Обработчиков у кнопок нет: клики
 * ловит плагин вьюпорта слушателем на корне и зовёт команды ядра. Значок
 * кнопки — шаблон слота (`<ng-template slot="prev-icon">`): есть ли что-то в
 * `<ng-content>`, Angular не сообщает, а без слота кнопка рисует иконку роли
 * `arrowRight`, у обеих кнопок, — стрелку «назад» зеркалит тема.
 *
 * Содержимое — основная проекция, прямо во вьюпорт: его элементы — прямые
 * дети вьюпорта, по ним тема ставит точки снапа, а плагин считает края.
 *
 * `div[so-scroller]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-scroller], [so-scroller]
 */
@Component({
	selector: 'div[so-scroller], [so-scroller]',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TextPipe,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './scroller.component.html',
})
export class TScrollerComponent extends TScrollerSurface<IScroller> {
	constructor() {
		super(ScrollerInputNames, { strategy: 'host' })
	}

	protected createBinding(ctrl: IScroller | undefined, inputs: object): TBinding<IScroller> {
		return setupScroller(ctrl, inputs)
	}
}
