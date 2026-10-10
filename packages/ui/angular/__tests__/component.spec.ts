/**
 * Component — невизуальный слой TComponent. Разметки у него нет ни в одном
 * адаптере, слотов в описании тоже, поэтому `<so-component>` содержимого не
 * выводит: написанное внутри никуда не проецируется.
 */

import { describe, it, expect } from 'vitest'
import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TComponentComponent } from '@soldy-ui/angular'

@Component({
	standalone: true,
	imports: [TComponentComponent],
	template: `<so-component>текст</so-component>`,
})
class ContentHost {}

describe('Component · без разметки', () => {
	it('<so-component>текст</so-component> пуст', () => {
		const fixture = TestBed.createComponent(ContentHost)

		fixture.detectChanges()

		const host: HTMLElement = fixture.nativeElement
		const component = host.querySelector('so-component')

		if (!component) throw new Error('<so-component> не отрисован')

		expect(component.childNodes).toHaveLength(0)
		expect(host.textContent).toBe('')
	})
})
