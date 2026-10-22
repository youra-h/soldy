import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IDateInput } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, provideElevator } from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { TDateInputSurface } from '../../generated/date-input.metadata'
import { setupDateInput } from './setup.component'

/**
 * TDateInputComponent — поле даты из частей по формату локали: день, месяц и
 * год, а у поля даты и времени — ещё час, минута, с точностью до секунды
 * секунда и, у 12-часового цикла, период суток. По сторонам ряда частей —
 * слоты `leading` и `trailing`, последним — скрытое поле формы с датой.
 *
 * Селектор атрибутный, как у Input: `<div so-date-input>`. Корень — сам
 * элемент потребителя, коробка поля семьи Input, и всё, что потребитель на
 * нём написал, остаётся на нём, как у Vue: поля ввода, между которым делить
 * написанное, у даты нет, части — разметка с наборами ядра. На корне все три
 * набора ядра — `attrs` (`dir` поля), `aria` (`role="group"`, имя —
 * `aria_label` или `aria_labelledBy`) и `dataset` (`data-disabled`,
 * `data-invalid`) — и `id` поля: Vue пишет `:id` на корень, а у Angular `id`
 * — вход, и на корень его кладёт база (`TRootSpec.id`). Раскладывает всё это
 * `TComponentBase` (стратегия `'host'`).
 *
 * Части — разметка, а не компоненты: своего экземпляра у части нет, наборы
 * отдаёт ядро значением (`segments`). Текст части — свойством узла
 * (`textContent`), одним текстовым узлом: на касании часть редактируемая, и
 * браузер оставляет её пустой или из своих узлов, а следующий текст ядра
 * ложится в неё целиком.
 *
 * Обработчик в разметке один — клик кнопки очистки: клавиши, указатель, буфер
 * обмена и касание ловят плагины поля на корне и переводят в команды ядра.
 * Кнопка очистки — как у Input: первой в обёртке у конца поля, перед
 * `trailing`, по `clearable`, выключена вместе с полем, `readonly` её не
 * гасит. Имя ядро собирает с именем поля (`clearAria`), очищает команда поля
 * `clear` — все части, и скрытые форматом тоже. Своя кнопка — слот `clear` с
 * командой в scope. Вида у кнопки нет: значения вида объявляет тема, и красит
 * она кнопку по контексту (`.so-date-input__clear`).
 *
 * Слоты — шаблоны со scope, как у Input: `leading` и `trailing` получают сам
 * инстанс поля (`<ng-template slot="trailing" let-ctrl="ctrl">`) — в
 * `trailing` DatePicker ставит кнопку календаря.
 *
 * Поле формы `Field` над полем отдаёт ему ошибку и ссылки на подпись и
 * справку, а своему содержимому поле опускает пустую связку — в свой слой
 * лифта (`provideElevator()`): контролы в его слотах — его содержимое.
 *
 * `div[so-date-input]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-date-input], [so-date-input]
 */
@Component({
	selector: 'div[so-date-input], [so-date-input]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './date-input.component.html',
})
export class TDateInputComponent extends TDateInputSurface<IDateInput> {
	constructor() {
		super(setupDateInput, { strategy: 'host', id: 'id' })
	}

	/**
	 * Клик кнопки очистки — нативный: всплытие гасится у самого события, и
	 * предок, который слушает клик по полю, его не получит, как у Vue
	 * `@click.stop`.
	 */
	protected clearClick(event: Event): void {
		event.stopPropagation()
		this.instance()?.clear()
	}
}
