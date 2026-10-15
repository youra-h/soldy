import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { ILabel } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import { LabelInputNames, TLabelSurface } from './base.component'
import { setupLabel } from './setup.component'

/**
 * TLabelComponent — подпись контрола.
 *
 * Обёртки нет: корень — сам элемент потребителя, как у Button,
 * `<label so-label>`. Модификаторы стороны, размера и варианта, наборы ядра и
 * скрытие раскладывает на него `TComponentBase` (стратегия `'host'`), поэтому
 * шаблон — только две части подписи: контрол и текст.
 *
 * Связки через `for` и `id` нет: контрол — первый labelable-потомок `label`,
 * поэтому клик по тексту переключает его, а текст становится его доступным
 * именем. Внутри — только строчная разметка: `div` и вложенный `label` HTML
 * здесь запрещает, а описание или ошибка вошли бы в имя.
 *
 * Порядок в DOM один на все стороны: контрол, потом текст. Сторону рисует
 * тема.
 *
 * `label[so-label]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: label[so-label], [so-label]
 */
@Component({
	selector: 'label[so-label], [so-label]',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './label.component.html',
})
export class TLabelComponent extends TLabelSurface<ILabel> {
	constructor() {
		super(LabelInputNames, { strategy: 'host' })
	}

	protected createBinding(ctrl: ILabel | undefined, inputs: object): TBinding<ILabel> {
		return setupLabel(ctrl, inputs)
	}
}
