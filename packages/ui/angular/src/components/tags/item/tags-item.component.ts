import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITagsItem } from '@soldy-ui/core'
import { AttributesDirective, RoleIconDirective } from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { TTagsItemSurface } from '../../../generated/tags-item.metadata'
import { setupTagsItem } from './setup.component'

/**
 * Тег: строка — Button на `div` с набором `aria`, кнопка закрытия — её сосед:
 * потомки опции скринридеру презентационны, и подпись крестика вошла бы в имя тега.
 */
@Component({
	selector: 'div[so-tags-item], [so-tags-item]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tags-item.component.html',
})
export class TTagsItemComponent extends TTagsItemSurface<ITagsItem> {
	constructor() {
		super(setupTagsItem, {
			strategy: 'host',
			sets: ['attrs', 'dataset'],
			control: true,
			order: 'order',
		})
	}

	/** Закрыть тег; клик не всплывает: иначе `press` корней дал бы выбор и открыл панель Select. */
	protected close(event: Event): void {
		event.stopPropagation()
		this.facade()?.context?.adapters.tags.close()
	}
}
