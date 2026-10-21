import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ISlider } from '@soldy-ui/core'
import {
	AttributesDirective,
	FieldTextDirective,
	TextPipe,
	provideElevator,
	type TBinding,
} from '../../adapter'
import { SliderInputNames, TSliderSurface } from './base.component'
import { setupSlider } from './setup.component'

/**
 * TSliderComponent — ползунок: ручки на рельсе, заливка и метки.
 *
 * Обёртки нет: корень — сам элемент потребителя (`<span so-slider>`). Корень
 * по умолчанию — `span`: ползунок кладут в подпись `Label`, а внутри `label`
 * HTML разрешает только строчную разметку, поэтому и всё внутри — `span`.
 * Классы (ось, режим подсказки, размер, вариант), `attrs` (`dir`) и `dataset`
 * (`data-disabled`, `data-dragging`) раскладывает на корень `TComponentBase`
 * (стратегия `'host'`), а слоем `aria` — набор корня `rootAria` (описание
 * корня `aria`): у нескольких ручек корень — группа с именем и описанием
 * ползунка, у одной набор пуст, и `aria` ползунка уходит полю ручки.
 *
 * Атрибуты потребителя остаются на корне, как у Vue: полей столько, сколько
 * ручек, и разделения между корнем и полем (`control`) нет. Имя одной ручке
 * даёт подпись `Label`, подпись поля формы `Field` или вход `aria_label`; у
 * нескольких ручек имя каждой, первой тоже, — `thumbLabels`, полностью: в
 * подписи `Label` значение второго поля вошло бы в имя первого.
 *
 * Ручки и метки — разметка, а не компоненты: потребитель их не адресует.
 * Выходы `thumbs` и `shownMarks` ядро собирает заново на каждую смену, поэтому
 * петля идёт по месту (`track $index`), как `:key="index"` у Vue: ручка
 * остаётся тем же узлом, и фокус её поля переживает шаг клавишей. Обработчиков
 * в разметке нет: нажатия и протяжку ловит плагин указателя на корне, клавиши
 * и жест скринридера — плагин клавиатуры на полях.
 *
 * Слоты со scope — шаблоны: подпись метки (`<ng-template slot="mark"
 * let-value="value" let-label="label">`) и содержимое подсказки ручки
 * (`<ng-template slot="thumb" let-value="value" let-index="index">`).
 *
 * Поле формы `Field` над ползунком отдаёт ему ошибку и ссылки, а своему
 * содержимому ползунок опускает пустую связку — в свой слой лифта
 * (`provideElevator()`).
 *
 * `span[so-slider]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: span[so-slider], [so-slider]
 */
@Component({
	selector: 'span[so-slider], [so-slider]',
	standalone: true,
	imports: [NgTemplateOutlet, AttributesDirective, FieldTextDirective, TextPipe],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './slider.component.html',
})
export class TSliderComponent extends TSliderSurface<ISlider> {
	constructor() {
		super(SliderInputNames, { strategy: 'host', aria: 'rootAria' })
	}

	protected createBinding(ctrl: ISlider | undefined, inputs: object): TBinding<ISlider> {
		return setupSlider(ctrl, inputs)
	}
}
