import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITabsItem, TTabsItemCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective, type TBinding } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { TabsItemInputNames, TTabsItemSurface } from './base.component'
import { setupTabsItem } from './setup.component'

/**
 * TTabsItemComponent — таб: корень, внутри строка — Button с `role="tab"` — и
 * кнопка закрытия рядом с ней, как у Vue.
 *
 * Селектор — элементный, `<so-tabs-item>`: атрибуты потребителя у таба
 * делятся между корнем и строкой, как у элемента ListBox. Корень несёт
 * классы, `attrs`, `dataset` и место в коллекции (`order`) — тема красит
 * активный таб по `data-selected` на нём. Строка несёт `aria` — вся ARIA таба
 * на элементе, который и есть таб: роль от ядра, `aria-selected` и остановку
 * Tab (`tabindex`) от коллекции, связку с панелью (`id`, `aria-controls`);
 * кладёт её директива набора поверх того, что кнопка пишет себе сама.
 * Статические атрибуты, которые потребитель записал на таб, кроме `class` и
 * `style`, база переносит на строку (`control`).
 *
 * Кнопка закрытия — сосед строки, а не её часть: интерактивный потомок у
 * `<button role="tab">` HTML запрещает, а подпись крестика вошла бы в имя
 * таба. Имя кнопке ядро собирает вместе с текстом таба (`closeAria`),
 * рисуется она по итогу закрываемости фасада (`tab_closable`), размер и
 * `disabled` — явно: от строки она их не наследует. Клик по ней не всплывает,
 * как `@click.stop` у Vue.
 *
 * Слоты: `leading` и `trailing` проецируются, `default` (scope
 * `{ text, active }`) — проекцией или шаблоном, без него — текст;
 * `close-icon` — шаблоном (`<ng-template slot="close-icon">`): по нему таб
 * решает, рисовать ли свою иконку крестика, а есть ли что-то в `<ng-content>`,
 * Angular не сообщает.
 *
 * Selector: so-tabs-item
 */
@Component({
	selector: 'so-tabs-item',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tabs-item.component.html',
})
export class TTabsItemComponent extends TTabsItemSurface<ITabsItem> {
	constructor() {
		super(TabsItemInputNames, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
		})
	}

	protected createBinding(
		ctrl: ITabsItem | undefined,
		inputs: object,
	): TBinding<ITabsItem, TTabsItemCollectionFacade> {
		return setupTabsItem(ctrl, inputs)
	}

	/** Клик по строке: таб становится активным, если активация не отменена. */
	protected activate(): void {
		const context = this.facade()?.context

		if (context) context.adapters.activation.active = true
	}

	/** Клик по крестику: закрыть таб; клик не всплывает, как `@click.stop` у Vue. */
	protected close(event: Event): void {
		event.stopPropagation()
		this.facade()?.context?.adapters.tabs.close()
	}
}
