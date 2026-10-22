import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { ITextarea } from '@soldy-ui/core'
import { AttributesDirective, FieldTextDirective, provideElevator } from '../../adapter'
import { TTextareaSurface } from '../../generated/textarea.metadata'
import { setupTextarea } from './setup.component'

/**
 * TTextareaComponent — многострочное поле: корень и `<textarea>` внутри, под
 * ним — счётчик символов.
 *
 * Селектор атрибутный, как у Input: `<div so-textarea>`. Корень — сам элемент
 * потребителя, а написанное на нём делится между корнем и вложенной
 * `<textarea>`. На саму `<textarea so-textarea>` компонент не встаёт: шаблон в
 * поле с текстом не отрисуется, и база такой хост называет ошибкой. Наборы
 * ядра стоят на разных элементах: `attrs` (`dir`) и `dataset`
 * (`data-disabled`, `data-invalid`, `data-limit`) — на корне, их кладёт
 * `TComponentBase` (стратегия `'host'`): тема красит рамку и счётчик по
 * корню; `aria` — на `<textarea>`, его кладёт директива набора
 * (`AttributesDirective`). Нативные `rows`, `maxlength`, `disabled`,
 * `readonly` и `required` поля проводит разметка, поэтому ARIA-дублей ядро
 * рядом с ними не пишет. Всё, что потребитель записал на поле, кроме `class`
 * и `style`, — `autocomplete`, `[attr.aria-describedby]`, `(focus)` — доходит
 * до `<textarea>` (`control`): статику переносит база, привязки и слушатели —
 * рендерер адаптера (`provideAttrs()`).
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
 * `div[so-textarea]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-textarea], [so-textarea]
 */
@Component({
	selector: 'div[so-textarea], [so-textarea]',
	imports: [AttributesDirective, FieldTextDirective],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './textarea.component.html',
})
export class TTextareaComponent extends TTextareaSurface<ITextarea> {
	constructor() {
		super(setupTextarea, { strategy: 'host', sets: ['attrs', 'dataset'], control: true })
	}
}
