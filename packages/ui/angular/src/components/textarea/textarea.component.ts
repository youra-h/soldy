import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { ITextarea } from '@soldy-ui/core'
import {
	AttributesDirective,
	FieldTextDirective,
	provideElevator,
	type TBinding,
} from '../../adapter'
import { TextareaInputNames, TTextareaSurface } from './base.component'
import { setupTextarea } from './setup.component'

/**
 * TTextareaComponent — многострочное поле: корень и `<textarea>` внутри, под
 * ним — счётчик символов.
 *
 * Селектор — элементный, `<so-textarea>`, как у Input: у поля атрибуты
 * потребителя делятся между корнем и вложенной `<textarea>`, и корнем служит
 * сам элемент компонента. Наборы ядра стоят на разных элементах: `attrs`
 * (`dir`) и `dataset` (`data-disabled`, `data-invalid`, `data-limit`) — на
 * корне, их кладёт `TComponentBase` (стратегия `'host'`): тема красит рамку и
 * счётчик по корню; `aria` — на `<textarea>`, его кладёт директива набора
 * (`AttributesDirective`). Нативные `rows`, `maxlength`, `disabled`,
 * `readonly` и `required` поля проводит разметка, поэтому ARIA-дублей ядро
 * рядом с ними не пишет. Статические атрибуты, которые потребитель записал на
 * поле (`autocomplete`), кроме `class` и `style`, база переносит на
 * `<textarea>` (`control`).
 *
 * Текст поля ведёт ядро: в ядро его несёт плагин ввода, в узел — директива
 * текста поля (`FieldTextDirective`), и только когда текст разошёлся с узлом:
 * привязка `[value]` писала бы узлу его же текст на каждое нажатие. Высоту по
 * тексту пишет в узел плагин автороста.
 *
 * Счётчик — только при `counter`: текст «12 / 200» пишет плагин имён по
 * локали поддерева (`names_counter`), а набор `counterAria` несёт его `id`.
 * Поле ссылается на него `aria-describedby`, и текст звучит на фокусе поля, а
 * не живым регионом на каждый символ.
 *
 * Поле формы `Field` над полем отдаёт ему ошибку, `id` и ссылки на части, а в
 * свой слой лифта (`provideElevator()`) поле опускает пустую связку, как Input.
 *
 * Selector: so-textarea
 */
@Component({
	selector: 'so-textarea',
	standalone: true,
	imports: [AttributesDirective, FieldTextDirective],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './textarea.component.html',
})
export class TTextareaComponent extends TTextareaSurface<ITextarea> {
	constructor() {
		super(TextareaInputNames, { strategy: 'host', sets: ['attrs', 'dataset'], control: true })
	}

	protected createBinding(ctrl: ITextarea | undefined, inputs: object): TBinding<ITextarea> {
		return setupTextarea(ctrl, inputs)
	}
}
