import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { INumberInput } from '@soldy-ui/core'
import {
	AttributesDirective,
	FieldTextDirective,
	RoleIconDirective,
	TextPipe,
	provideElevator,
} from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { TNumberInputSurface } from '../../generated/number-input.metadata'
import { setupNumberInput } from './setup.component'

/**
 * TNumberInputComponent — поле числа: ввод и кнопки шага «меньше» и «больше»,
 * по сторонам ввода — слоты `leading` и `trailing`, последним — скрытое поле
 * формы с числом.
 *
 * Селектор атрибутный, как у Input: `<div so-number-input>`. Корень — сам
 * элемент потребителя, коробка поля семьи Input, а написанное на нём делится
 * между корнем и вводом, как у Vue и React. Наборы ядра стоят на разных
 * элементах: `attrs` (`dir` поля) и `dataset` (`data-disabled`,
 * `data-invalid`) — на корне, их кладёт `TComponentBase` (стратегия
 * `'host'`): тема красит коробку и подпись поля формы `Field` по корню; на
 * вводе — `inputAttrs` (`dir` и `lang` числа, `inputmode`), `aria` и
 * `inputAria` (роль `spinbutton` и `aria-value*`), их кладёт директива набора
 * (`AttributesDirective`) одним объектом. Нативные `disabled`, `readonly` и
 * `required` ввода проводит разметка. Всё, что потребитель записал на поле,
 * кроме `class` и `style`, — `autocomplete`, `[attr.aria-describedby]`,
 * `(focus)` — доходит до ввода (`control`): статику переносит база, привязки и
 * слушатели — рендерер адаптера (`provideAttrs()`). Скрытое поле формы
 * атрибутов потребителя не получает: оно — значение для формы, а не поле.
 *
 * Текст ввода — буфер правки ядра (`text`), а не значение: пока набирают,
 * набранное, после — строка формата. В узел его пишет директива текста поля
 * (`FieldTextDirective`), только когда он разошёлся с узлом; правку, которую
 * ядро не взяло, плагин набора возвращает сам. На сервере текст уходит
 * атрибутом `value` — в формате локали поддерева.
 *
 * Обработчик в разметке один — клик кнопки очистки: набор, клавиши шага и
 * кнопки шага с удержанием ловят плагины на корне. Кнопки шага — Button-детали
 * с классами, по которым их находит плагин кнопок, не остановки Tab, фокус не
 * забирают. Выключена кнопка у своего края, у выключенного поля и только для
 * чтения (`decrementDisabled`, `incrementDisabled`). Значок — шаблон слота
 * (`<ng-template slot="decrement-icon">`): есть ли что-то в `<ng-content>`,
 * Angular не сообщает, а без слота кнопка рисует иконку роли `minus` или
 * `plus`.
 *
 * Кнопка очистки — как у Input: первой в обёртке у конца числа, перед
 * `trailing`, по `clearable`, выключена вместе с полем, `readonly` её не
 * гасит. Имя ядро собирает с именем поля (`clearAria`), очищает команда поля
 * `clear` — и значение, и набранный текст. Своя кнопка — слот `clear` с
 * командой в scope.
 *
 * Вида у кнопок нет: значения вида объявляет тема, и разметка библиотеки их
 * не знает. Кнопки тема красит по контексту (`.so-number-input__clear`,
 * `.so-number-input__decrement`).
 *
 * Поле формы `Field` над полем отдаёт ему ошибку, `id` и ссылки на части, а
 * своему содержимому поле опускает пустую связку — в свой слой лифта
 * (`provideElevator()`): контролы в его слотах — его содержимое.
 *
 * `div[so-number-input]` стоит первым: по первому селектору Angular выбирает
 * тег хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра
 * по умолчанию.
 *
 * Selector: div[so-number-input], [so-number-input]
 */
@Component({
	selector: 'div[so-number-input], [so-number-input]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		FieldTextDirective,
		RoleIconDirective,
		TextPipe,
		TButtonComponent,
		TIconComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './number-input.component.html',
})
export class TNumberInputComponent extends TNumberInputSurface<INumberInput> {
	constructor() {
		super(setupNumberInput, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
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
