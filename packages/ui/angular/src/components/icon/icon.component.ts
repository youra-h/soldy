import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IIcon } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import { IconInputNames, TIconSurface } from './base.component'
import { setupIcon } from './setup.component'

/**
 * TIconComponent — слой TIcon.
 *
 * Обёртки нет: корень — сам элемент потребителя, как у Button: `<i so-icon>`,
 * `<span so-icon>`, `<svg so-icon so-role-icon="close">`. Картинку рисует сам
 * элемент — шрифтом или фоном темы, — а иконку из пакета иконок кладёт на
 * `<svg>` директива адаптера `RoleIconDirective`. Входа `tag` нет, как у всех
 * компонентов: тег — у элемента.
 *
 * Шаблон пуст: содержимого у иконки нет, слотов в описании тоже, и написанное
 * внутри элемента не выводится — как в остальных адаптерах.
 *
 * Размер (`width`, `height`) приходит стилем от плагина раскладки, имя — от
 * плагина доступного имени: без него иконка скрыта (`aria-hidden`), с ним
 * становится `role="img"`. Классы, наборы, стиль и скрытие раскладывает на
 * элемент `TComponentBase` (стратегия `'host'`).
 *
 * `span[so-icon]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: span[so-icon], [so-icon]
 */
@Component({
	selector: 'span[so-icon], [so-icon]',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: '',
})
export class TIconComponent extends TIconSurface<IIcon> {
	constructor() {
		super(IconInputNames, { strategy: 'host' })
	}

	protected createBinding(ctrl: IIcon | undefined, inputs: object): TBinding<IIcon> {
		return setupIcon(ctrl, inputs)
	}
}
