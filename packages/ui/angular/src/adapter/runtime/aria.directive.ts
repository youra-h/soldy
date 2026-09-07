/**
 * ariaAttrs — раскладывает набор атрибутов доступности на элемент.
 *
 * Существует только потому, что Angular единственный из шести фреймворков не
 * умеет спред атрибутов: у Vue есть `v-bind="aria"`, у React/Svelte/Solid —
 * спред объекта, в Web Components это setAttribute в шаблоне. Здесь же
 * пришлось бы перечислять `[attr.role]`, `[attr.tabindex]`, `[attr.aria-*]`
 * в каждом шаблоне руками — то есть ровно тот захардкоженный ARIA, который
 * вынос набора в ядро и убирает.
 *
 * Селектор — `[ariaAttrs]`, а не `[aria]`: последний совпал бы с любым
 * элементом, у которого есть атрибут `aria`.
 */

import { Directive, ElementRef, Input, type OnChanges } from '@angular/core'
import type { TAriaAttributes } from '@soldy/core'

@Directive({
	selector: '[ariaAttrs]',
	standalone: true,
})
export class AriaDirective implements OnChanges {
	@Input('ariaAttrs') aria: TAriaAttributes | undefined

	/** Поставленное в прошлый раз — чтобы снимать исчезнувшие атрибуты. */
	private _applied: string[] = []

	constructor(private readonly _elementRef: ElementRef<HTMLElement>) {}

	ngOnChanges(): void {
		const element = this._elementRef.nativeElement
		const aria = this.aria ?? {}
		const current: string[] = []

		for (const [name, value] of Object.entries(aria)) {
			// null означает «атрибут не ставить»
			if (value === null || value === undefined) continue

			element.setAttribute(name, value)
			current.push(name)
		}

		// Смена tag меняет состав набора: у нативной button нет ни role, ни tabindex
		for (const name of this._applied) {
			if (!current.includes(name)) element.removeAttribute(name)
		}

		this._applied = current
	}
}
