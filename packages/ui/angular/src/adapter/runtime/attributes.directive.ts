import { Directive, ElementRef, Input, inject } from '@angular/core'
import type { TAttributesMap } from '@soldy-ui/core'
import { TForwardRegistry } from '../attrs/registry'
import { TElementAttributes, attributesOf } from './root-attributes'

/**
 * Набор ядра на элементе шаблона, аналог `v-bind="aria"` у Vue:
 * `<input [so-attributes]="state()['aria']">`. Пишет слоем `markup`
 * раскладчика элемента — главнее наборов вложенного компонента. На хосте с
 * узлом внутри набор уходит записи хоста, как всё написанное на нём.
 * AGENTS.md (Angular), «Набор ядра на элементе шаблона».
 */
@Directive({
	selector: '[so-attributes]',
	standalone: true,
})
export class AttributesDirective {
	private readonly _element = inject<ElementRef<Element>>(ElementRef).nativeElement

	/** Без `provideAttrs()` реестра нет. */
	private readonly _registry = inject(TForwardRegistry, { optional: true })

	@Input({ alias: 'so-attributes', required: true })
	set attributes(set: TAttributesMap | null | undefined) {
		// Хост регистрируется в конструкторе компонента — раньше директив элемента
		const host = this._registry?.hostOf(this._element)

		if (host) host.setMarkup(attributesOf(set))
		else TElementAttributes.of(this._element).set('markup', attributesOf(set))
	}
}
