/**
 * `<ng-template slot="имя">` — форма слота в Angular.
 *
 * Существует ради scoped-слотов. Простые слоты проецируются нативно
 * (`<ng-content select="[slot=leading]">`), но `<ng-content>` не умеет
 * передавать данные внутрь: содержимое компилируется в области потребителя,
 * когда значений ещё нет. `<ng-template>` откладывает отрисовку, поэтому в него
 * можно передать контекст — это единственный механизм Angular, эквивалентный
 * scoped-слоту Vue или сниппету с параметром в Svelte.
 *
 * Имя слота совпадает с объявленным в дескрипторе: контракт один на все
 * фреймворки, различается только спеллинг.
 *
 * Импортирует её ПОТРЕБИТЕЛЬ, а не компонент soldy: директива применяется там,
 * где написан `<ng-template slot="...">`, то есть в шаблоне потребителя.
 */

import { Directive, Input, TemplateRef } from '@angular/core'

@Directive({
	selector: 'ng-template[slot]',
	standalone: true,
})
export class SlotDirective {
	@Input('slot') name = ''

	constructor(readonly template: TemplateRef<unknown>) {}
}
