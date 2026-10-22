/**
 * Field под Angular: поле формы — подпись, контрол, подсказка и ошибка.
 *
 * Сценарии — те же, что у Vue (`field.spec.ts`), React, Solid и Svelte, на
 * контролах, которые в адаптере есть. Части — разметка поля: часть стоит,
 * пока задан её текст, ошибка — при `invalid` и на месте подсказки. С
 * контролом поле связывает проводка: поле опускает связку в свой слой лифта
 * (`provideElevator()`), контрол её берёт. Labelable-контрол (Input,
 * NumberInput, Select, CheckBox, Switch, Rating, Slider с одной ручкой)
 * подпись называет своим `for`, группу (RadioGroup, Slider с несколькими
 * ручками) — ссылкой `aria-labelledby`. Справку контрол получает в
 * `aria-describedby`, ошибку — `aria-invalid` и `data-invalid` на своём
 * корне. У Select связку берёт он сам, а не его поле — деталь его разметки:
 * набор `aria` Select разметка кладёт на поле, а цепочка хостов доводит его до
 * `<input>`, где фокус.
 *
 * Угол зрения здесь свой. Обёртки нет: корень — элемент потребителя
 * (`<div so-field>`), слот части — элемент с атрибутом `slot`, как у Label.
 * DI идёт по дереву объявлений, поэтому связку видит контрол, которого
 * потребитель написал внутри поля, а шаблон слота контрола — слой самого
 * контрола.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TField, TInput, TSlider, type TFieldPosition, type TSliderMarks } from '@soldy-ui/core'
import {
	SlotDirective,
	TCheckBoxComponent,
	TFieldComponent,
	TInputComponent,
	TLabelComponent,
	TNumberInputComponent,
	TRadioGroupComponent,
	TRadioGroupItemComponent,
	TRatingComponent,
	TSelectComponent,
	TSelectItemComponent,
	TSliderComponent,
	TSwitchComponent,
} from '@soldy-ui/angular'
import { findIn, markupOf, mountHost } from './mount'

/** Подпись поля в разметке хоста. */
const labelOf = (fixture: ComponentFixture<unknown>) =>
	findIn(fixture, '.so-field__label', HTMLLabelElement)

/** Атрибут ссылок, разобранный на `id`. */
const refsOf = (element: Element, name: string): string[] =>
	(element.getAttribute(name) ?? '').split(' ').filter(Boolean)

/** Узел по селектору в разметке хоста. */
const node = (fixture: ComponentFixture<unknown>, selector: string) =>
	findIn(fixture, selector, HTMLElement)

/** Поле контрола по селектору в разметке хоста. */
const input = (fixture: ComponentFixture<unknown>, selector: string) =>
	findIn(fixture, selector, HTMLInputElement)

@Component({
	standalone: true,
	imports: [TFieldComponent, TInputComponent],
	template: `<div so-field label="Почта" helper="Не покажем никому"><div so-input></div></div>`,
})
class MarkupHost {}

@Component({
	standalone: true,
	imports: [TFieldComponent, TInputComponent],
	template: `<div so-field><div so-input></div></div>`,
})
class BareHost {}

@Component({
	standalone: true,
	imports: [TFieldComponent, TInputComponent],
	template: `<div so-field label="Почта">
		<b slot="label-content">Почта *</b>
		<a slot="helper-content" href="#">Подробнее</a>
		<div so-input></div>
	</div>`,
})
class PartSlotsHost {}

@Component({
	standalone: true,
	imports: [TFieldComponent, TInputComponent],
	template: `<div so-field error="Ошибка" invalid>
		<b slot="error-content">Нет @</b>
		<div so-input></div>
	</div>`,
})
class ErrorSlotHost {}

@Component({
	standalone: true,
	imports: [TFieldComponent],
	template: `<div so-field [position]="position()"></div>`,
})
class PositionHost {
	readonly position = signal<TFieldPosition>('start')
}

@Component({
	standalone: true,
	imports: [TFieldComponent],
	template: `<section so-field></section>`,
})
class SectionHost {}

/** Вид контрола в поле; `slider-range` — ползунок с двумя ручками. */
type TControl =
	| 'input'
	| 'number-input'
	| 'select'
	| 'check-box'
	| 'switch'
	| 'rating'
	| 'slider'
	| 'slider-range'
	| 'radio-group'

/**
 * Поле над своим экземпляром и контрол в нём по виду. Вид и экземпляр
 * задаются до первой проверки (`mountControl`).
 */
@Component({
	standalone: true,
	imports: [
		TFieldComponent,
		TInputComponent,
		TNumberInputComponent,
		TCheckBoxComponent,
		TSwitchComponent,
		TRatingComponent,
		TSliderComponent,
		TRadioGroupComponent,
		TRadioGroupItemComponent,
		TSelectComponent,
		TSelectItemComponent,
	],
	template: `<div so-field [ctrl]="field">
		@switch (control) {
			@case ('input') {
				<div so-input></div>
			}
			@case ('number-input') {
				<div so-number-input></div>
			}
			@case ('select') {
				<div so-select>
					<div so-select-item value="msk" text="Москва"></div>
					<div so-select-item value="tver" text="Тверь"></div>
				</div>
			}
			@case ('check-box') {
				<span so-check-box></span>
			}
			@case ('switch') {
				<span so-switch></span>
			}
			@case ('rating') {
				<span so-rating></span>
			}
			@case ('slider') {
				<span so-slider></span>
			}
			@case ('slider-range') {
				<span so-slider [value]="[20, 80]" [thumbLabels]="['От', 'До']"></span>
			}
			@case ('radio-group') {
				<div so-radio-group>
					<label so-radio-group-item value="a">А</label>
					<label so-radio-group-item value="b">Б</label>
				</div>
			}
		}
	</div>`,
})
class ControlHost {
	field = new TField()
	control: TControl = 'input'
}

/** Поле над экземпляром `field` с контролом вида `control`. */
function mountControl(field: TField, control: TControl): ComponentFixture<ControlHost> {
	const fixture = TestBed.createComponent(ControlHost)

	fixture.componentInstance.field = field
	fixture.componentInstance.control = control
	fixture.detectChanges()

	return fixture
}

describe('Field · разметка', () => {
	it('корень — div с модификаторами стороны и размера, части по порядку', () => {
		const fixture = mountHost(MarkupHost)
		const root = node(fixture, '[so-field]')

		expect(root.localName).toBe('div')
		expect([...root.classList]).toEqual([
			'so-field',
			'so-field--size-normal',
			'so-field--position-top',
		])
		expect([...root.children].map((part) => part.className)).toEqual([
			'so-field__label',
			'so-field__control',
			'so-field__helper',
		])
		expect(labelOf(fixture).textContent).toBe('Почта')
		expect(node(fixture, '.so-field__helper').textContent).toBe('Не покажем никому')
		expect(root.querySelector('.so-field__control > [so-input]')).not.toBeNull()
	})

	it('часть без текста не рисуется', () => {
		const root = node(mountHost(BareHost), '[so-field]')

		expect([...root.children].map((part) => part.className)).toEqual(['so-field__control'])
	})

	it('ошибка — при invalid и на месте подсказки, со значком', () => {
		const ctrl = new TField({ helper: 'Подсказка', error: 'Нет @' })
		const fixture = mountControl(ctrl, 'input')

		expect(fixture.nativeElement.querySelector('.so-field__error')).toBeNull()

		ctrl.invalid = true
		fixture.detectChanges()

		expect(fixture.nativeElement.querySelector('.so-field__helper')).toBeNull()
		expect(node(fixture, '.so-field__error-text').textContent).toBe('Нет @')

		// Значок — декор: смысл несёт текст. Корень иконки по роли — `<svg>`
		const icon = findIn(fixture, '.so-field__error > .so-field__error-icon', SVGElement)

		expect(icon.localName).toBe('svg')
		expect(icon.getAttribute('aria-hidden')).toBe('true')
	})

	it('слот части — своя разметка внутри части, но без текста части не создаёт', () => {
		const fixture = mountHost(PartSlotsHost)

		expect(markupOf(labelOf(fixture))).toBe('<b slot="label-content">Почта *</b>')
		expect(fixture.nativeElement.querySelector('.so-field__helper')).toBeNull()
		expect(fixture.nativeElement.querySelector('a')).toBeNull()
	})

	it('слот ошибки — своя разметка вместо текста', () => {
		const fixture = mountHost(ErrorSlotHost)

		expect(markupOf(node(fixture, '.so-field__error-text'))).toBe(
			'<b slot="error-content">Нет @</b>',
		)
	})

	it('смена position меняет модификатор стороны', () => {
		const fixture = mountHost(PositionHost)
		const root = node(fixture, '[so-field]')

		expect(root.classList.contains('so-field--position-start')).toBe(true)

		fixture.componentInstance.position.set('end')
		fixture.detectChanges()

		expect(root.classList.contains('so-field--position-end')).toBe(true)
		expect(root.classList.contains('so-field--position-start')).toBe(false)
	})

	/** Корень — тот элемент, что написан: тег ядро берёт у него. */
	it('корень — элемент потребителя любого тега', () => {
		const root = node(mountHost(SectionHost), '[so-field]')

		expect(root.localName).toBe('section')
		expect(root.classList.contains('so-field')).toBe(true)
	})
})

/**
 * Labelable-контрол: `for` подписи ведёт на его поле, а справка и ошибка — в
 * наборе поля. Селекторы — корень контрола и поле, которое называет подпись:
 * у NumberInput — ввод числа, а не скрытое поле формы, у Select — `<input>` его
 * поля, у оценки и ползунка с одной ручкой — поле ручки.
 */
const LABELABLES = [
	['Input', 'input', '[so-input]', '[so-input] input'],
	['NumberInput', 'number-input', '[so-number-input]', '.so-number-input__input'],
	['Select', 'select', '[so-select]', '.so-select__field input'],
	['CheckBox', 'check-box', '[so-check-box]', '[so-check-box] input'],
	['Switch', 'switch', '[so-switch]', '[so-switch] input'],
	['Rating', 'rating', '[so-rating]', '[so-rating] input'],
	['Slider', 'slider', '[so-slider]', '[so-slider] input'],
] as const

describe.each(LABELABLES)('%s в поле', (_name, control, root, element) => {
	it('for подписи — на id поля контрола, подписи-ссылки нет', () => {
		const fixture = mountControl(new TField({ label: 'Подпись' }), control)

		expect(input(fixture, element).id).not.toBe('')
		expect(labelOf(fixture).htmlFor).toBe(input(fixture, element).id)
		expect(input(fixture, element).hasAttribute('aria-labelledby')).toBe(false)
	})

	it('справка — в aria-describedby, ошибка — вместо неё, с aria-invalid и data-invalid', () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })
		const fixture = mountControl(ctrl, control)

		expect(refsOf(input(fixture, element), 'aria-describedby')).toEqual([
			node(fixture, '.so-field__helper').id,
		])
		expect(input(fixture, element).hasAttribute('aria-invalid')).toBe(false)
		expect(node(fixture, root).hasAttribute('data-invalid')).toBe(false)

		ctrl.invalid = true
		fixture.detectChanges()

		expect(refsOf(input(fixture, element), 'aria-describedby')).toEqual([
			node(fixture, '.so-field__error').id,
		])
		expect(input(fixture, element).getAttribute('aria-invalid')).toBe('true')
		expect(node(fixture, root).dataset['invalid']).toBe('true')
		expect(input(fixture, element).hasAttribute('data-invalid')).toBe(false)

		ctrl.invalid = false
		fixture.detectChanges()

		expect(input(fixture, element).hasAttribute('aria-invalid')).toBe(false)
		expect(node(fixture, root).hasAttribute('data-invalid')).toBe(false)
	})
})

/** Группа: подпись называет её ссылкой, `for` нет. */
describe('RadioGroup в поле', () => {
	const group = (fixture: ComponentFixture<unknown>) => node(fixture, '[so-radio-group]')

	it('for у подписи нет, группа ссылается на подпись', () => {
		const fixture = mountControl(new TField({ label: 'Подпись' }), 'radio-group')

		expect(labelOf(fixture).hasAttribute('for')).toBe(false)
		expect(labelOf(fixture).id).not.toBe('')
		expect(refsOf(group(fixture), 'aria-labelledby')).toEqual([labelOf(fixture).id])
	})

	it('справка и ошибка — у группы, data-invalid — на её корне', () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })
		const fixture = mountControl(ctrl, 'radio-group')

		expect(refsOf(group(fixture), 'aria-describedby')).toEqual([
			node(fixture, '.so-field__helper').id,
		])

		ctrl.invalid = true
		fixture.detectChanges()

		expect(refsOf(group(fixture), 'aria-describedby')).toEqual([
			node(fixture, '.so-field__error').id,
		])
		expect(group(fixture).getAttribute('aria-invalid')).toBe('true')
		expect(group(fixture).dataset['invalid']).toBe('true')
	})

	it('радио связку поля не берут: id и ссылок на части у них нет', () => {
		const fixture = mountControl(
			new TField({ label: 'Подпись', helper: 'Подсказка' }),
			'radio-group',
		)
		const fields = [...fixture.nativeElement.querySelectorAll('.so-radio-group-item__input')]

		expect(fields).toHaveLength(2)
		expect(fields.map((field) => field.id)).toEqual(['', ''])
		expect(fields.map((field) => field.hasAttribute('aria-describedby'))).toEqual([
			false,
			false,
		])
	})
})

@Component({
	standalone: true,
	imports: [TFieldComponent, TSliderComponent],
	template: `<div so-field label="Цена"><span so-slider [ctrl]="slider"></span></div>`,
})
class SliderCtrlHost {
	readonly slider = new TSlider({ value: 30 })
}

/**
 * Ползунок с несколькими ручками — группа: `for` назвал бы одно поле из них, а
 * ссылка на подпись в наборе полей перекрыла бы имена ручек (`thumbLabels`).
 * Подпись и справка — у корня (`role="group"`, набор корня `rootAria`), а
 * ошибка — `aria-invalid` на каждом поле: на группе ARIA ошибки не объявляет.
 */
describe('Slider с несколькими ручками в поле', () => {
	const root = (fixture: ComponentFixture<unknown>) => node(fixture, '[so-slider]')
	const thumbs = (fixture: ComponentFixture<unknown>): HTMLInputElement[] => [
		...fixture.nativeElement.querySelectorAll('[so-slider] input'),
	]

	it('for у подписи нет, корень — группа со ссылкой на подпись, имена ручек целы', () => {
		const fixture = mountControl(new TField({ label: 'Цена' }), 'slider-range')

		expect(labelOf(fixture).hasAttribute('for')).toBe(false)
		expect(root(fixture).getAttribute('role')).toBe('group')
		expect(refsOf(root(fixture), 'aria-labelledby')).toEqual([labelOf(fixture).id])
		expect(thumbs(fixture).map((thumb) => thumb.getAttribute('aria-label'))).toEqual([
			'От',
			'До',
		])
		expect(thumbs(fixture).map((thumb) => thumb.hasAttribute('aria-labelledby'))).toEqual([
			false,
			false,
		])
		expect(thumbs(fixture).map((thumb) => thumb.id)).toEqual(['', ''])
	})

	it('справка — у группы, ошибка — aria-invalid на каждой ручке, data-invalid на корне', () => {
		const ctrl = new TField({ label: 'Цена', helper: 'Подсказка', error: 'Ошибка' })
		const fixture = mountControl(ctrl, 'slider-range')

		expect(refsOf(root(fixture), 'aria-describedby')).toEqual([
			node(fixture, '.so-field__helper').id,
		])
		expect(thumbs(fixture).map((thumb) => thumb.hasAttribute('aria-describedby'))).toEqual([
			false,
			false,
		])

		ctrl.invalid = true
		fixture.detectChanges()

		expect(refsOf(root(fixture), 'aria-describedby')).toEqual([
			node(fixture, '.so-field__error').id,
		])
		expect(thumbs(fixture).map((thumb) => thumb.getAttribute('aria-invalid'))).toEqual([
			'true',
			'true',
		])
		expect(root(fixture).hasAttribute('aria-invalid')).toBe(false)
		expect(root(fixture).dataset['invalid']).toBe('true')
	})

	it('число ручек сменилось — подпись за ним: for у одной, ссылка группы у нескольких', () => {
		const fixture = mountHost(SliderCtrlHost)
		const { slider } = fixture.componentInstance

		expect(labelOf(fixture).htmlFor).toBe(input(fixture, '[so-slider] input').id)

		slider.value = [20, 80]
		fixture.detectChanges()

		expect(labelOf(fixture).hasAttribute('for')).toBe(false)
		expect(root(fixture).getAttribute('role')).toBe('group')
		expect(refsOf(root(fixture), 'aria-labelledby')).toEqual([labelOf(fixture).id])
		expect(thumbs(fixture).map((thumb) => thumb.id)).toEqual(['', ''])

		slider.value = 50
		fixture.detectChanges()

		const field = input(fixture, '[so-slider] input')

		expect(field.id).not.toBe('')
		expect(labelOf(fixture).htmlFor).toBe(field.id)
		expect(root(fixture).hasAttribute('role')).toBe(false)
		expect(root(fixture).hasAttribute('aria-labelledby')).toBe(false)
	})
})

@Component({
	standalone: true,
	imports: [TFieldComponent, TInputComponent],
	template: `<div so-field label="Почта"><div so-input id="email"></div></div>`,
})
class OwnIdHost {}

@Component({
	standalone: true,
	imports: [TFieldComponent, TInputComponent],
	template: `<div so-field label="Почта">
		@if (shown()) {
			<div so-input [ctrl]="input"></div>
		}
	</div>`,
})
class ShownHost {
	readonly shown = signal(true)
	readonly input = new TInput()
}

describe('Field · id поля', () => {
	it('свой id контрола — его, и for подписи ведёт на него', () => {
		const fixture = mountHost(OwnIdHost)

		expect(input(fixture, '[so-input] input').id).toBe('email')
		expect(labelOf(fixture).htmlFor).toBe('email')
	})

	it('свой id задали позже — for идёт за ним', () => {
		const fixture = mountHost(ShownHost)

		fixture.componentInstance.input.id = 'email'
		fixture.detectChanges()

		expect(input(fixture, '[so-input] input').id).toBe('email')
		expect(labelOf(fixture).htmlFor).toBe('email')
	})

	it('контрол сняли — его id от поля снят, for — снова на id поля', () => {
		const fixture = mountHost(ShownHost)
		const id = input(fixture, '[so-input] input').id

		fixture.componentInstance.shown.set(false)
		fixture.detectChanges()

		expect(fixture.componentInstance.input.id).toBeUndefined()
		expect(labelOf(fixture).htmlFor).toBe(id)
	})
})

@Component({
	standalone: true,
	imports: [TFieldComponent, TRadioGroupComponent, TRadioGroupItemComponent],
	template: `<div so-field label="Подпись">
		<div so-radio-group aria_label="Своё">
			<label so-radio-group-item value="a">А</label>
		</div>
	</div>`,
})
class OwnNameHost {}

@Component({
	standalone: true,
	imports: [TFieldComponent, TLabelComponent, TCheckBoxComponent],
	template: `<div so-field helper="Можно отказаться в любой момент">
		<label so-label text="Согласен"><span so-check-box></span></label>
	</div>`,
})
class LabelledHost {}

/** Select без поля формы: имя из `aria_label` — его набор, и он тоже на `<input>`. */
@Component({
	standalone: true,
	imports: [TSelectComponent],
	template: `<div so-select aria_label="Город"></div>`,
})
class SelectNameHost {}

describe('Field · имя контрола', () => {
	/** Набор `aria` Select разметка кладёт на его поле: имя — у элемента под фокусом. */
	it('Select: aria_label доходит до комбобокса', () => {
		const fixture = mountHost(SelectNameHost)

		expect(input(fixture, '[so-select] input').getAttribute('aria-label')).toBe('Город')
		expect(node(fixture, '[so-select]').hasAttribute('aria-label')).toBe(false)
	})

	it('своё имя контрола-группы главнее подписи поля', () => {
		const fixture = mountHost(OwnNameHost)
		const group = node(fixture, '[so-radio-group]')

		expect(group.getAttribute('aria-label')).toBe('Своё')
		expect(group.hasAttribute('aria-labelledby')).toBe(false)
	})

	it('флажок в подписи Label внутри поля: Label называет его, поле даёт справку', () => {
		const fixture = mountHost(LabelledHost)
		const checkbox = input(fixture, '[so-check-box] input')

		expect(fixture.nativeElement.querySelector('.so-field__label')).toBeNull()
		expect(checkbox.closest('label')?.classList.contains('so-label')).toBe(true)
		expect(refsOf(checkbox, 'aria-describedby')).toEqual([
			node(fixture, '.so-field__helper').id,
		])
	})
})

@Component({
	standalone: true,
	imports: [TFieldComponent, TInputComponent, TCheckBoxComponent],
	template: `<div so-field label="Подпись" helper="Подсказка">
		<div so-input></div>
		<span so-check-box></span>
	</div>`,
})
class TwoControlsHost {}

@Component({
	standalone: true,
	imports: [TFieldComponent, TInputComponent, TCheckBoxComponent, SlotDirective],
	template: `<div so-field label="Почта" helper="Подсказка">
		<div so-input>
			<ng-template slot="trailing"><span so-check-box></span></ng-template>
		</div>
	</div>`,
})
class NestedHost {}

/**
 * Флажок взял связку раньше поля ввода; его сняли, а переключатель
 * появляется в слоте поля ввода позже.
 */
@Component({
	standalone: true,
	imports: [
		TFieldComponent,
		TInputComponent,
		TCheckBoxComponent,
		TSwitchComponent,
		SlotDirective,
	],
	template: `<div so-field label="Почта" helper="Подсказка">
		@if (first()) {
			<span so-check-box></span>
		}
		<div so-input>
			<ng-template slot="trailing">
				@if (nested()) {
					<span so-switch></span>
				}
			</ng-template>
		</div>
	</div>`,
})
class ReleasedHost {
	readonly first = signal(true)
	readonly nested = signal(false)
}

/**
 * Слоты ползунка и оценки — шаблоны, объявленные внутри контрола: DI ведёт из
 * них в слой контрола, с пустой связкой. Флажок взял связку раньше них, его
 * сняли, а переключатель появляется в подписи метки или в значке звезды позже.
 */
@Component({
	selector: 'probe-field-slider-mark',
	standalone: true,
	imports: [
		TFieldComponent,
		TCheckBoxComponent,
		TSliderComponent,
		TSwitchComponent,
		SlotDirective,
	],
	template: `<div so-field label="Подпись" helper="Подсказка">
		@if (first()) {
			<span so-check-box></span>
		}
		<span so-slider [value]="20" [marks]="marks">
			<ng-template slot="mark">
				@if (nested()) {
					<span so-switch></span>
				}
			</ng-template>
		</span>
	</div>`,
})
class SliderMarkReleasedHost {
	readonly first = signal(true)
	readonly nested = signal(false)
	readonly marks: TSliderMarks = [{ value: 50 }]
}

@Component({
	selector: 'probe-field-rating-icon',
	standalone: true,
	imports: [
		TFieldComponent,
		TCheckBoxComponent,
		TRatingComponent,
		TSwitchComponent,
		SlotDirective,
	],
	template: `<div so-field label="Подпись" helper="Подсказка">
		@if (first()) {
			<span so-check-box></span>
		}
		<span so-rating [max]="1">
			<ng-template slot="icon" let-filled="filled">
				@if (filled && nested()) {
					<span so-switch></span>
				}
			</ng-template>
		</span>
	</div>`,
})
class RatingIconReleasedHost {
	readonly first = signal(true)
	readonly nested = signal(false)
}

@Component({
	standalone: true,
	imports: [TFieldComponent, TInputComponent],
	template: `<div so-field label="Почта" helper="Подсказка">
		@if (shown()) {
			<div so-input></div>
		}
	</div>`,
})
class LaterHost {
	readonly shown = signal(false)
}

describe('Field · одно поле — один контрол', () => {
	it('второй контрол в поле связки не берёт', () => {
		const fixture = mountHost(TwoControlsHost)
		const second = input(fixture, '[so-check-box] input')

		expect(second.id).toBe('')
		expect(second.hasAttribute('aria-describedby')).toBe(false)
		expect(labelOf(fixture).htmlFor).toBe(input(fixture, '[so-input] > input').id)
	})

	/** Шаблон слота объявлен внутри поля ввода: DI ведёт из него в слой поля ввода. */
	it('контрол в слоте поля связки не берёт — её берёт само поле', () => {
		const fixture = mountHost(NestedHost)
		const field = input(fixture, '[so-input] > input')
		const nested = input(fixture, '[so-check-box] input')

		expect(labelOf(fixture).htmlFor).toBe(field.id)
		expect(refsOf(field, 'aria-describedby')).toEqual([node(fixture, '.so-field__helper').id])
		expect(nested.id).toBe('')
		expect(nested.hasAttribute('aria-describedby')).toBe(false)
	})

	/**
	 * Поле, которое связки не взяло — её взял флажок раньше него, — своему
	 * содержимому всё равно опускает пустую связку: контрол в его слоте — его
	 * содержимое. Флажок сняли, связка свободна, а переключатель, появившийся в
	 * слоте поля, её не берёт.
	 */
	it('связка освободилась — контрол в слоте другого контрола её не берёт', () => {
		const fixture = mountHost(ReleasedHost)

		fixture.componentInstance.first.set(false)
		fixture.detectChanges()
		fixture.componentInstance.nested.set(true)
		fixture.detectChanges()

		const nested = input(fixture, '[so-switch] input')

		expect(nested.id).toBe('')
		expect(nested.hasAttribute('aria-describedby')).toBe(false)
	})

	/**
	 * Слоты ползунка и оценки разворачиваются под их слоем лифта, с пустой
	 * связкой: контрол в подписи метки или в значке звезды — их содержимое, а не
	 * контрол поля.
	 */
	it.each([
		['Slider, слот mark', SliderMarkReleasedHost],
		['Rating, слот icon', RatingIconReleasedHost],
	])('%s: связка освободилась — контрол в слоте её не берёт', (_name, host) => {
		const fixture = mountHost(host)

		fixture.componentInstance.first.set(false)
		fixture.detectChanges()
		fixture.componentInstance.nested.set(true)
		fixture.detectChanges()

		const nested = input(fixture, '[so-switch] input')

		expect(nested.id).toBe('')
		expect(nested.hasAttribute('aria-describedby')).toBe(false)
	})

	it('контрол появился позже — связку берёт он', () => {
		const fixture = mountHost(LaterHost)

		fixture.componentInstance.shown.set(true)
		fixture.detectChanges()

		const field = input(fixture, '[so-input] input')

		expect(labelOf(fixture).htmlFor).toBe(field.id)
		expect(refsOf(field, 'aria-describedby')).toEqual([node(fixture, '.so-field__helper').id])
	})
})
