/**
 * Skeleton под Angular: заглушка поверх содержимого.
 *
 * Корень есть всегда — в нём лежит содержимое, — а `rendered` и `visible`
 * решают только, показана ли заглушка. База поэтому видимостью корень не
 * прячет (`hides: false`): `display: none` спрятал бы и содержимое.
 *
 * `variant` — вход, а не атрибут корня (тот же сценарий, что у Vue,
 * `skeleton-variant.spec.ts`, и React). Значения — условные имена из фикстуры
 * темы (`__tests__/theme.d.ts`), не имена oren.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import type { ComponentFixture } from '@angular/core/testing'
import type { TComponentVariant } from '@soldy-ui/core'
import { TPopoverComponent, TSkeletonComponent } from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

const variantClasses = (el: HTMLElement) =>
	[...el.classList].filter((name) => name.includes('--variant-'))

@Component({
	standalone: true,
	imports: [TSkeletonComponent],
	template: `<div so-skeleton [variant]="variant()"></div>`,
})
class VariantHost {
	readonly variant = signal<TComponentVariant | undefined>('brand')
}

@Component({
	standalone: true,
	imports: [TSkeletonComponent],
	template: `<div so-skeleton [visible]="visible()" [rendered]="rendered()"><b>Данные</b></div>`,
})
class ContentHost {
	readonly visible = signal<boolean | undefined>(undefined)
	readonly rendered = signal<boolean | undefined>(undefined)
}

@Component({
	standalone: true,
	imports: [TSkeletonComponent],
	template: `<div so-skeleton [width]="120" height="1em"></div>`,
})
class SizedHost {}

/** Открытый поповер в содержимом: его панель уехала в `body`. */
@Component({
	selector: 'probe-skeleton-popover',
	standalone: true,
	imports: [TSkeletonComponent, TPopoverComponent],
	template: `<div so-skeleton [rendered]="rendered()">
		<span so-popover open><button class="so-test-inside">В поповере</button></span>
	</div>`,
})
class PopoverHost {
	readonly rendered = signal<boolean | undefined>(undefined)
}

/** Корень Skeleton в разметке хоста. */
const skeleton = (fixture: ComponentFixture<unknown>) =>
	findIn(fixture, '[so-skeleton]', HTMLElement)

describe('Skeleton · variant', () => {
	it('доходит до инстанса: у корня класс варианта, атрибута variant нет', () => {
		const el = skeleton(mountHost(VariantHost))

		expect(variantClasses(el)).toEqual(['so-skeleton--variant-brand'])
		expect(el.hasAttribute('variant')).toBe(false)
	})

	it('смена входа меняет класс', () => {
		const fixture = mountHost(VariantHost)

		fixture.componentInstance.variant.set('danger')
		fixture.detectChanges()

		expect(variantClasses(skeleton(fixture))).toEqual(['so-skeleton--variant-danger'])
	})
})

describe('Skeleton · заглушка и содержимое', () => {
	it('показанная заглушка — перед содержимым, скрыта от скринридера', () => {
		const el = skeleton(mountHost(ContentHost))

		expect([...el.children].map((child) => child.localName)).toEqual(['div', 'b'])
		expect(el.firstElementChild?.className).toBe('so-skeleton__placeholder')
		expect(el.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
		// Пока заглушка показана, область занята
		expect(el.getAttribute('aria-busy')).toBe('true')
	})

	it('visible=false: заглушки нет, содержимое на месте, корень не скрыт', () => {
		const fixture = mountHost(ContentHost)

		fixture.componentInstance.visible.set(false)
		fixture.detectChanges()

		const el = skeleton(fixture)

		expect(el.querySelector('.so-skeleton__placeholder')).toBeNull()
		expect(el.querySelector('b')?.textContent).toBe('Данные')
		expect(el.style.display).toBe('')
		expect(el.hasAttribute('aria-busy')).toBe(false)
	})

	it('rendered=false: то же — корень остаётся с содержимым', () => {
		const fixture = mountHost(ContentHost)

		fixture.componentInstance.rendered.set(false)
		fixture.detectChanges()

		const el = skeleton(fixture)

		expect(el.querySelector('.so-skeleton__placeholder')).toBeNull()
		expect(el.querySelector('b')?.textContent).toBe('Данные')
		expect(el.style.display).toBe('')
	})

	/**
	 * `rendered` Skeleton снимает одну заглушку, а не поддерево: у Vue его
	 * корень `v-if` не носит, и слои в содержимом остаются на виду.
	 */
	it('rendered=false: открытая панель поповера в содержимом остаётся на виду', async () => {
		const fixture = mountHost(PopoverHost)

		await nextFrame()

		const panel = find(document, '.so-popover__panel', HTMLElement)

		expect(panel.parentElement).toBe(document.body)
		expect(panel.style.display).toBe('')

		fixture.componentInstance.rendered.set(false)
		fixture.detectChanges()

		expect(skeleton(fixture).querySelector('.so-skeleton__placeholder')).toBeNull()
		expect(panel.parentElement).toBe(document.body)
		expect(panel.style.display).toBe('')
	})

	/** Содержимое проецируется вне ветки заглушки: смена ветки его не теряет. */
	it('заглушка уходит и возвращается со сменой visible, содержимое остаётся', () => {
		const fixture = mountHost(ContentHost)
		const content = skeleton(fixture).querySelector('b')

		fixture.componentInstance.visible.set(false)
		fixture.detectChanges()

		expect(skeleton(fixture).querySelector('.so-skeleton__placeholder')).toBeNull()

		fixture.componentInstance.visible.set(true)
		fixture.detectChanges()

		expect(skeleton(fixture).querySelector('.so-skeleton__placeholder')).not.toBeNull()
		expect(skeleton(fixture).querySelector('b')).toBe(content)
	})
})

describe('Skeleton · размер', () => {
	it('width и height — стилем корня', () => {
		const el = skeleton(mountHost(SizedHost))

		expect(el.style.width).toBe('120px')
		expect(el.style.height).toBe('1em')
	})
})
