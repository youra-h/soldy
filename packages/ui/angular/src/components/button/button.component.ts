import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IButton } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import { ButtonInputNames, TButtonSurface } from './base.component'
import { setupButton } from './setup.component'

/**
 * TButtonComponent — слой TButton.
 *
 * Обёртки нет: корень — сам элемент, на котором потребитель написал селектор,
 * `<button so-button>`, `<a so-button href>`, `<div so-button>`. Какой тег
 * написан, так элемент себя и ведёт, а всё, что потребитель написал на нём,
 * относится к корню. Тег ядро получает от элемента, классы, скрытие и наборы
 * ядра раскладывает на него `TComponentBase` (стратегия `'host'`), поэтому
 * шаблон — только содержимое кнопки.
 *
 * `button[so-button]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Входы и выходы объявляет сгенерированная база `TButtonSurface`
 * (generated/button.metadata.ts) вместе с их типами для строгого шаблона,
 * поэтому в `@Component` их нет: вход, объявленный здесь ещё раз, строгая
 * проверка шаблона пропускала бы без сверки значения. Имена входов конструктор
 * передаёт `TComponentBase` — по ним она читает входы. Эмиттер выхода заводит
 * геттер базы при первом чтении выхода.
 *
 * Selector: button[so-button], [so-button]
 */
@Component({
	selector: 'button[so-button], [so-button]',
	standalone: true,
	imports: [NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './button.component.html',
})
export class TButtonComponent extends TButtonSurface<IButton> {
	constructor() {
		super(ButtonInputNames, 'host')
	}

	protected createBinding(ctrl: IButton | undefined, inputs: object): TBinding<IButton> {
		return setupButton(ctrl, inputs)
	}
}
