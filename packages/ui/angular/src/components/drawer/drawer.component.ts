import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IDrawer } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective } from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { TDrawerSurface } from '../../generated/drawer.metadata'
import { setupDrawer } from './setup.component'

/**
 * TDrawerComponent — выезжающая панель у края экрана или контейнера;
 * смахивается жестом.
 *
 * Обёртки нет: корень — сам элемент потребителя (`<div so-drawer>`), панель, и
 * в цель `target` (по умолчанию `body`) уезжает он же — с классом, атрибутами
 * и обработчиками потребителя, как корень у Vue. `contained` оставляет панель
 * на месте: она встаёт в ближайшем позиционированном предке и прокрутку
 * документа не запирает. На корне — классы (край `so-drawer--placement-*`),
 * наборы `aria` (`role="dialog"`, `aria-modal`, `aria-labelledby`), `attrs` и
 * `dataset` (номер слоя `data-layer`, `data-open`, `data-swiping`,
 * `data-contained`), раскладка (`z-index` слоя, размер переменными) и пометка
 * владельцем `dismiss_ownerAttribute`. Раскладывает и переносит всё это
 * `TComponentBase` (стратегия `'host'` со слоем `teleport`), выход плагина на
 * корне — своим слоем (`plugins`). Сдвиг во время жеста (`--so-swipe-offset`)
 * плагин жеста пишет в корень сам, мимо разметки, и база его не трогает.
 * `tabindex="-1"` — статика хоста: фокус встаёт на саму панель, когда внутри
 * нечего фокусировать.
 *
 * Подложка — соседка панели, раньше её в DOM, как у Vue: спутник корня
 * (`#companion` в шаблоне). Её привязки держит шаблон, а ставит прямо перед
 * панелью — в цели и на месте, — увозит и возвращает с ней и прячет вместе с
 * ней база.
 *
 * Открытость — `visible`, как у Vue (`v-model:visible`): закрытая панель
 * спрятана вместе с подложкой, а не убрана. Потребитель слышит её выходом
 * `(soChangeVisible)`. `rendered=false` прячет панель, а не снимает.
 *
 * Слой есть только в браузере, как оверлей CDK, и с `contained` тоже: на
 * сервере, до первой отрисовки и без цели панели нет — от неё остаётся пустой
 * скрытый элемент потребителя. Гидратации у слоя нет (`ngSkipHydration`
 * статикой хоста), как у Frame: всё, что написано внутри `<div so-drawer>`,
 * браузер строит сам.
 *
 * Заголовок и подвал — слоты по атрибуту (`<span slot="title">`,
 * `<button so-button slot="footer">`), содержимое — основная проекция в теле.
 * Полоса жеста и крестик есть, только пока они нужны (`@if`): тема опирается
 * на их отсутствие в DOM. Значок крестика — шаблон слота `close-icon`, без
 * него — иконка роли `close`.
 *
 * Логики здесь нет: нажатие мимо, фокус, Tab, Escape, немой фон, замок
 * прокрутки и жест ведут плагины (см. `setupDrawer`). Крестик только просит
 * панель закрыться (`requestClose('button')`).
 *
 * Angular вставляет и переставляет узлы относительно своих: панель — первый
 * узел представления `@for`, перед которым вставляют или которое
 * переставляют, — роняет его с NG05106, как Frame. Обход — обёртка-элемент.
 *
 * `div[so-drawer]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-drawer], [so-drawer]
 */
@Component({
	selector: 'div[so-drawer], [so-drawer]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { tabindex: '-1', ngSkipHydration: 'true' },
	templateUrl: './drawer.component.html',
})
export class TDrawerComponent extends TDrawerSurface<IDrawer> {
	constructor() {
		super(setupDrawer, {
			strategy: 'host',
			teleport: { target: 'target', contained: 'contained', companion: true },
			plugins: ['dismiss_ownerAttribute'],
		})
	}
}
