/**
 * `<ng-template slot="имя">` — слот со scope: `<ng-content>` данных внутрь не
 * передаёт. Имя — из дескриптора. Импортирует потребитель.
 */

import { Directive, Input, TemplateRef } from '@angular/core'

@Directive({
	selector: 'ng-template[slot]',
})
export class SlotDirective {
	@Input('slot') name = ''

	constructor(readonly template: TemplateRef<unknown>) {}
}
