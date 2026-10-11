/**
 * Корень — элемент потребителя, и то, что пишет на него ядро, раскладывает
 * база (`TComponentBase`, `root-attributes.ts`) — одним правилом у всех
 * компонентов.
 *
 * Атрибуты, классы и стиль потребителя стоят на элементе рядом с наборами,
 * классами и стилем ядра. Порядка, в котором можно положить одно поверх
 * другого, у базы нет, поэтому чьё значение, она узнаёт по памяти: своё пишет
 * и снимает, чужое не трогает. Так атрибут снаружи перекрывает набор ядра,
 * `[style.width]` потребителя — размер от плагина раскладки, а свойство,
 * которое плагин записал в узел сам, мимо разметки, переживает смену
 * раскладки, видимости и стиля потребителя.
 *
 * Стиль корня — слоями снизу вверх: выход плагина раскладки (`layout_styles`),
 * поверх него стиль-выход компонента (`fractionStyle` у ProgressSpinner).
 * Плагина раскладки у кольца нет, поэтому порядок слоёв проверяется на самой
 * раскладке стиля (`stylesOf`, `applyStyles`), как в React и Solid.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal, type Type } from '@angular/core'
import type { ComponentFixture } from '@angular/core/testing'
import { TButton } from '@soldy-ui/core'
import {
	TButtonComponent,
	TComponentViewComponent,
	TIconComponent,
	TProgressSpinnerComponent,
	TSkeletonComponent,
} from '@soldy-ui/angular'
import { applyStyles, stylesOf } from '../src/adapter/runtime/root-attributes'
import { findIn, mountHost, nextFrame } from './mount'

/** Хост пробы: корни, о которых сообщил `(elementReady)`. */
abstract class TProbeHost {
	readonly ready: Element[] = []
}

/**
 * Проба на каждый компонент: `direction` ядра против `dir` потребителя, класс
 * потребителя и `(elementReady)`.
 */
@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button
		so-button
		direction="rtl"
		dir="ltr"
		class="mine"
		(elementReady)="ready.push($event)"
	></button>`,
})
class ButtonProbe extends TProbeHost {}

@Component({
	standalone: true,
	imports: [TComponentViewComponent],
	template: `<div
		so-component-view
		direction="rtl"
		dir="ltr"
		class="mine"
		(elementReady)="ready.push($event)"
	></div>`,
})
class ComponentViewProbe extends TProbeHost {}

@Component({
	standalone: true,
	imports: [TIconComponent],
	template: `<i
		so-icon
		direction="rtl"
		dir="ltr"
		class="mine"
		(elementReady)="ready.push($event)"
	></i>`,
})
class IconProbe extends TProbeHost {}

@Component({
	standalone: true,
	imports: [TProgressSpinnerComponent],
	template: `<span
		so-progress-spinner
		direction="rtl"
		dir="ltr"
		class="mine"
		(elementReady)="ready.push($event)"
	></span>`,
})
class ProgressSpinnerProbe extends TProbeHost {}

@Component({
	standalone: true,
	imports: [TSkeletonComponent],
	template: `<div
		so-skeleton
		direction="rtl"
		dir="ltr"
		class="mine"
		(elementReady)="ready.push($event)"
	></div>`,
})
class SkeletonProbe extends TProbeHost {}

/** Компонент, хост его пробы, селектор корня и класс ядра на нём. */
const COMPONENTS: ReadonlyArray<readonly [string, Type<TProbeHost>, string, string]> = [
	['Button', ButtonProbe, '[so-button]', 's-button'],
	['ComponentView', ComponentViewProbe, '[so-component-view]', 's-component-view'],
	['Icon', IconProbe, '[so-icon]', 's-icon'],
	['ProgressSpinner', ProgressSpinnerProbe, '[so-progress-spinner]', 's-progress-spinner'],
	['Skeleton', SkeletonProbe, '[so-skeleton]', 's-skeleton'],
]

describe('атрибут снаружи перекрывает набор ядра', () => {
	/** `dir` ядро пишет в `attrs` по `direction`, а `dir` снаружи — атрибут потребителя. */
	it.each(COMPONENTS)('%s: dir потребителя — поверх dir ядра', (_name, host, selector) => {
		const el = findIn(mountHost(host), selector, HTMLElement)

		expect(el.getAttribute('dir')).toBe('ltr')
	})

	it.each(COMPONENTS)(
		'%s: класс потребителя — рядом с классами ядра',
		(_name, host, selector, own) => {
			const el = findIn(mountHost(host), selector, HTMLElement)

			expect(el.classList.contains('mine')).toBe(true)
			expect(el.classList.contains(own)).toBe(true)
		},
	)
})

describe('корень связан с TElementPlugin', () => {
	it.each(COMPONENTS)('%s: element:ready приходит с корнем', async (_name, host, selector) => {
		const fixture = mountHost(host)

		await nextFrame()

		expect(fixture.componentInstance.ready).toEqual([findIn(fixture, selector, HTMLElement)])
	})
})

@Component({
	standalone: true,
	imports: [TIconComponent],
	template: `<i so-icon [width]="width()" [style.width]="consumer()" [height]="12"></i>`,
})
class ConsumerWidthHost {
	readonly width = signal(24)
	readonly consumer = signal<string | null>('40px')
}

/** Корень иконки в хосте. */
const icon = (fixture: ComponentFixture<unknown>) => findIn(fixture, '[so-icon]', HTMLElement)

describe('стиль потребителя главнее стиля ядра', () => {
	it('[style.width] потребителя перекрывает размер от плагина раскладки и его смену', () => {
		const fixture = mountHost(ConsumerWidthHost)

		expect(icon(fixture).style.width).toBe('40px')
		// Чужого свойства база не трогает, своё — ставит
		expect(icon(fixture).style.height).toBe('12px')

		fixture.componentInstance.width.set(32)
		fixture.detectChanges()

		expect(icon(fixture).style.width).toBe('40px')
	})

	/**
	 * Сняв своё значение, потребитель возвращает место базе — со следующей её
	 * раскладкой: узел база не перечитывает.
	 */
	it('снятый [style.width] потребителя — место базе со следующей раскладкой', () => {
		const fixture = mountHost(ConsumerWidthHost)

		fixture.componentInstance.consumer.set(null)
		fixture.detectChanges()

		expect(icon(fixture).style.width).toBe('')

		fixture.componentInstance.width.set(48)
		fixture.detectChanges()

		expect(icon(fixture).style.width).toBe('48px')
	})
})

@Component({
	standalone: true,
	imports: [TProgressSpinnerComponent],
	template: `<span
			so-progress-spinner
			class="bound"
			[value]="40"
			[style.--s-progress-spinner-fraction]="consumer()"
		></span>
		<span so-progress-spinner class="plain" [value]="value()" [visible]="visible()"></span>`,
})
class FractionHost {
	readonly consumer = signal<string | null>('0.9')
	readonly value = signal(40)
	readonly visible = signal(true)
}

describe('стиль-выход компонента', () => {
	it('ProgressSpinner: стиль потребителя — поверх доли', () => {
		const el = findIn(mountHost(FractionHost), '.bound', HTMLElement)

		expect(el.style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.9')
	})

	it('ProgressSpinner: --* доходит до узла под своим именем, смена доли — тоже', () => {
		const fixture = mountHost(FractionHost)
		const el = findIn(fixture, '.plain', HTMLElement)

		expect(el.style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.4')

		fixture.componentInstance.value.set(60)
		fixture.detectChanges()

		expect(el.style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.6')
	})

	it('ProgressSpinner: скрытие трогает только display, доля остаётся', () => {
		const fixture = mountHost(FractionHost)
		const el = findIn(fixture, '.plain', HTMLElement)

		fixture.componentInstance.visible.set(false)
		fixture.detectChanges()

		expect(el.style.display).toBe('none')
		expect(el.style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.4')
	})
})

describe('раскладка стиля', () => {
	it('стиль-выход — поверх стиля плагина, пустое значение свойства не задаёт', () => {
		const styles = stylesOf(
			{ '--ring': 'plugin', width: '10px', height: '' },
			{ '--ring': 'own', 'z-index': 3, width: '' },
		)

		expect([...styles]).toEqual([
			['--ring', 'own'],
			['width', '10px'],
			['z-index', '3'],
		])
	})

	it('слоя нет или он не объект — стиль пуст', () => {
		expect([...stylesOf(undefined, null, 'width: 1px')]).toEqual([])
	})

	it('--* и имена по-CSS доходят до узла как есть; ушедшее из стиля снимается', () => {
		const node = document.createElement('div')
		const applied = applyStyles(
			node,
			stylesOf({ '--dialog-width': '320px', 'z-index': 3 }),
			new Map(),
		)

		expect(node.style.getPropertyValue('--dialog-width')).toBe('320px')
		expect(node.style.zIndex).toBe('3')

		applyStyles(node, stylesOf({ 'z-index': 3 }), applied)

		expect(node.style.getPropertyValue('--dialog-width')).toBe('')
		expect(node.style.zIndex).toBe('3')
	})

	it('свойство с чужим значением база не трогает и своим больше не считает', () => {
		const node = document.createElement('div')

		let applied = applyStyles(node, stylesOf({ width: '10px' }), new Map())

		// Поверх базы пишет плагин или потребитель
		node.style.setProperty('width', '50px')

		applied = applyStyles(node, stylesOf({ width: '20px' }), applied)

		expect(node.style.width).toBe('50px')

		applyStyles(node, stylesOf({}), applied)

		expect(node.style.width).toBe('50px')
	})
})

@Component({
	standalone: true,
	imports: [TButtonComponent, TIconComponent],
	template: `<button so-button [ctrl]="ctrl" [style.color]="color()"></button>
		<i so-icon [width]="width()"></i>`,
})
class OutsideHost {
	readonly ctrl = new TButton()
	readonly color = signal('red')
	readonly width = signal(10)
}

/**
 * Плагины пишут в узел и сами — мимо разметки: сдвиг смахиваемой панели,
 * предел высоты списка. Такое свойство база своим не считает и не снимает.
 */
describe('свойство, записанное в узел мимо разметки', () => {
	it('переживает смену layout_styles, видимости и стиля потребителя', () => {
		const fixture = mountHost(OutsideHost)
		const button = findIn(fixture, '[so-button]', HTMLElement)
		const el = icon(fixture)

		button.style.setProperty('--s-swipe-offset', '12px')
		el.style.setProperty('--s-swipe-offset', '7px')

		fixture.componentInstance.ctrl.hide()
		fixture.detectChanges()
		fixture.componentInstance.ctrl.show()
		fixture.componentInstance.color.set('blue')
		fixture.componentInstance.width.set(20)
		fixture.detectChanges()

		expect(button.style.getPropertyValue('--s-swipe-offset')).toBe('12px')
		expect(button.style.color).toBe('blue')
		expect(button.style.display).toBe('')
		expect(el.style.getPropertyValue('--s-swipe-offset')).toBe('7px')
		expect(el.style.width).toBe('20px')
	})
})
