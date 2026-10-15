import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IRadioGroupItem, TRadioGroupItemCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, type TBinding } from '../../../adapter'
import { RadioGroupItemInputNames, TRadioGroupItemSurface } from './base.component'
import { setupRadioGroupItem } from './setup.component'

/**
 * TRadioGroupItemComponent — радио: корень — подпись, внутри нативный
 * `<input type="radio">`, кольцо с точкой и текст подписи.
 *
 * Исключение из правила «обёртки нет» для поля: селектор атрибутный,
 * `<label so-radio-group-item>`, хотя атрибуты потребителя у радио делятся
 * между корнем и `<input>`, как у поля. Корень обязан быть подписью: клик по
 * тексту выбирает радио, а подпись становится его доступным именем. Внутри
 * `Label` радио пишут на строчном теге — `<span so-radio-group-item>`: `label`
 * в `label` HTML запрещает, и забытый тег ловит плагин подписи. Классы,
 * `attrs` (`dir`) и `dataset` (`data-selected`, `data-disabled`) раскладывает
 * на корень `TComponentBase` (стратегия `'host'`), а статические атрибуты,
 * которые потребитель записал на радио, кроме `class` и `style`, переносит на
 * `<input>` (`control`): `id` для `<label for>` снаружи встаёт на поле. Места
 * в коллекции (`order`) у корня нет: радио одной группы стоят где угодно, и
 * номер увёл бы радио по чужому флекс-ряду, — как у Vue и Svelte.
 *
 * Группировку по общему `name`, стрелки по кругу, пропуск выключенных, пробел,
 * одну остановку Tab на группу и участие в форме даёт браузер. Набор `aria`
 * радио кладёт на `<input>` директива набора; `checked` и `disabled` —
 * нативные, ARIA-дублей им нет. Выбор пользователя приходит `change` поля:
 * браузер уже отметил радио и снял отметку с соседа, коллекции остаётся
 * сделать его активным, а отменённый выбор к модели возвращает плагин группы.
 *
 * Подпись — только слот, scope `{ active }`: проекцией или шаблоном
 * (`<ng-template slot="default" let-active="active">`). Текста у радио нет,
 * подписи может не быть — пустую обёртку тема прячет сама.
 *
 * `label[so-radio-group-item]` стоит первым: по первому селектору Angular
 * выбирает тег хоста, когда создаёт компонент сам (`createComponent`), — это
 * тег ядра по умолчанию.
 *
 * Selector: label[so-radio-group-item], [so-radio-group-item]
 */
@Component({
	selector: 'label[so-radio-group-item], [so-radio-group-item]',
	standalone: true,
	imports: [NgTemplateOutlet, AttributesDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './radio-group-item.component.html',
})
export class TRadioGroupItemComponent extends TRadioGroupItemSurface<IRadioGroupItem> {
	constructor() {
		super(RadioGroupItemInputNames, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}

	protected createBinding(
		ctrl: IRadioGroupItem | undefined,
		inputs: object,
	): TBinding<IRadioGroupItem, TRadioGroupItemCollectionFacade> {
		return setupRadioGroupItem(ctrl, inputs)
	}

	/** `change` поля: браузер отметил радио, коллекция делает его активным. */
	protected activate(): void {
		const context = this.facade()?.context

		if (context) context.adapters.activation.active = true
	}
}
