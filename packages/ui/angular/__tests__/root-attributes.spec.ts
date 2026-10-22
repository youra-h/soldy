/**
 * Корень — элемент потребителя, и то, что пишет на него ядро, раскладывает
 * база (`TComponentBase`, `root-attributes.ts`) — одним правилом у всех
 * компонентов.
 *
 * Атрибуты, классы и стиль потребителя стоят на элементе рядом с наборами,
 * классами и стилем ядра. Что называет ядро — имя атрибута в наборе, класс,
 * свойство стиля, — база считает своим всегда, как привязку хоста
 * `[attr.x]`, и пишет поверх того, что стоит на элементе. Чего ядро не
 * называет, она не трогает: атрибут, класс и свойство стиля потребителя под
 * другим именем остаются, а свойство, которое плагин записал в узел сам, мимо
 * разметки, переживает смену раскладки, видимости и стиля потребителя.
 *
 * Стиль корня — слоями снизу вверх: выход плагина раскладки (`layout_styles`),
 * поверх него стиль-выход компонента (`fractionStyle` у ProgressSpinner).
 * Плагина раскладки у кольца нет, поэтому порядок слоёв проверяется на самой
 * раскладке стиля (`stylesOf`, `applyStyles`), как в React и Solid.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal, type Type } from '@angular/core'
import type { ComponentFixture } from '@angular/core/testing'
import { TButton, type TDirection } from '@soldy-ui/core'
import {
	TButtonComponent,
	TCheckBoxComponent,
	TComponentViewComponent,
	TDialogComponent,
	TDrawerComponent,
	TFieldComponent,
	TIconComponent,
	TInputComponent,
	TLabelComponent,
	TListBoxComponent,
	TMenuComponent,
	TMenuGroupComponent,
	TMenuRadioGroupComponent,
	TMenuSeparatorComponent,
	TNumberInputComponent,
	TPaginationComponent,
	TPopoverComponent,
	TProgressLinearComponent,
	TProgressSpinnerComponent,
	TRatingComponent,
	TScrollerComponent,
	TSelectComponent,
	TSkeletonComponent,
	TSliderComponent,
	TSwitchComponent,
	TTableComponent,
	TTabsComponent,
	TTagsComponent,
	TTextareaComponent,
	TTooltipComponent,
} from '@soldy-ui/angular'
import {
	applyAttributes,
	applyClasses,
	applyStyles,
	stylesOf,
} from '../src/adapter/runtime/root-attributes'
import { find, findIn, mountHost, nextFrame } from './mount'

/** Хост пробы: корни, о которых сообщил `(soElementReady)`. */
abstract class TProbeHost {
	readonly ready: Element[] = []
}

/**
 * Проба на каждый компонент: `direction` ядра против `dir` потребителя,
 * атрибут и класс потребителя под своими именами и `(soElementReady)`.
 */
@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button
		so-button
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
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
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
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
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
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
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
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
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class SkeletonProbe extends TProbeHost {}

@Component({
	standalone: true,
	imports: [TLabelComponent],
	template: `<label
		so-label
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></label>`,
})
class LabelProbe extends TProbeHost {}

@Component({
	standalone: true,
	imports: [TFieldComponent],
	template: `<div
		so-field
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class FieldProbe extends TProbeHost {}

@Component({
	selector: 'probe-progress-linear',
	standalone: true,
	imports: [TProgressLinearComponent],
	template: `<span
		so-progress-linear
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></span>`,
})
class ProgressLinearProbe extends TProbeHost {}

/**
 * Ползунок и оценка — без деления атрибутов: полей у ползунка столько, сколько
 * ручек, а поле оценки указатель не ловит, поэтому написанное потребителем
 * остаётся на корне, как у Vue.
 */
@Component({
	selector: 'probe-slider',
	standalone: true,
	imports: [TSliderComponent],
	template: `<span
		so-slider
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></span>`,
})
class SliderProbe extends TProbeHost {}

@Component({
	selector: 'probe-rating',
	standalone: true,
	imports: [TRatingComponent],
	template: `<span
		so-rating
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></span>`,
})
class RatingProbe extends TProbeHost {}

@Component({
	selector: 'probe-scroller',
	standalone: true,
	imports: [TScrollerComponent],
	template: `<div
		so-scroller
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class ScrollerProbe extends TProbeHost {}

@Component({
	selector: 'probe-pagination',
	standalone: true,
	imports: [TPaginationComponent],
	template: `<nav
		so-pagination
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></nav>`,
})
class PaginationProbe extends TProbeHost {}

/**
 * Поповер и подсказка — корень с наборами `attrs` и `dataset`: ARIA у них на
 * панели и триггере, а написанное потребителем остаётся на корне, как у Vue.
 * `(soElementReady)` — свой у корня: у Frame внутри шаблона выходы свои.
 */
@Component({
	selector: 'probe-popover',
	standalone: true,
	imports: [TPopoverComponent],
	template: `<span
		so-popover
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></span>`,
})
class PopoverProbe extends TProbeHost {}

@Component({
	selector: 'probe-tooltip',
	standalone: true,
	imports: [TTooltipComponent],
	template: `<span
		so-tooltip
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></span>`,
})
class TooltipProbe extends TProbeHost {}

/**
 * Меню — корень с наборами `attrs` и `dataset`, как у поповера: ARIA у него на
 * панели и триггере. Группы и разделитель — корень с тремя наборами ядра, и
 * вне меню тоже.
 */
@Component({
	selector: 'probe-menu',
	standalone: true,
	imports: [TMenuComponent],
	template: `<span
		so-menu
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></span>`,
})
class MenuProbe extends TProbeHost {}

@Component({
	selector: 'probe-menu-group',
	standalone: true,
	imports: [TMenuGroupComponent],
	template: `<div
		so-menu-group
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class MenuGroupProbe extends TProbeHost {}

@Component({
	selector: 'probe-menu-radio-group',
	standalone: true,
	imports: [TMenuRadioGroupComponent],
	template: `<div
		so-menu-radio-group
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class MenuRadioGroupProbe extends TProbeHost {}

@Component({
	selector: 'probe-menu-separator',
	standalone: true,
	imports: [TMenuSeparatorComponent],
	template: `<div
		so-menu-separator
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class MenuSeparatorProbe extends TProbeHost {}

/**
 * Набор тегов — корень с тремя наборами ядра: ряд с ролью и есть набор, и
 * написанное потребителем остаётся на корне, как у Vue.
 */
@Component({
	selector: 'probe-tags',
	standalone: true,
	imports: [TTagsComponent],
	template: `<div
		so-tags
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class TagsProbe extends TProbeHost {}

/** Компонент, хост его пробы, селектор корня и класс ядра на нём. */
const COMPONENTS: ReadonlyArray<readonly [string, Type<TProbeHost>, string, string]> = [
	['Button', ButtonProbe, '[so-button]', 'so-button'],
	['ComponentView', ComponentViewProbe, '[so-component-view]', 'so-component-view'],
	['Icon', IconProbe, '[so-icon]', 'so-icon'],
	['ProgressSpinner', ProgressSpinnerProbe, '[so-progress-spinner]', 'so-progress-spinner'],
	['ProgressLinear', ProgressLinearProbe, '[so-progress-linear]', 'so-progress-linear'],
	['Skeleton', SkeletonProbe, '[so-skeleton]', 'so-skeleton'],
	['Label', LabelProbe, '[so-label]', 'so-label'],
	['Field', FieldProbe, '[so-field]', 'so-field'],
	['Slider', SliderProbe, '[so-slider]', 'so-slider'],
	['Rating', RatingProbe, '[so-rating]', 'so-rating'],
	['Scroller', ScrollerProbe, '[so-scroller]', 'so-scroller'],
	['Pagination', PaginationProbe, '[so-pagination]', 'so-pagination'],
	['Popover', PopoverProbe, '[so-popover]', 'so-popover'],
	['Tooltip', TooltipProbe, '[so-tooltip]', 'so-tooltip'],
	['Menu', MenuProbe, '[so-menu]', 'so-menu'],
	['Menu.Group', MenuGroupProbe, '[so-menu-group]', 'so-menu-group'],
	['Menu.RadioGroup', MenuRadioGroupProbe, '[so-menu-radio-group]', 'so-menu-group'],
	['Menu.Separator', MenuSeparatorProbe, '[so-menu-separator]', 'so-menu-separator'],
	['Tags', TagsProbe, '[so-tags]', 'so-tags'],
]

/**
 * Проба поля: у него атрибуты потребителя делятся между корнем и `<input>`.
 * `dir` потребителя — атрибут из разметки, и он уезжает на поле, а `dir` ядра
 * по `direction` стоит на корне.
 *
 * Селектор свой у каждой пробы поля и списка: их разметка различается только
 * тегом, а тег в id компонента Angular не входит — без селектора id совпал бы
 * (предупреждение NG0912).
 */
@Component({
	selector: 'probe-check-box',
	standalone: true,
	imports: [TCheckBoxComponent],
	template: `<span
		so-check-box
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		style="color: red"
		(soElementReady)="ready.push($event)"
	></span>`,
})
class CheckBoxProbe extends TProbeHost {}

@Component({
	selector: 'probe-switch',
	standalone: true,
	imports: [TSwitchComponent],
	template: `<span
		so-switch
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		style="color: red"
		(soElementReady)="ready.push($event)"
	></span>`,
})
class SwitchProbe extends TProbeHost {}

@Component({
	selector: 'probe-input',
	standalone: true,
	imports: [TInputComponent],
	template: `<div
		so-input
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		style="color: red"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class InputProbe extends TProbeHost {}

@Component({
	selector: 'probe-number-input',
	standalone: true,
	imports: [TNumberInputComponent],
	template: `<div
		so-number-input
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		style="color: red"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class NumberInputProbe extends TProbeHost {}

@Component({
	selector: 'probe-textarea',
	standalone: true,
	imports: [TTextareaComponent],
	template: `<div
		so-textarea
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		style="color: red"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class TextareaProbe extends TProbeHost {}

/**
 * Select делит написанное, как поле: класс и стиль — корню, остальное —
 * `<input>` его поля. Поле — само хост в шаблоне Select, и до `<input>`
 * написанное доходит цепочкой хостов.
 */
@Component({
	selector: 'probe-select',
	standalone: true,
	imports: [TSelectComponent],
	template: `<div
		so-select
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		style="color: red"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class SelectProbe extends TProbeHost {}

/** Поля выключенные и с ошибкой — её пишет поле формы `Field` над каждым. */
@Component({
	standalone: true,
	imports: [
		TFieldComponent,
		TCheckBoxComponent,
		TSwitchComponent,
		TInputComponent,
		TNumberInputComponent,
		TTextareaComponent,
		TSelectComponent,
	],
	template: `<div so-field invalid><span so-check-box disabled></span></div>
		<div so-field invalid><span so-switch disabled></span></div>
		<div so-field invalid><div so-input disabled></div></div>
		<div so-field invalid><div so-number-input disabled></div></div>
		<div so-field invalid><div so-textarea disabled></div></div>
		<div so-field invalid><div so-select disabled></div></div>`,
})
class InvalidFieldsHost {}

/**
 * Поле, хост его пробы, селектор корня, класс ядра на нём и селектор поля
 * внутри корня: `<input>`, у Textarea — `<textarea>`, у NumberInput — ввод
 * числа по своему классу: рядом в корне лежит скрытое поле формы, у Select —
 * `<input>` его поля.
 */
const FIELDS: ReadonlyArray<readonly [string, Type<TProbeHost>, string, string, string]> = [
	['CheckBox', CheckBoxProbe, '[so-check-box]', 'so-check-box', 'input'],
	['Switch', SwitchProbe, '[so-switch]', 'so-switch', 'input'],
	['Input', InputProbe, '[so-input]', 'so-input', 'input'],
	[
		'NumberInput',
		NumberInputProbe,
		'[so-number-input]',
		'so-number-input',
		'.so-number-input__input',
	],
	['Textarea', TextareaProbe, '[so-textarea]', 'so-textarea', 'textarea'],
	['Select', SelectProbe, '[so-select]', 'so-select', '.so-select__field input'],
]

/**
 * Проба списка: у ListBox и Tabs атрибуты потребителя делятся, как у поля, —
 * между корнем и узлом списка, на котором роль и `aria` компонента. `dir`
 * потребителя уезжает на узел списка, а `dir` ядра по `direction` стоит на
 * корне. Селектор свой — по той же причине, что у проб полей.
 */
@Component({
	selector: 'probe-list-box',
	standalone: true,
	imports: [TListBoxComponent],
	template: `<div
		so-list-box
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		style="color: red"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class ListBoxProbe extends TProbeHost {}

@Component({
	selector: 'probe-tabs',
	standalone: true,
	imports: [TTabsComponent],
	template: `<div
		so-tabs
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		style="color: red"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class TabsProbe extends TProbeHost {}

/** Список, хост его пробы, селектор корня, класс ядра на нём и селектор узла списка. */
const LISTS: ReadonlyArray<readonly [string, Type<TProbeHost>, string, string, string]> = [
	['ListBox', ListBoxProbe, '[so-list-box]', 'so-list-box', '[role="listbox"]'],
	['Tabs', TabsProbe, '[so-tabs]', 'so-tabs', '[role="tablist"]'],
]

/**
 * Проба окна и выезжающей панели — открытых: корень уезжает в цель, и всё,
 * что потребитель на нём написал, едет с ним. Селектор свой — по той же
 * причине, что у проб полей.
 */
@Component({
	selector: 'probe-dialog',
	standalone: true,
	imports: [TDialogComponent],
	template: `<div
		so-dialog
		visible
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		style="color: red"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class DialogProbe extends TProbeHost {}

@Component({
	selector: 'probe-drawer',
	standalone: true,
	imports: [TDrawerComponent],
	template: `<div
		so-drawer
		visible
		direction="rtl"
		dir="ltr"
		title="probe"
		class="mine"
		style="color: red"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class DrawerProbe extends TProbeHost {}

/** Слой с корнем в цели, хост его пробы, селектор корня и класс ядра на нём. */
const LAYERS: ReadonlyArray<readonly [string, Type<TProbeHost>, string, string]> = [
	['Dialog', DialogProbe, '[so-dialog]', 'so-dialog'],
	['Drawer', DrawerProbe, '[so-drawer]', 'so-drawer'],
]

describe('что называет ядро, — за базой, остальное — потребителя', () => {
	/**
	 * `dir` ядро пишет в `attrs` по `direction`, и имя `dir` у него — за базой,
	 * как привязка хоста `[attr.dir]`: значение потребителя она перепишет.
	 */
	it.each(COMPONENTS)('%s: dir ядра — поверх dir потребителя', (_name, host, selector) => {
		const el = findIn(mountHost(host), selector, HTMLElement)

		expect(el.getAttribute('dir')).toBe('rtl')
	})

	it.each(COMPONENTS)(
		'%s: атрибут и класс потребителя под своими именами — рядом с ядром',
		(_name, host, selector, own) => {
			const el = findIn(mountHost(host), selector, HTMLElement)

			expect(el.getAttribute('title')).toBe('probe')
			expect(el.classList.contains('mine')).toBe(true)
			expect(el.classList.contains(own)).toBe(true)
		},
	)
})

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button so-button dir="ltr" [direction]="direction()"></button>`,
})
class DirectionHost {
	readonly direction = signal<TDirection>('inherit')
}

describe('имя, которое ядро называет не всегда', () => {
	/**
	 * С `direction="inherit"` ядро `dir` не пишет, и атрибут на элементе —
	 * потребителя. Назвало — `dir` за базой, а когда перестало называть, база
	 * его снимает: имя её, что бы на нём ни стояло.
	 */
	it('dir потребителя стоит, пока ядро dir не называет', () => {
		const fixture = mountHost(DirectionHost)
		const el = findIn(fixture, '[so-button]', HTMLElement)

		expect(el.getAttribute('dir')).toBe('ltr')

		fixture.componentInstance.direction.set('rtl')
		fixture.detectChanges()

		expect(el.getAttribute('dir')).toBe('rtl')

		fixture.componentInstance.direction.set('inherit')
		fixture.detectChanges()

		expect(el.hasAttribute('dir')).toBe(false)
	})
})

describe('корень связан с TElementPlugin', () => {
	/** Компонент, хост его пробы и селектор корня — у компонентов и у полей. */
	const ROOTS = [...COMPONENTS, ...FIELDS].map(
		([name, host, selector]) => [name, host, selector] as const,
	)

	it.each(ROOTS)('%s: soElementReady приходит с корнем', async (_name, host, selector) => {
		const fixture = mountHost(host)

		await nextFrame()

		expect(fixture.componentInstance.ready).toEqual([findIn(fixture, selector, HTMLElement)])
	})
})

/**
 * У поля атрибуты потребителя делятся, как у Vue и React: класс и стиль —
 * корню, атрибуты из разметки — вложенному полю (`<input>`, у Textarea —
 * `<textarea>`, у NumberInput — ввод числа), куда их переносит база
 * (`TRootSpec.control`). Наборы ядра — каждый на своём элементе: `attrs`
 * (`dir`) — на корне, `aria` — на поле.
 */
describe('поле: атрибуты потребителя делятся между корнем и полем', () => {
	it.each(FIELDS)(
		'%s: класс и стиль — на корне рядом с классом ядра',
		(_name, host, selector, own) => {
			const el = findIn(mountHost(host), selector, HTMLElement)

			expect(el.classList.contains('mine')).toBe(true)
			expect(el.classList.contains(own)).toBe(true)
			expect(el.style.color).toBe('red')
		},
	)

	/** Свой класс у поля бывает — ввод NumberInput: по нему ввод находят плагины. */
	it.each(FIELDS)(
		'%s: атрибуты из разметки — на поле, не на корне',
		(_name, host, selector, _own, control) => {
			const fixture = mountHost(host)
			const el = findIn(fixture, selector, HTMLElement)
			const input = findIn(fixture, `${selector} ${control}`, HTMLElement)

			expect(el.hasAttribute('title')).toBe(false)
			expect(input.getAttribute('title')).toBe('probe')
			expect(input.classList.contains('mine')).toBe(false)
			expect(input.hasAttribute('style')).toBe(false)
		},
	)

	/**
	 * Тема красит коробку поля и подпись поля формы `Field` по корню поля —
	 * прямому ребёнку обёртки контрола, — поэтому `dataset` (`data-disabled`,
	 * `data-invalid`) база кладёт на корень, а ошибку скринридеру объявляет
	 * поле.
	 */
	it.each(FIELDS)(
		'%s: data-disabled и data-invalid — на корне, aria-invalid — у поля',
		(_name, _host, selector, _own, control) => {
			const fixture = mountHost(InvalidFieldsHost)
			const el = findIn(fixture, selector, HTMLElement)
			const input = findIn(fixture, `${selector} ${control}`, HTMLElement)

			expect(el.dataset['disabled']).toBe('true')
			expect(el.dataset['invalid']).toBe('true')
			expect(input.hasAttribute('data-disabled')).toBe(false)
			expect(input.hasAttribute('data-invalid')).toBe(false)
			expect(input.getAttribute('aria-invalid')).toBe('true')
		},
	)

	/**
	 * У ввода NumberInput `dir` называет и ядро — направление числа в формате
	 * (`inputAttrs`), у `en-US` тот же `ltr`: на поле он стоит при любом
	 * `direction` поля.
	 */
	it.each(FIELDS)(
		'%s: dir ядра — на корне, dir потребителя — на поле',
		(_name, host, selector, _own, control) => {
			const fixture = mountHost(host)
			const el = findIn(fixture, selector, HTMLElement)

			expect(el.getAttribute('dir')).toBe('rtl')
			expect(findIn(fixture, `${selector} ${control}`, HTMLElement).getAttribute('dir')).toBe(
				'ltr',
			)
		},
	)
})

/**
 * У ListBox и Tabs атрибуты потребителя делятся, как у поля: класс и стиль —
 * корню, атрибуты из разметки — узлу списка, где роль и `aria` компонента
 * (`TRootSpec.control`). Наборы ядра — каждый на своём элементе: `attrs`
 * (`dir`) — на корне, `aria` — на узле списка.
 */
describe('ListBox и Tabs: атрибуты потребителя делятся между корнем и списком', () => {
	it.each(LISTS)(
		'%s: класс и стиль — на корне рядом с классом ядра',
		(_name, host, selector, own, list) => {
			const fixture = mountHost(host)
			const el = findIn(fixture, selector, HTMLElement)
			const node = findIn(fixture, list, HTMLElement)

			expect(el.classList.contains('mine')).toBe(true)
			expect(el.classList.contains(own)).toBe(true)
			expect(el.style.color).toBe('red')
			expect(node.classList.contains('mine')).toBe(false)
			expect(node.style.color).toBe('')
		},
	)

	it.each(LISTS)(
		'%s: атрибуты из разметки — на узле списка, не на корне',
		(_name, host, selector, _own, list) => {
			const fixture = mountHost(host)
			const el = findIn(fixture, selector, HTMLElement)
			const node = findIn(fixture, list, HTMLElement)

			expect(node.parentElement).toBe(el)
			expect(el.hasAttribute('title')).toBe(false)
			expect(node.getAttribute('title')).toBe('probe')
		},
	)

	it.each(LISTS)(
		'%s: dir ядра — на корне, dir потребителя — на узле списка',
		(_name, host, selector, _own, list) => {
			const fixture = mountHost(host)

			expect(findIn(fixture, selector, HTMLElement).getAttribute('dir')).toBe('rtl')
			expect(findIn(fixture, list, HTMLElement).getAttribute('dir')).toBe('ltr')
		},
	)

	it.each(LISTS)('%s: soElementReady приходит с корнем', async (_name, host, selector) => {
		const fixture = mountHost(host)

		await nextFrame()

		expect(fixture.componentInstance.ready).toEqual([findIn(fixture, selector, HTMLElement)])
	})
})

/**
 * Окно и выезжающая панель: корень — элемент потребителя, и в цель он уезжает
 * со всем, что на нём написано. Атрибут, класс и стиль потребителя стоят на
 * нём рядом с наборами и классами ядра, раскладкой слоя и пометкой
 * владельцем, которую база кладёт слоем выходов плагинов (`TRootSpec.plugins`).
 * `tabindex="-1"` — статика хоста. Корень — в `body`, мимо хоста пробы, и
 * ищется по документу.
 */
describe('окно и выезжающая панель: корень в цели', () => {
	it.each(LAYERS)(
		'%s: атрибуты, класс и стиль потребителя — рядом с наборами ядра и data-owner',
		async (_name, host, selector, own) => {
			const fixture = mountHost(host)

			const el = find(document, selector, HTMLElement)

			expect(el.parentElement).toBe(document.body)
			expect(el.getAttribute('title')).toBe('probe')
			expect(el.classList.contains('mine')).toBe(true)
			expect(el.classList.contains(own)).toBe(true)
			expect(el.style.color).toBe('red')
			expect(el.getAttribute('dir')).toBe('rtl')
			expect(el.getAttribute('role')).toBe('dialog')
			expect(el.getAttribute('data-open')).toBe('true')
			expect(el.getAttribute('data-owner')).toBeTruthy()
			expect(el.getAttribute('tabindex')).toBe('-1')

			// Номер слоя открыт только у слоя с узлом: его даёт кадр узла
			await nextFrame()
			fixture.detectChanges()

			expect(el.getAttribute('data-layer')).not.toBeNull()
			expect(el.style.zIndex).toBe(el.getAttribute('data-layer'))
		},
	)

	it.each(LAYERS)(
		'%s: soElementReady приходит с корнем в цели',
		async (_name, host, selector) => {
			const fixture = mountHost(host)

			await nextFrame()

			expect(fixture.componentInstance.ready).toEqual([find(document, selector, HTMLElement)])
		},
	)
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

/** Размера иконки ядро не называет: ширина — только потребителя. */
@Component({
	standalone: true,
	imports: [TIconComponent],
	template: `<i so-icon [style.width]="'40px'" [height]="height()"></i>`,
})
class ConsumerOnlyWidthHost {
	readonly height = signal(12)
}

/** Корень иконки в хосте. */
const icon = (fixture: ComponentFixture<unknown>) => findIn(fixture, '[so-icon]', HTMLElement)

describe('стиль: что называет ядро, — за базой', () => {
	/**
	 * Ширину называет плагин раскладки, и свойство за базой, как привязка хоста
	 * `[style.width]`: своё сменившееся значение она пишет поверх потребителя.
	 */
	it('смена размера от плагина раскладки пишет ширину поверх [style.width] потребителя', () => {
		const fixture = mountHost(ConsumerWidthHost)

		fixture.componentInstance.width.set(32)
		fixture.detectChanges()

		expect(icon(fixture).style.width).toBe('32px')
		expect(icon(fixture).style.height).toBe('12px')
	})

	it('свойство, которого ядро не называет, — потребителя', () => {
		const fixture = mountHost(ConsumerOnlyWidthHost)

		expect(icon(fixture).style.width).toBe('40px')
		expect(icon(fixture).style.height).toBe('12px')

		fixture.componentInstance.height.set(20)
		fixture.detectChanges()

		expect(icon(fixture).style.width).toBe('40px')
		expect(icon(fixture).style.height).toBe('20px')
	})

	/**
	 * Узел база не читает: свойство, которое снял потребитель, она вернёт со
	 * следующей своей сменой, а не сразу.
	 */
	it('снятый [style.width] потребителя база вернёт со своей следующей сменой', () => {
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
			[value]="value()"
			[style.--so-progress-spinner-fraction]="'0.9'"
		></span>
		<span so-progress-spinner class="plain" [value]="value()" [visible]="visible()"></span>`,
})
class FractionHost {
	readonly value = signal(40)
	readonly visible = signal(true)
}

describe('стиль-выход компонента', () => {
	/** Долю называет ядро — свойство за базой, как и у стиля плагина раскладки. */
	it('ProgressSpinner: смена доли пишет её поверх стиля потребителя', () => {
		const fixture = mountHost(FractionHost)
		const el = findIn(fixture, '.bound', HTMLElement)

		fixture.componentInstance.value.set(60)
		fixture.detectChanges()

		expect(el.style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.6')
	})

	it('ProgressSpinner: --* доходит до узла под своим именем, смена доли — тоже', () => {
		const fixture = mountHost(FractionHost)
		const el = findIn(fixture, '.plain', HTMLElement)

		expect(el.style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.4')

		fixture.componentInstance.value.set(60)
		fixture.detectChanges()

		expect(el.style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.6')
	})

	it('ProgressSpinner: скрытие трогает только display, доля остаётся', () => {
		const fixture = mountHost(FractionHost)
		const el = findIn(fixture, '.plain', HTMLElement)

		fixture.componentInstance.visible.set(false)
		fixture.detectChanges()

		expect(el.style.display).toBe('none')
		expect(el.style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.4')
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
			stylesOf({ '--so-dialog-width': '320px', 'z-index': 3 }),
			new Map(),
		)

		expect(node.style.getPropertyValue('--so-dialog-width')).toBe('320px')
		expect(node.style.zIndex).toBe('3')

		applyStyles(node, stylesOf({ 'z-index': 3 }), applied)

		expect(node.style.getPropertyValue('--so-dialog-width')).toBe('')
		expect(node.style.zIndex).toBe('3')
	})

	/**
	 * Свойство, которое называет ядро, — за базой: своё сменившееся значение она
	 * пишет поверх чужого, а ушедшее из стиля снимает, что бы на узле ни стояло.
	 */
	it('свойство, которое называет ядро, база пишет поверх чужого значения и снимает', () => {
		const node = document.createElement('div')

		let applied = applyStyles(node, stylesOf({ width: '10px' }), new Map())

		// Поверх базы пишет плагин или потребитель
		node.style.setProperty('width', '50px')

		applied = applyStyles(node, stylesOf({ width: '20px' }), applied)

		expect(node.style.width).toBe('20px')

		node.style.setProperty('width', '50px')
		applyStyles(node, stylesOf({}), applied)

		expect(node.style.width).toBe('')
	})

	/** Так после гидратации база берёт своим стиль, который напечатал сервер. */
	it('первая раскладка пишет поверх того, что уже стоит на узле', () => {
		const node = document.createElement('div')

		node.style.setProperty('width', '10px')
		node.style.setProperty('color', 'red')

		let applied = applyStyles(node, stylesOf({ width: '10px' }), new Map())

		applied = applyStyles(node, stylesOf({ width: '20px' }), applied)

		expect(node.style.width).toBe('20px')

		applyStyles(node, stylesOf({}), applied)

		expect(node.style.width).toBe('')
		// Чего ядро не называет, база не трогает
		expect(node.style.color).toBe('red')
	})
})

describe('раскладка наборов и классов', () => {
	/**
	 * Так же, как стиль: на узле уже стоит то, что напечатал сервер или написал
	 * потребитель, а память базы пуста. Что называет ядро, база пишет своим и
	 * снимает, когда ядро его больше не называет; остальное не трогает.
	 */
	it('атрибут, который называет ядро, — за базой с первой раскладки', () => {
		const node = document.createElement('div')

		node.setAttribute('tabindex', '-1')
		node.setAttribute('aria-disabled', 'true')
		node.setAttribute('title', 'Сохранить')

		let applied = applyAttributes(node, { tabindex: '0', 'aria-disabled': null }, new Map())

		expect(node.getAttribute('tabindex')).toBe('0')
		// `null` ядро имени не называет: атрибут не его, база его не трогает
		expect(node.getAttribute('aria-disabled')).toBe('true')

		applied = applyAttributes(node, { 'aria-disabled': 'true' }, applied)

		expect(node.hasAttribute('tabindex')).toBe(false)
		expect(node.getAttribute('aria-disabled')).toBe('true')

		applyAttributes(node, {}, applied)

		expect(node.hasAttribute('aria-disabled')).toBe(false)
		expect(node.getAttribute('title')).toBe('Сохранить')
	})

	it('класс, который называет ядро, — за базой с первой раскладки', () => {
		const node = document.createElement('div')

		node.className = 'own so-button so-button--size-normal'

		let applied = applyClasses(node, ['so-button', 'so-button--size-normal'], new Set())

		applied = applyClasses(node, ['so-button', 'so-button--size-xl'], applied)

		expect([...node.classList]).toEqual(['own', 'so-button', 'so-button--size-xl'])

		applyClasses(node, [], applied)

		expect([...node.classList]).toEqual(['own'])
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

		button.style.setProperty('--so-swipe-offset', '12px')
		el.style.setProperty('--so-swipe-offset', '7px')

		fixture.componentInstance.ctrl.hide()
		fixture.detectChanges()
		fixture.componentInstance.ctrl.show()
		fixture.componentInstance.color.set('blue')
		fixture.componentInstance.width.set(20)
		fixture.detectChanges()

		expect(button.style.getPropertyValue('--so-swipe-offset')).toBe('12px')
		expect(button.style.color).toBe('blue')
		expect(button.style.display).toBe('')
		expect(el.style.getPropertyValue('--so-swipe-offset')).toBe('7px')
		expect(el.style.width).toBe('20px')
	})
})

/**
 * Корень внутри обёртки — у таблицы (`'wrapped'`): элемент компонента
 * (`<div so-table>`) — окно, а корень — `table` в шаблоне, как
 * `div.so-table__viewport` вокруг `table` у Vue и React. Класс и стиль
 * потребителя стоят на окне, и его же прячет видимость; остальные статические
 * атрибуты разметки база переносит на `table`, как на поле, — там же классы,
 * наборы ядра и `TElementPlugin`.
 */
@Component({
	standalone: true,
	imports: [TTableComponent],
	template: `<div
		so-table
		[columns]="columns"
		direction="rtl"
		dir="ltr"
		title="probe"
		aria-label="Сотрудники"
		id="staff"
		data-probe="1"
		class="mine"
		style="color: red"
		[visible]="visible()"
		[stickyHead]="sticky()"
		(soElementReady)="ready.push($event)"
	></div>`,
})
class TableProbe {
	readonly columns = [{ field: 'name', text: 'Имя' }]
	readonly visible = signal(true)
	readonly sticky = signal(false)
	readonly ready: Element[] = []
}

/**
 * Имя таблицы и входом, и атрибутом: `aria-label` называет и ядро — плагин
 * доступного имени пишет его в `aria` таблицы.
 */
@Component({
	standalone: true,
	imports: [TTableComponent],
	template: `<div so-table [columns]="columns" aria_label="Ядро" aria-label="Своё"></div>`,
})
class TableNameProbe {
	readonly columns = [{ field: 'name', text: 'Имя' }]
}

/** Окно таблицы — элемент компонента — и `table` в нём. */
function tableParts(fixture: ComponentFixture<unknown>): {
	viewport: HTMLElement
	table: HTMLElement
} {
	return {
		viewport: findIn(fixture, '[so-table]', HTMLElement),
		table: findIn(fixture, '[so-table] > table', HTMLElement),
	}
}

describe('корень внутри обёртки: окно таблицы', () => {
	it('класс и стиль потребителя — окну, рядом с его классом', () => {
		const { viewport, table } = tableParts(mountHost(TableProbe))

		expect([...viewport.classList].sort()).toEqual(['mine', 'so-table__viewport'])
		expect(viewport.style.color).toBe('red')
		expect(table.classList.contains('mine')).toBe(false)
		expect(table.style.color).toBe('')
	})

	/**
	 * Статические атрибуты разметки, кроме класса и стиля, база переносит на
	 * `table`, как на поле: там роль и имя таблицы, и `aria-label` называет её,
	 * а не окно без роли.
	 */
	it('остальные атрибуты из разметки — table, а не окну', () => {
		const { viewport, table } = tableParts(mountHost(TableProbe))

		expect(table.getAttribute('title')).toBe('probe')
		expect(table.getAttribute('aria-label')).toBe('Сотрудники')
		expect(table.id).toBe('staff')
		expect(table.dataset['probe']).toBe('1')
		expect(
			['title', 'aria-label', 'id', 'data-probe', 'dir'].filter((name) =>
				viewport.hasAttribute(name),
			),
		).toEqual([])
	})

	/**
	 * Имя, которое называет ядро, — за ядром, как на корне-хосте: атрибуты
	 * потребителя встают на `table` раньше раскладки наборов. `dir` ядро пишет
	 * в `attrs` по `direction`, имя — в `aria` по `aria_label`.
	 */
	it('dir и aria-label, которые называет ядро, — за ядром', () => {
		expect(tableParts(mountHost(TableProbe)).table.getAttribute('dir')).toBe('rtl')
		expect(tableParts(mountHost(TableNameProbe)).table.getAttribute('aria-label')).toBe('Ядро')
	})

	it('классы и наборы ядра — table; смена набора доходит до неё, а не до окна', () => {
		const fixture = mountHost(TableProbe)
		const { viewport, table } = tableParts(fixture)

		expect(table.classList.contains('so-table')).toBe(true)
		expect(viewport.classList.contains('so-table')).toBe(false)
		expect(table.getAttribute('dir')).toBe('rtl')
		expect(table.dataset['stickyHead']).toBe('false')

		fixture.componentInstance.sticky.set(true)
		fixture.detectChanges()

		expect(table.dataset['stickyHead']).toBe('true')
		expect(viewport.hasAttribute('data-sticky-head')).toBe(false)
	})

	it('входы — не атрибуты окна: статические атрибуты входов база снимает', () => {
		const { viewport } = tableParts(mountHost(TableProbe))

		expect(viewport.hasAttribute('direction')).toBe(false)
	})

	it('скрытие — окну: visible=false прячет окно, table не трогает', () => {
		const fixture = mountHost(TableProbe)
		const { viewport, table } = tableParts(fixture)

		fixture.componentInstance.visible.set(false)
		fixture.detectChanges()

		expect(viewport.style.display).toBe('none')
		expect(table.style.display).toBe('')

		fixture.componentInstance.visible.set(true)
		fixture.detectChanges()

		expect(viewport.style.display).toBe('')
	})

	it('soElementReady приходит с table, а не с окном', async () => {
		const fixture = mountHost(TableProbe)

		await nextFrame()

		expect(fixture.componentInstance.ready).toEqual([tableParts(fixture).table])
	})

	/**
	 * Окно — элемент потребителя: свойство, которое записали в него мимо
	 * разметки, база не трогает — она пишет на него только скрытие.
	 */
	it('свойство, записанное в окно мимо разметки, переживает смену видимости и набора', () => {
		const fixture = mountHost(TableProbe)
		const { viewport } = tableParts(fixture)

		viewport.style.setProperty('--so-probe', '7px')

		fixture.componentInstance.visible.set(false)
		fixture.componentInstance.sticky.set(true)
		fixture.detectChanges()
		fixture.componentInstance.visible.set(true)
		fixture.detectChanges()

		expect(viewport.style.getPropertyValue('--so-probe')).toBe('7px')
		expect(viewport.style.color).toBe('red')
	})
})
