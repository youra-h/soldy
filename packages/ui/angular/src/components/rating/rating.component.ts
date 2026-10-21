import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IRating } from '@soldy-ui/core'
import {
	AttributesDirective,
	FieldTextDirective,
	RoleIconDirective,
	TextPipe,
	provideElevator,
	type TBinding,
} from '../../adapter'
import { RatingInputNames, TRatingSurface } from './base.component'
import { setupRating } from './setup.component'

/**
 * TRatingComponent — оценка звёздами: ползунок с одной ручкой (APG, Rating
 * Slider), у которого шкала — ряд звёзд.
 *
 * Обёртки нет: корень — сам элемент потребителя (`<span so-rating>`). Корень
 * по умолчанию — `span`: оценку кладут в подпись `Label`, а внутри `label`
 * HTML разрешает только строчную разметку, поэтому и всё внутри — `span`.
 * Классы (размер, вариант, только чтение — `--readonly`), `attrs` (`dir`) и
 * `dataset` (`data-disabled`) раскладывает на корень `TComponentBase`
 * (стратегия `'host'`), а набор `aria` — имя, `aria-valuetext` («4 из 5»),
 * `aria-readonly` — кладёт на поле директива набора.
 *
 * Атрибуты потребителя остаются на корне, как у Vue и Slider: указатель поле
 * не ловит, и обработчик нажатия потребителя на нём не сработал бы никогда.
 * `id` — вход оценки, а не атрибут корня: его, как у Vue, шаблон пишет на
 * поле, и `for` подписи снаружи ведёт на него. Имя полю даёт подпись
 * `Label`, подпись поля формы `Field` или вход `aria_label`.
 *
 * Звёзды — разметка, а не компоненты: потребитель их не адресует, число
 * звёзд задаёт `max`. Выход `stars` ядро собирает заново на каждую смену, а
 * петля идёт по номеру звезды (`track star.value`), как `:key` у Vue:
 * предпросмотр наведением звёзды не пересоздаёт. Обработчиков в разметке нет:
 * нажатие ловит плагин указателя на корне, наведение — плагин наведения там
 * же, клавиши и жест скринридера — плагин клавиатуры на поле.
 *
 * Значок звезды — шаблон слота `icon` со scope звезды (`<ng-template
 * slot="icon" let-value="value" let-filled="filled">`), он рисуется в обоих
 * её слоях; без него — иконка роли `star`.
 *
 * Поле формы `Field` над оценкой отдаёт ей ошибку, ссылки и `id`, а своему
 * содержимому оценка опускает пустую связку — в свой слой лифта
 * (`provideElevator()`).
 *
 * `span[so-rating]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: span[so-rating], [so-rating]
 */
@Component({
	selector: 'span[so-rating], [so-rating]',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		FieldTextDirective,
		RoleIconDirective,
		TextPipe,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './rating.component.html',
})
export class TRatingComponent extends TRatingSurface<IRating> {
	constructor() {
		super(RatingInputNames, { strategy: 'host', sets: ['attrs', 'dataset'] })
	}

	protected createBinding(ctrl: IRating | undefined, inputs: object): TBinding<IRating> {
		return setupRating(ctrl, inputs)
	}
}
