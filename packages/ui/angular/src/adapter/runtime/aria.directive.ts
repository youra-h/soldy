/**
 * ariaAttrs — раскладывает набор атрибутов доступности на элемент, вторым
 * входом — набор `attrs` (нативные атрибуты вроде `disabled`, зависящие от
 * тега корня).
 *
 * Существует только потому, что Angular единственный из шести фреймворков не
 * умеет спред атрибутов: у Vue есть `v-bind="{ ...attrs, ...aria }"`, у
 * React/Svelte/Solid — спред объекта, в Web Components это setAttribute в
 * шаблоне. Здесь же пришлось бы перечислять `[attr.role]`, `[attr.tabindex]`,
 * `[attr.aria-*]`, `[attr.disabled]` в каждом шаблоне руками — то есть ровно
 * тот захардкоженный набор, который вынос в ядро и убирает.
 *
 * Оба набора применяются одним и тем же алгоритмом, но независимо друг от
 * друга: `aria` и `attrs` не пересекаются по именам, а раздельное отслеживание
 * «поставленного в прошлый раз» не даёт одному набору снять атрибут,
 * поставленный другим.
 *
 * Селектор — `[ariaAttrs]`, а не `[aria]`: последний совпал бы с любым
 * элементом, у которого есть атрибут `aria`.
 */

import { Directive, ElementRef, Input, type OnChanges } from '@angular/core'
import type { TAriaAttributes, TAttributesMap } from '@soldy/core'

/** Раскладывает один набор `имя → значение` на элемент, `null` снимает атрибут. */
function applyAttributes(
	element: HTMLElement,
	map: Record<string, string | null | undefined> | undefined,
	previous: string[],
): string[] {
	const current: string[] = []

	for (const [name, value] of Object.entries(map ?? {})) {
		// null означает «атрибут не ставить»
		if (value === null || value === undefined) continue

		element.setAttribute(name, value)
		current.push(name)
	}

	// Смена tag меняет состав набора: у нативной button нет ни role, ни tabindex
	for (const name of previous) {
		if (!current.includes(name)) element.removeAttribute(name)
	}

	return current
}

@Directive({
	selector: '[ariaAttrs]',
	standalone: true,
})
export class AriaDirective implements OnChanges {
	@Input('ariaAttrs') aria: TAriaAttributes | undefined
	@Input() attrs: TAttributesMap | undefined

	/** Поставленное в прошлый раз, отдельно на каждый набор. */
	private _appliedAria: string[] = []
	private _appliedAttrs: string[] = []

	constructor(private readonly _elementRef: ElementRef<HTMLElement>) {}

	ngOnChanges(): void {
		const element = this._elementRef.nativeElement

		this._appliedAria = applyAttributes(element, this.aria, this._appliedAria)
		this._appliedAttrs = applyAttributes(element, this.attrs, this._appliedAttrs)
	}
}
