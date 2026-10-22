import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IDialog } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective } from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { TDialogSurface } from '../../generated/dialog.metadata'
import { setupDialog } from './setup.component'

/**
 * TDialogComponent — модальное окно: по центру или у края экрана, с
 * разворотом на весь экран.
 *
 * Обёртки нет: корень — сам элемент потребителя (`<div so-dialog>`), панель
 * окна, и в цель `target` (по умолчанию `body`) уезжает он же — с классом,
 * атрибутами и обработчиками потребителя, как корень у Vue, где атрибуты
 * переносятся на панель в телепорте вручную. Места «на месте» у окна нет: оно
 * всегда поверх страницы. На корне — классы (место `so-dialog--placement-*`),
 * наборы `aria` (`role="dialog"`, `aria-modal`, `aria-labelledby`), `attrs` и
 * `dataset` (номер слоя `data-layer`, `data-open`, `data-maximized`),
 * раскладка (`z-index` слоя, размер и отступ переменными) и пометка
 * владельцем `dismiss_ownerAttribute`: без неё плагины слоя не нашли бы окно.
 * Раскладывает и переносит всё это `TComponentBase` (стратегия `'host'` со
 * слоем `teleport`); выход плагина на корне он кладёт своим слоем
 * (`plugins`), потому что свой хост шаблон не адресует. `tabindex="-1"` —
 * статика хоста: фокус встаёт на саму панель, когда внутри нечего
 * фокусировать, а атрибут потребителя её перекрывает.
 *
 * Подложка — соседка окна, раньше его в DOM, как у Vue: спутник корня
 * (`#companion` в шаблоне). Её привязки держит шаблон, а ставит прямо перед
 * окном, увозит с ним и прячет вместе с ним база. Внутрь окна её положить
 * нельзя: нажатие по ней стало бы нажатием внутри окна.
 *
 * Открытость — `visible`, как у Vue (`v-model:visible`): закрытое окно
 * спрятано вместе с подложкой, а не убрано, и состояние содержимого
 * переживает закрытие. Потребитель слышит её выходом `(soChangeVisible)`.
 * `rendered=false` прячет окно, а не снимает: элемент написал потребитель.
 *
 * Слой есть только в браузере, как оверлей CDK: на сервере, до первой
 * отрисовки и без цели окна нет — от него остаётся пустой скрытый элемент
 * потребителя, а шаблон рисует содержимое, только пока окно на своём месте
 * (`placed`). Поэтому и гидратации у слоя нет (`ngSkipHydration` статикой
 * хоста), как у Frame: всё, что написано внутри `<div so-dialog>`, браузер
 * строит сам.
 *
 * Заголовок и подвал — слоты по атрибуту (`<span slot="title">`,
 * `<button so-button slot="footer">`), содержимое — основная проекция в теле.
 * Кнопки шапки есть, только пока они заданы (`@if`, а не `rendered` кнопки:
 * тема опирается на их отсутствие в DOM). Значки кнопок — шаблоны слотов
 * `close-icon`, `maximize-icon` и `restore-icon`, без них — иконки ролей.
 *
 * Логики здесь нет: нажатие мимо, фокус, Tab, Escape, немой фон и замок
 * прокрутки ведут плагины (см. `setupDialog`). Крестик только просит окно
 * закрыться (`requestClose('button')`), разворот переключает `maximized`.
 *
 * Angular вставляет и переставляет узлы относительно своих: окно — первый
 * узел представления `@for`, перед которым вставляют или которое
 * переставляют, — роняет его с NG05106, как Frame. Обход — обёртка-элемент.
 *
 * `div[so-dialog]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-dialog], [so-dialog]
 */
@Component({
	selector: 'div[so-dialog], [so-dialog]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { tabindex: '-1', ngSkipHydration: 'true' },
	templateUrl: './dialog.component.html',
})
export class TDialogComponent extends TDialogSurface<IDialog> {
	constructor() {
		super(setupDialog, {
			strategy: 'host',
			teleport: { target: 'target', companion: true },
			plugins: ['dismiss_ownerAttribute'],
		})
	}
}
