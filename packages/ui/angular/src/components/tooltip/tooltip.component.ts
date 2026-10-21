import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITooltip } from '@soldy-ui/core'
import { AttributesDirective, type TBinding } from '../../adapter'
import { TFrameComponent } from '../frame'
import { TTooltipSurface, TooltipInputNames } from './base.component'
import { setupTooltip } from './setup.component'

/**
 * TTooltipComponent — подсказка у триггера.
 *
 * Обёртки нет: корень — сам элемент потребителя (`<span so-tooltip>`),
 * обёртка триггера, якорь панели и цель наведения: панель увезена, и курсор на
 * триггере — курсор на корне. Строчный тег по умолчанию — затем же, что у
 * Vue: подсказка встаёт и в строку текста, и в ряд кнопок. На корне — наборы
 * `attrs` и `dataset`, ARIA на корне нет — она у панели и у триггера.
 * Раскладывает их `TComponentBase` (стратегия `'host'`).
 *
 * Триггер — шаблон слота со scope (`<ng-template slot="trigger"
 * let-triggerAria="triggerAria">`): ссылку на панель — `aria-describedby`, а
 * при `type="label"` `aria-labelledby` — он получает в наборе и кладёт на свой
 * элемент директивой `[so-attributes]`. Фокус остаётся на триггере, а сам
 * триггер — тем же узлом при показе и смене `type`: вывод шаблона отдаёт новый
 * контекст тому же представлению.
 *
 * Панель — Frame в шаблоне: телепорт, слой, привязка к корню — по умолчанию
 * над триггером по центру, в 6 px от него — и пометка владельцем, по которой
 * панель находят плагины. Якорь — корень, его узел шаблону отдаёт база
 * (`rootElement()`). Открытость — `visible` панели: закрытая спрятана, а не
 * размонтирована, и ссылка триггера ведёт на неё всегда. `rendered` подсказки
 * панель получает сама: корень Angular только прячется, а панель увезена в
 * `body`.
 *
 * Логики здесь нет: наведение, фокус, нажатие и Escape ведут плагины (см.
 * `setupTooltip`).
 *
 * `span[so-tooltip]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: span[so-tooltip], [so-tooltip]
 */
@Component({
	selector: 'span[so-tooltip], [so-tooltip]',
	standalone: true,
	imports: [NgTemplateOutlet, AttributesDirective, TFrameComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tooltip.component.html',
})
export class TTooltipComponent extends TTooltipSurface<ITooltip> {
	constructor() {
		super(TooltipInputNames, { strategy: 'host', sets: ['attrs', 'dataset'] })
	}

	protected createBinding(ctrl: ITooltip | undefined, inputs: object): TBinding<ITooltip> {
		return setupTooltip(ctrl, inputs)
	}
}
