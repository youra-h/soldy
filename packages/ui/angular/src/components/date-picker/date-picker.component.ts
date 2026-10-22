import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IDatePicker } from '@soldy-ui/core'
import {
	AttributesDirective,
	RoleIconDirective,
	SlotDirective,
	provideElevator,
} from '../../adapter'
import { TButtonComponent } from '../button'
import { TCalendarComponent } from '../calendar'
import { TDateInputComponent } from '../date-input'
import { TFrameComponent } from '../frame'
import { TIconComponent } from '../icon'
import { TDatePickerSurface } from '../../generated/date-picker.metadata'
import { setupDatePicker } from './setup.component'

/**
 * TDatePickerComponent — поле даты и календарь в панели, как Select — поле и
 * список (APG, Date Picker Dialog).
 *
 * Селектор атрибутный, как у Select: `<div so-date-picker>`. Корень — сам
 * элемент потребителя, якорь панели, и всё, что потребитель на нём написал,
 * остаётся на нём, как у Vue: на корне `id` DatePicker'а — его кладёт база
 * (`TRootSpec.id`), — наборы `attrs`, `dataset` (`data-open`,
 * `data-disabled`) и набор корня `rootAria` слоем `aria`: у диапазона корень —
 * группа полей концов со своим именем, у одной даты группа — само поле, и
 * набор пуст. Раскладывает их `TComponentBase` (стратегия `'host'`). Своей
 * коробки у корня одной даты нет, у диапазона корень и есть коробка поля
 * (`--range`).
 *
 * Поля — готовые DateInput над экземплярами ядра DatePicker
 * (`[ctrl]="instance()?.field"`, у диапазона — `start` и `end`): у одной даты
 * поле и есть группа частей, и имя DatePicker'а с его набором `aria` уходит
 * ему. Кнопки очистки и календаря у одной даты — шаблоны слотов поля `clear`
 * и `trailing`, у диапазона — после поля конца. Календарь — Calendar над
 * экземпляром и движком DatePicker'а в панели — Frame, как у Select:
 * телепорт, слой, якорь — корень (`rootElement()`), пометка владельцем.
 * Подвал «Отмена» и «OK» — шаблон `footer` календарю, только при
 * `confirmable`.
 *
 * Общего полям и календарю — `disabled`, `min`, `locale` и прочего — разметка
 * не пробрасывает: его раздаёт ядро. Слоты — шаблоны: `clear` (команда
 * DatePicker'а в scope), `trigger-icon`, `item` (`let-item`, `let-text`) —
 * содержимое дня, его DatePicker отдаёт календарю под тем же именем.
 *
 * Логики здесь нет: открытие, фокус, жест и закрытие ведут плагины (см.
 * `setupDatePicker`). Обработчики в разметке — клики кнопок, методами
 * компонента: очистка зовёт команду DatePicker'а, «Отмена» закрывает панель,
 * «OK» принимает выбор.
 *
 * Поле формы `Field` над DatePicker связывается с ним, а не с его полями, а
 * своему содержимому DatePicker опускает пустую связку — в свой слой лифта
 * (`provideElevator()`): поля, календарь и контролы в слотах — его
 * содержимое.
 *
 * `div[so-date-picker]` стоит первым: по первому селектору Angular выбирает
 * тег хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра
 * по умолчанию.
 *
 * Selector: div[so-date-picker], [so-date-picker]
 */
@Component({
	selector: 'div[so-date-picker], [so-date-picker]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		SlotDirective,
		TButtonComponent,
		TCalendarComponent,
		TDateInputComponent,
		TFrameComponent,
		TIconComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './date-picker.component.html',
})
export class TDatePickerComponent extends TDatePickerSurface<IDatePicker> {
	constructor() {
		super(setupDatePicker, { strategy: 'host', aria: 'rootAria', id: 'id' })
	}

	/**
	 * Клик кнопки очистки — нативный: всплытие гасится у самого события, и
	 * предок, который слушает клик по DatePicker, его не получит, как у Vue
	 * `@click.stop`. Очищает команда DatePicker'а — оба конца у диапазона.
	 */
	protected clearClick(event: Event): void {
		event.stopPropagation()
		this.instance()?.clear()
	}

	/**
	 * «Отмена» подвала: панель закрыта. Черновик выбора сбрасывает само
	 * закрытие, куда вернуть фокус, решает плагин фокуса.
	 */
	protected close(): void {
		const picker = this.instance()

		if (picker) picker.open = false
	}
}
