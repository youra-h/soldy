import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IFrame } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import { FrameInputNames, TFrameSurface } from './base.component'
import { setupFrame } from './setup.component'

/**
 * TFrameComponent — слой поверх страницы: панель, которая уходит в цель
 * `target` (по умолчанию `body`), из-под `overflow` и контекстов наложения
 * предков.
 *
 * Обёртки нет: корень — сам элемент потребителя (`<div so-frame>`), и в цель
 * уезжает он же. Класс, атрибуты и обработчики потребителя остаются на панели
 * без проброса — как во Vue, где у Frame `inheritAttrs: false` и атрибуты
 * переносятся на узел внутри телепорта вручную. Переносит корень база
 * (`TComponentBase`, стратегия `'host'` со слоем `teleport`): цель и «на
 * месте» она читает из выходов `target` и `contained`, которые называет
 * компонент. Там же — классы, наборы, скрытие и раскладка (`position`,
 * координаты, `z-index` слоя).
 *
 * Показанный Frame получает номер слоя: он же `z-index` раскладки и
 * `data-layer` набора `dataset`, по нему плагины оверлея узнают вложенность.
 *
 * На сервере панель стоит на месте скрытой и уезжает в цель после
 * гидратации; без цели — тоже на месте и скрыта. `contained` оставляет
 * панель на месте — и на сервере: она встаёт в ближайшем позиционированном
 * предке.
 *
 * `div[so-frame]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-frame], [so-frame]
 */
@Component({
	selector: 'div[so-frame], [so-frame]',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './frame.component.html',
})
export class TFrameComponent extends TFrameSurface<IFrame> {
	constructor() {
		super(FrameInputNames, {
			strategy: 'host',
			teleport: { target: 'target', contained: 'contained' },
		})
	}

	protected createBinding(ctrl: IFrame | undefined, inputs: object): TBinding<IFrame> {
		return setupFrame(ctrl, inputs)
	}
}
