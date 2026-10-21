/**
 * Rating под Angular — проводка целиком, на настоящей разметке.
 *
 * Значение, нажатие и предпросмотр считают ядро и плагины
 * (`core/__tests__/rating.spec.ts`, `plugins/__tests__/rating-hover.plugin.spec.ts`),
 * раскладку и настоящий ввод — браузер (`playground/vue/browser/rating.spec.ts`).
 * Здесь важно, что они сходятся в разметке: звезда на каждую единицу шкалы с
 * долей заливки переменной, поле с ходом, шагом, значением и тем, как оно
 * звучит, шаблон значка в обоих слоях и значение выходом. Сценарии — те же,
 * что у Vue (`rating.spec.ts`); `v-model` Vue здесь — вход `value` с выходом
 * `(soChangeValue)`.
 *
 * Своё у Angular — петля звёзд по номеру звезды (`track star.value`):
 * предпросмотр наведением меняет доли, а узлы ряда остаются теми же; `id` —
 * вход, и шаблон пишет его на поле. И такт: смену состояния шаблон применяет
 * на проверке изменений.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TRating, type TComponentSize, type TDirection, type TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import {
	LocaleProviderDirective,
	SlotDirective,
	TLabelComponent,
	TRatingComponent,
} from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Входы оценки, которые задают сценарии, кроме значения. */
type TProps = {
	readonly max?: number
	readonly step?: number
	readonly name?: string
	readonly id?: string
	readonly aria_label?: string
	readonly disabled?: boolean
	readonly readonly?: boolean
	readonly required?: boolean
	readonly direction?: TDirection
	readonly size?: TComponentSize
}

/**
 * Оценка со значением в сигнале: смена приходит выходом `(soChangeValue)` и
 * возвращается входом — как `v-model` у Vue.
 */
@Component({
	selector: 'probe-rating',
	standalone: true,
	imports: [TRatingComponent],
	template: `<span
		so-rating
		[value]="value()"
		[max]="props().max"
		[step]="props().step"
		[name]="props().name"
		[id]="props().id"
		[aria_label]="props().aria_label"
		[disabled]="props().disabled"
		[readonly]="props().readonly"
		[required]="props().required"
		[direction]="props().direction"
		[size]="props().size"
		(soChangeValue)="change($event.newValue)"
		(soCommit)="commits.push($event)"
		(soChangePreview)="previews.push($event)"
	></span>`,
})
class RatingHost {
	readonly value = signal<number | undefined>(undefined)
	readonly props = signal<TProps>({})
	readonly changes: number[] = []
	readonly commits: TValuePayload<number>[] = []
	readonly previews: (number | undefined)[] = []

	change(value: number): void {
		this.changes.push(value)
		this.value.set(value)
	}
}

@Component({
	selector: 'probe-rating-ctrl',
	standalone: true,
	imports: [TRatingComponent],
	template: `<span so-rating [ctrl]="ctrl"></span>`,
})
class CtrlHost {
	readonly ctrl = new TRating({ value: 1 })
}

@Component({
	selector: 'probe-rating-attrs',
	standalone: true,
	imports: [TRatingComponent],
	template: `<span so-rating class="mine" title="Оценка" data-probe="1"></span>`,
})
class AttrsHost {}

@Component({
	selector: 'probe-rating-icon',
	standalone: true,
	imports: [TRatingComponent, SlotDirective],
	template: `<span so-rating [max]="3">
		<ng-template slot="icon" let-value="value" let-filled="filled"
			><b class="so-test-icon">{{ value }}:{{ filled }}</b></ng-template
		>
	</span>`,
})
class IconHost {}

@Component({
	selector: 'probe-rating-scale',
	standalone: true,
	imports: [TRatingComponent],
	template: `<span so-rating [value]="value()" [step]="0.5" [max]="max()"></span>`,
})
class ScaleHost {
	readonly value = signal(3.5)
	readonly max = signal<number | undefined>(undefined)
}

@Component({
	selector: 'probe-rating-label',
	standalone: true,
	imports: [TRatingComponent, TLabelComponent],
	template: `<label so-label text="Оценка"><span so-rating [value]="3"></span></label>`,
})
class LabelHost {}

@Component({
	selector: 'probe-rating-locale',
	standalone: true,
	imports: [TRatingComponent, LocaleProviderDirective],
	template: `<div so-locale-provider [locale]="locale">
		<span so-rating [value]="3.5" [step]="0.5" required></span>
	</div>`,
})
class LocaleHost {
	readonly locale = ruRU
}

/** Узлы по селектору в разметке фикстуры. */
const all = (fixture: ComponentFixture<unknown>, selector: string): HTMLElement[] => {
	const host: HTMLElement = fixture.nativeElement

	return [...host.querySelectorAll<HTMLElement>(selector)]
}

/** Поле оценки; нет его — тест падает здесь. */
const field = (fixture: ComponentFixture<unknown>) =>
	findIn(fixture, '.so-rating__input', HTMLInputElement)

/** Корень оценки. */
const root = (fixture: ComponentFixture<unknown>) => findIn(fixture, '[so-rating]', HTMLElement)

/** Доли заливки звёзд — как их получает тема. */
const fractions = (fixture: ComponentFixture<unknown>) =>
	all(fixture, '.so-rating__star').map((star) =>
		star.style.getPropertyValue('--so-rating-fraction'),
	)

/** Клавиша на поле, как у пользователя: всплывает до корня. */
function press(fixture: ComponentFixture<unknown>, key: string): void {
	field(fixture).dispatchEvent(
		new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
	)
	fixture.detectChanges()
}

/** Дорожка — пять звёзд по 40 px: левый край — 100, правый — 300. jsdom её не меряет. */
function measure(fixture: ComponentFixture<unknown>): void {
	vi.spyOn(
		findIn(fixture, '.so-rating__track', HTMLElement),
		'getBoundingClientRect',
	).mockReturnValue(new DOMRect(100, 100, 200, 40))
}

/** Указатель мыши над точкой `x` — со звезды, всплывает до корня. */
function pointer(fixture: ComponentFixture<unknown>, type: string, x: number): void {
	findIn(fixture, '.so-rating__star', HTMLElement).dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			clientX: x,
			clientY: 120,
			pointerId: 1,
			pointerType: 'mouse',
			button: 0,
		}),
	)
	fixture.detectChanges()
}

/**
 * Оценка со значением и входами сценария. Слушатели плагинов встают по
 * `ready` — кадром позже.
 */
async function render(
	initial: number | undefined,
	props: TProps = {},
): Promise<ComponentFixture<RatingHost>> {
	const fixture = TestBed.createComponent(RatingHost)

	fixture.componentInstance.value.set(initial)
	fixture.componentInstance.props.set(props)
	fixture.detectChanges()
	await nextFrame()

	return fixture
}

describe('разметка', () => {
	it('корень — span с классами, состояниями и направлением; внутри — span, поле и значки', async () => {
		const fixture = await render(undefined, { direction: 'rtl', size: 'lg', readonly: true })
		const node = root(fixture)

		expect(node.localName).toBe('span')
		expect(node.classList.contains('so-rating--size-lg')).toBe(true)
		expect(node.classList.contains('so-rating--readonly')).toBe(true)
		expect(node.dataset['disabled']).toBe('false')
		expect(node.getAttribute('dir')).toBe('rtl')
		// Набор ARIA — полю, не корню
		expect(node.hasAttribute('aria-readonly')).toBe(false)
		expect(
			all(fixture, '.so-rating *').filter(
				(child) => !['span', 'input', 'svg', 'path'].includes(child.localName),
			),
		).toEqual([])
	})

	it('части — прямыми детьми: дорожка у корня, звёзды и ручка у дорожки, поле у ручки', async () => {
		const fixture = await render(2)
		const track = find(root(fixture), ':scope > .so-rating__track', HTMLElement)

		expect([...track.children].map((node) => node.className)).toEqual([
			'so-rating__star',
			'so-rating__star',
			'so-rating__star',
			'so-rating__star',
			'so-rating__star',
			'so-rating__thumb',
		])
		expect(field(fixture).parentElement?.className).toBe('so-rating__thumb')
	})

	it('звезда на каждую единицу шкалы — под aria-hidden, с долей заливки', () => {
		const fixture = mountHost(ScaleHost)

		expect(
			all(fixture, '.so-rating__star').map((star) => star.getAttribute('aria-hidden')),
		).toEqual(['true', 'true', 'true', 'true', 'true'])
		expect(fractions(fixture)).toEqual(['1', '1', '1', '0.5', '0'])

		fixture.componentInstance.max.set(7)
		fixture.detectChanges()

		expect(fractions(fixture)).toEqual(['1', '1', '1', '0.5', '0', '0', '0'])
	})

	it('значок по умолчанию — svg роли star в обоих слоях звезды', async () => {
		const fixture = await render(undefined)
		const star = findIn(fixture, '.so-rating__star', HTMLElement)
		const layers = [star, findIn(fixture, '.so-rating__star-fill', HTMLElement)].map((layer) =>
			[...layer.children].find((node) => node.localName === 'svg'),
		)

		expect(layers.map((icon) => icon?.getAttribute('class'))).toEqual([
			'so-rating__icon',
			'so-rating__icon',
		])
		expect(layers.every((icon) => icon?.getAttribute('viewBox'))).toBe(true)
		expect(all(fixture, '.so-rating svg')).toHaveLength(10)
	})

	it('поле: ход, шаг, значение, name, id, disabled и то, как звучит значение', async () => {
		const fixture = await render(4, { max: 10, step: 0.5, name: 'score', id: 'score' })
		const input = field(fixture)

		expect(input.type).toBe('range')
		expect([input.min, input.max, input.step, input.value]).toEqual(['0', '10', '0.5', '4'])
		expect([input.name, input.id]).toEqual(['score', 'score'])
		expect(input.getAttribute('aria-valuetext')).toBe('4 of 10')
		expect(input.parentElement?.className).toBe('so-rating__thumb')
		// `id` — вход оценки, а не атрибут корня: на корне его нет
		expect(root(fixture).hasAttribute('id')).toBe(false)
	})

	it('имя — из aria_label; выключенная — нативный disabled, без ARIA-дублей', async () => {
		const fixture = await render(undefined, { aria_label: 'Оценка', disabled: true })

		expect(field(fixture).getAttribute('aria-label')).toBe('Оценка')
		expect(field(fixture).disabled).toBe(true)
		expect(field(fixture).hasAttribute('aria-disabled')).toBe(false)
		expect(root(fixture).dataset['disabled']).toBe('true')
	})

	it('только для показа — aria-readonly у поля: readonly HTML у range не знает', async () => {
		const fixture = await render(undefined, { readonly: true })

		expect(field(fixture).getAttribute('aria-readonly')).toBe('true')
		expect(field(fixture).hasAttribute('readonly')).toBe(false)

		fixture.componentInstance.props.set({ readonly: false })
		fixture.detectChanges()

		expect(field(fixture).hasAttribute('aria-readonly')).toBe(false)
	})

	it('атрибуты потребителя — корню: указатель поле не ловит', () => {
		const fixture = mountHost(AttrsHost)

		expect(root(fixture).classList.contains('mine')).toBe(true)
		expect(root(fixture).classList.contains('so-rating')).toBe(true)
		expect(root(fixture).title).toBe('Оценка')
		expect(root(fixture).dataset['probe']).toBe('1')
		expect(field(fixture).hasAttribute('title')).toBe(false)
	})
})

describe('слот icon', () => {
	it('рисуется в обоих слоях звезды: scope — номер звезды и залитый ли слой', () => {
		const fixture = mountHost(IconHost)
		const icons = all(fixture, '.so-test-icon')

		expect(icons.map((node) => node.textContent)).toEqual([
			'1:false',
			'1:true',
			'2:false',
			'2:true',
			'3:false',
			'3:true',
		])
		expect(icons.map((node) => node.parentElement?.className)).toEqual([
			'so-rating__star',
			'so-rating__star-fill',
			'so-rating__star',
			'so-rating__star-fill',
			'so-rating__star',
			'so-rating__star-fill',
		])
		expect(all(fixture, '.so-rating svg')).toEqual([])
	})
})

describe('значение и commit', () => {
	it('клавиша — шаг, значение возвращается входом, звёзды и поле — за ним', async () => {
		const fixture = await render(2)

		press(fixture, 'ArrowRight')

		expect(fixture.componentInstance.changes).toEqual([3])
		expect(field(fixture).value).toBe('3')
		expect(fractions(fixture)).toEqual(['1', '1', '1', '0', '0'])
		expect(field(fixture).getAttribute('aria-valuetext')).toBe('3 of 5')
	})

	it('commit — выходом компонента', async () => {
		const fixture = await render(2)

		press(fixture, 'End')

		expect(fixture.componentInstance.commits).toEqual([{ newValue: 5, oldValue: 2 }])
	})

	it('ctrl: значение снаружи и из разметки — одно', async () => {
		const fixture = mountHost(CtrlHost)

		await nextFrame()

		fixture.componentInstance.ctrl.value = 4
		fixture.detectChanges()

		expect(field(fixture).value).toBe('4')
		expect(fractions(fixture)).toEqual(['1', '1', '1', '1', '0'])
	})

	/**
	 * Значение поля браузер прижимает к ходу: записанное раньше нового `max`,
	 * оно встало бы на прежний край. Поэтому значение пишет директива текста
	 * поля — после хода.
	 */
	it('шкала и значение сменились разом — значение поля по новой шкале', () => {
		const fixture = mountHost(ScaleHost)

		fixture.componentInstance.max.set(10)
		fixture.componentInstance.value.set(8)
		fixture.detectChanges()

		expect([field(fixture).max, field(fixture).value]).toEqual(['10', '8'])
	})
})

/**
 * `required` у range браузер не знает — у ползунка значение есть всегда, —
 * и ошибку полю ставит плагин обязательности. Узел он получает кадром, как
 * все плагины, поэтому ошибка есть после `ready`. Отправку формы проверяет
 * браузер (`playground/vue/browser/rating.spec.ts`).
 */
describe('обязательность', () => {
	it('обязательная оценка с 0 — поле неверно; поставили оценку — верно', async () => {
		const fixture = await render(undefined, { required: true })

		expect(field(fixture).validity.customError).toBe(true)
		expect(field(fixture).validationMessage).toBe('Please select a rating')
		// Атрибутов, которых у range нет, разметка не ставит
		expect(field(fixture).hasAttribute('required')).toBe(false)
		expect(field(fixture).hasAttribute('aria-required')).toBe(false)

		press(fixture, 'ArrowRight')

		expect(field(fixture).validity.customError).toBe(false)
	})

	it('ошибка — на языке поддерева', async () => {
		const fixture = mountHost(LocaleHost)

		await nextFrame()

		// Оценка 3,5 — ошибки нет; снятая клавишей Home до 0 — есть, по-русски
		press(fixture, 'Home')

		expect(field(fixture).validationMessage).toBe('Поставьте оценку')
	})
})

describe('указатель', () => {
	it('нажатие на левую половину звезды при шаге 0,5 — половина', async () => {
		const fixture = await render(undefined, { step: 0.5 })

		measure(fixture)
		pointer(fixture, 'pointerdown', 185)
		pointer(fixture, 'pointerup', 185)

		expect(fixture.componentInstance.changes).toEqual([2.5])
		expect(fractions(fixture)).toEqual(['1', '1', '0.5', '0', '0'])
	})

	it('наведение — звёзды показывают предпросмотр, ушёл указатель — значение', async () => {
		const fixture = await render(1)

		measure(fixture)
		pointer(fixture, 'pointermove', 250)

		expect(fractions(fixture)).toEqual(['1', '1', '1', '1', '0'])
		expect(fixture.componentInstance.previews).toEqual([4])
		expect(fixture.componentInstance.changes).toEqual([])

		root(fixture).dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
		fixture.detectChanges()

		expect(fractions(fixture)).toEqual(['1', '0', '0', '0', '0'])
	})

	/**
	 * Выход `stars` — новые записи на каждую смену, и петля по ссылке
	 * пересоздавала бы ряд на каждое движение указателя вместе со значками.
	 */
	it('предпросмотр не пересоздаёт звёзды и их значки', async () => {
		const fixture = await render(1)

		const stars = all(fixture, '.so-rating__star')
		const icons = all(fixture, '.so-rating__icon')

		measure(fixture)
		pointer(fixture, 'pointermove', 250)

		expect(fractions(fixture)).toEqual(['1', '1', '1', '1', '0'])
		expect(all(fixture, '.so-rating__star')).toEqual(stars)
		expect(all(fixture, '.so-rating__icon')).toEqual(icons)
	})
})

describe('в окружении', () => {
	it('подпись Label связана с полем', () => {
		const fixture = mountHost(LabelHost)

		expect(findIn(fixture, 'label', HTMLLabelElement).control).toBe(field(fixture))
	})

	it('значение звучит на языке поддерева', () => {
		const fixture = mountHost(LocaleHost)

		expect(field(fixture).getAttribute('aria-valuetext')).toBe('3,5 из 5')
	})
})
