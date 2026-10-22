import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITags } from '@soldy-ui/core'
import { SlotDirective, provideElevator } from '../../adapter'
import { TTagsItemComponent } from './item'
import { TTagsSurface } from '../../generated/tags.metadata'
import { setupTags } from './setup.component'

/**
 * Набор тегов: корень — сам ряд с ролью. AGENTS.md (Angular),
 * «Tags — ряд тегов, своя раскладка — шаблон `default`».
 */
@Component({
	selector: 'div[so-tags], [so-tags]',
	imports: [NgTemplateOutlet, SlotDirective, TTagsItemComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './tags.component.html',
})
export class TTagsComponent extends TTagsSurface<ITags> {
	constructor() {
		super((ctrl, inputs) => setupTags(ctrl, inputs, this.engine), { strategy: 'host' })
	}
}
