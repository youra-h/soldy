import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IInput } from '@soldy-ui/core'
import {
	AttributesDirective,
	FieldTextDirective,
	RoleIconDirective,
	provideElevator,
	type TBinding,
} from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { InputInputNames, TInputSurface } from './base.component'
import { setupInput } from './setup.component'

/**
 * TInputComponent — текстовое поле: корень и `<input>` внутри, по сторонам —
 * слоты `leading` и `trailing`.
 *
 * Селектор — элементный, `<so-input>`: у поля атрибуты потребителя делятся
 * между корнем и вложенным `<input>`, и корнем служит сам элемент компонента.
 * Наборы ядра стоят на разных элементах: `attrs` (`dir`) и `dataset`
 * (`data-disabled`, `data-invalid`) — на корне, их кладёт `TComponentBase`
 * (стратегия `'host'`): тема красит коробку поля и подпись поля формы
 * `Field` по корню; `aria` — на `<input>`, его кладёт директива набора
 * (`AttributesDirective`). Нативные `disabled`,
 * `readonly` и `required` поля проводит разметка, поэтому ARIA-дублей ядро
 * рядом с ними не пишет. Статические атрибуты, которые потребитель записал на
 * поле (`autocomplete`), кроме `class` и `style`, база переносит на `<input>`
 * (`control`).
 *
 * Текст поля ведёт ядро: в ядро его несёт плагин ввода, в узел — директива
 * текста поля (`FieldTextDirective`), и только когда текст разошёлся с узлом:
 * привязка `[value]` писала бы узлу его же текст на каждое нажатие.
 *
 * Слоты стоят по сторонам поля, а не внутри него: `<input>` детей не имеет.
 * Обёртка слота рисуется, только если в неё есть что положить; содержимое
 * получает сам инстанс поля — кнопке рядом с полем нужны его значение и
 * методы (`<ng-template slot="leading" let-ctrl="ctrl">`).
 *
 * Кнопка очистки — первой в обёртке у конца поля, перед `trailing`, как у
 * Vue: по `clearable`, выключена вместе с полем, `readonly` её не гасит:
 * select-only Select и есть `readonly`, а очистка там работает. Имя ядро
 * собирает с именем поля (`clearAria`), и на кнопку его кладёт директива
 * набора — поверх того, что кнопка пишет себе сама. Очищает команда поля
 * `clear`. Своя кнопка — слот `clear` с командой в scope: заменяет встроенную
 * целиком и рисуется, когда задана.
 *
 * У кнопки нет `view`: значения вида объявляет тема, и разметка библиотеки их
 * не знает. Кнопку тема красит по контексту (`.so-input__clear`).
 *
 * Поле формы `Field` над полем отдаёт ему ошибку, `id` и ссылки на части, а
 * своему содержимому поле опускает пустую связку — в свой слой лифта
 * (`provideElevator()`): контролы в его слотах — его содержимое.
 *
 * Selector: so-input
 */
@Component({
	selector: 'so-input',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		FieldTextDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './input.component.html',
})
export class TInputComponent extends TInputSurface<IInput> {
	constructor() {
		super(InputInputNames, { strategy: 'host', sets: ['attrs', 'dataset'], control: true })
	}

	protected createBinding(ctrl: IInput | undefined, inputs: object): TBinding<IInput> {
		return setupInput(ctrl, inputs)
	}

	/**
	 * Клик кнопки очистки — нативный: всплытие гасится у самого события, и
	 * предок, который слушает клик по полю (select-only Select открывает по
	 * нему панель), его не получит, как у Vue `@click.stop`.
	 */
	protected clearClick(event: Event): void {
		event.stopPropagation()
		this.instance()?.clear()
	}
}
