/**
 * `<span is="so-rating">` — проводка целиком, на настоящей разметке.
 *
 * Значение, нажатие и предпросмотр считают ядро и плагины
 * (`core/__tests__/rating.spec.ts`, `plugins/__tests__/rating-hover.plugin.spec.ts`),
 * раскладку и настоящий ввод — браузер (`playground/vue/browser/rating.spec.ts`).
 * Сценарии — те же, что у Vue (`rating.spec.ts`), и сверх них: предпросмотр не
 * пересоздаёт звёзды — петля по номеру звезды, — а `id` — проп поля: стоит на
 * поле, а не на корне.
 *
 * Угол зрения здесь свой. Корень — элемент потребителя, и атрибуты разметки
 * остаются на нём, как у Vue: указатель поле не ловит. Слот со scope (`icon`) —
 * образец: копию получает каждый слой каждой звезды, а данные копия берёт по
 * месту своей звезды.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TRating, type TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { RatingDescriptor } from '@soldy-ui/setup'
import {
	TLabelElement,
	TLocaleProviderElement,
	TRatingElement,
	type TLabelElementProps,
	type TRatingElementProps,
} from '@soldy-ui/webc'
import { ratingTemplate } from '../src/components/rating/rating.template'
import { bareContext } from './template-context'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	vi.restoreAllMocks()
	document.body.innerHTML = ''
})

function isRating(node: Element | null): node is TRatingElementProps {
	return node instanceof TRatingElement
}

function isLabel(node: Element | null): node is TLabelElementProps {
	return node instanceof TLabelElement
}

/** Оценка soldy в разметке. */
function ratingOf(root: ParentNode): TRatingElementProps {
	const node = root.querySelector('[is="so-rating"]')

	if (!isRating(node)) throw new Error('<span is="so-rating"> нет')

	return node
}

/** Разметка в документе; слушатели плагинов — кадром позже. */
async function mount(html: string): Promise<HTMLElement> {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)
	await nextFrame()

	return host
}

/** Оценка из разметки в документе. */
async function mountRating(html: string): Promise<TRatingElementProps> {
	return ratingOf(await mount(html))
}

/** Разметка под провайдером русской локали в документе; слушатели плагинов — кадром позже. */
async function mountRu(html: string): Promise<void> {
	const provider = new TLocaleProviderElement()

	provider.locale = ruRU
	provider.innerHTML = html
	document.body.appendChild(provider)
	await nextFrame()
}

/** Оценка над готовым инстансом: `ctrl` выставлен до подключения. */
async function mountCtrl(ctrl: TRating): Promise<TRatingElementProps> {
	const node = document.createElement('span', { is: 'so-rating' })

	if (!isRating(node)) throw new Error('<span is="so-rating"> нет')

	node.ctrl = ctrl
	document.body.appendChild(node)
	await nextFrame()

	return node
}

const all = (selector: string, root: ParentNode = document) =>
	[...root.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

const field = () => find(document, '.so-rating__input', HTMLInputElement)

/** Доли заливки звёзд — как их получает тема. */
const fractions = () =>
	all('.so-rating__star').map((star) => star.style.getPropertyValue('--so-rating-fraction'))

/** Клавиша на поле, как у пользователя: всплывает до корня. */
async function press(key: string): Promise<void> {
	field().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	await flush()
}

/** Дорожка — пять звёзд по 40 px: левый край — 100, правый — 300. jsdom её не меряет. */
function measure(): void {
	vi.spyOn(
		find(document, '.so-rating__track', HTMLElement),
		'getBoundingClientRect',
	).mockReturnValue(new DOMRect(100, 100, 200, 40))
}

/** Указатель мыши над точкой `x` — со звезды, всплывает до корня. */
async function pointer(type: string, x: number): Promise<void> {
	find(document, '.so-rating__star', HTMLElement).dispatchEvent(
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
	await flush()
}

/** Значения `detail` событий с этим именем на элементе. */
function collect(el: Element, name: string): unknown[] {
	const seen: unknown[] = []

	el.addEventListener(name, (event) => {
		if (event instanceof CustomEvent) seen.push(event.detail)
	})

	return seen
}

/** Новое значение из пары события — вид проверяется здесь, а не берётся на веру. */
function newValueOf(detail: unknown): unknown {
	if (typeof detail !== 'object' || detail === null || !('newValue' in detail)) {
		throw new Error('у события нет пары значений')
	}

	return detail.newValue
}

describe('разметка', () => {
	it('корень — span с классами, состояниями и направлением; внутри — span, поле и значки', async () => {
		const root = await mountRating(
			'<span is="so-rating" direction="rtl" size="lg" readonly></span>',
		)

		expect(root).toBeInstanceOf(HTMLSpanElement)
		expect(root.classList.contains('so-rating')).toBe(true)
		expect(root.classList.contains('so-rating--size-lg')).toBe(true)
		expect(root.classList.contains('so-rating--readonly')).toBe(true)
		expect(root.dataset.disabled).toBe('false')
		expect(root.getAttribute('dir')).toBe('rtl')
		// Набор ARIA — полю, не корню
		expect(root.hasAttribute('aria-readonly')).toBe(false)
		// Внутри — span, поле и значки; что внутри значка, решает пакет иконок
		expect(
			all('.so-rating *').filter(
				(node) =>
					!['span', 'input', 'svg'].includes(node.localName) && !node.closest('svg'),
			),
		).toEqual([])
	})

	it('тег у ядра — тег элемента: span', async () => {
		const ctrl = new TRating()

		await mountCtrl(ctrl)

		expect(ctrl.tag).toBe('span')
	})

	it('части — прямыми детьми: дорожка у корня, звёзды и ручка у дорожки, поле у ручки', async () => {
		const root = await mountRating('<span is="so-rating" max="3"></span>')
		const track = find(root, ':scope > .so-rating__track', HTMLElement)

		expect([...track.children].map((node) => node.className)).toEqual([
			'so-rating__star',
			'so-rating__star',
			'so-rating__star',
			'so-rating__thumb',
		])
		expect(find(track, ':scope > .so-rating__thumb', HTMLElement).firstElementChild).toBe(
			field(),
		)
	})

	it('звезда на каждую единицу шкалы — под aria-hidden, с долей заливки', async () => {
		const root = await mountRating('<span is="so-rating" value="3.5" step="0.5"></span>')

		expect(all('.so-rating__star').map((star) => star.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
			'true',
			'true',
			'true',
		])
		expect(fractions()).toEqual(['1', '1', '1', '0.5', '0'])

		root.max = 7
		await flush()

		expect(fractions()).toEqual(['1', '1', '1', '0.5', '0', '0', '0'])
	})

	it('значок по умолчанию — svg роли star в обоих слоях звезды', async () => {
		await mountRating('<span is="so-rating"></span>')

		const star = find(document, '.so-rating__star', HTMLElement)
		const layers = [star, find(star, '.so-rating__star-fill', HTMLElement)].map((layer) =>
			[...layer.children].find((node) => node.localName === 'svg')?.getAttribute('class'),
		)

		expect(layers).toEqual(['so-rating__icon', 'so-rating__icon'])
		expect(document.querySelectorAll('.so-rating svg')).toHaveLength(10)
	})

	it('поле: ход, шаг, значение, name, id, disabled и то, как звучит значение', async () => {
		await mountRating(
			'<span is="so-rating" value="4" max="10" step="0.5" name="score" id="score"></span>',
		)

		const input = field()

		expect(input.type).toBe('range')
		expect([input.min, input.max, input.step, input.value]).toEqual(['0', '10', '0.5', '4'])
		expect([input.name, input.id]).toEqual(['score', 'score'])
		expect(input.getAttribute('aria-valuetext')).toBe('4 of 10')
		expect(input.parentElement?.className).toBe('so-rating__thumb')
	})

	it('имя — из aria_label; выключенная — нативный disabled, без ARIA-дублей', async () => {
		const root = await mountRating('<span is="so-rating" aria_label="Оценка" disabled></span>')

		expect(field().getAttribute('aria-label')).toBe('Оценка')
		expect(field().disabled).toBe(true)
		expect(field().hasAttribute('aria-disabled')).toBe(false)
		expect(root.dataset.disabled).toBe('true')
	})

	it('только для показа — aria-readonly у поля: readonly HTML у range не знает', async () => {
		const root = await mountRating('<span is="so-rating" readonly></span>')

		expect(field().getAttribute('aria-readonly')).toBe('true')
		expect(field().hasAttribute('readonly')).toBe(false)

		root.removeAttribute('readonly')
		await flush()

		expect(field().hasAttribute('aria-readonly')).toBe(false)
	})

	/**
	 * Атрибуты разметки остаются на корне, как у Vue: указатель поле не ловит, и
	 * обработчик потребителя на поле не сработал бы никогда.
	 */
	it('атрибуты потребителя — корню, а не полю', async () => {
		const root = await mountRating(
			'<span is="so-rating" class="mine" title="Оценка" data-probe="1"></span>',
		)

		expect(root.classList.contains('mine')).toBe(true)
		expect(root.title).toBe('Оценка')
		expect(root.dataset.probe).toBe('1')
		expect(field().hasAttribute('title')).toBe(false)
		expect(field().hasAttribute('data-probe')).toBe(false)
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор, — образцом', () => {
		const root = document.createElement('span')
		const targets = ratingTemplate.create(root, bareContext(root)).slots

		expect(Object.keys(targets)).toEqual(RatingDescriptor().slots.map((slot) => slot.name))
		expect(Object.values(targets).map((target) => target.mode)).toEqual(['sample'])
	})
})

/**
 * `id` — проп поля, хотя атрибуты разметки остаются корню: два узла с одним
 * `id` сломали бы `<label for>`, и он нашёл бы корень, а тот подпись не
 * принимает. Атрибут разметки база берёт пропом первой сборки и снимает с
 * корня; из кода — `ctrl.id`, а `el.id` — собственный `id` корня.
 */
describe('id — только на поле', () => {
	it('id разметки — на поле, с корня снят', async () => {
		const root = await mountRating('<span is="so-rating" id="score"></span>')

		expect(field().id).toBe('score')
		expect(root.hasAttribute('id')).toBe(false)
		expect(root.ctrl?.id).toBe('score')
	})

	it('ctrl.id из кода — на поле, el.id — у корня и до поля не доходит', async () => {
		const root = await mountRating('<span is="so-rating"></span>')

		expect(field().hasAttribute('id')).toBe(false)

		if (root.ctrl) root.ctrl.id = 'score'
		root.id = 'own'
		await flush()

		expect(field().id).toBe('score')
		expect(root.id).toBe('own')
	})

	it('подпись for находит поле, а не корень', async () => {
		await mount('<label for="score">Оценка</label><span is="so-rating" id="score"></span>')

		const label = find(document, 'label', HTMLLabelElement)

		expect(label.control).toBe(field())
	})
})

describe('образец icon', () => {
	it('копия — в каждый слой каждой звезды, своих значков нет', async () => {
		await mountRating(`<span is="so-rating" max="3">
			<template slot="icon"><b class="probe">★</b></template>
		</span>`)

		const probes = all('.probe')

		expect(probes.map((node) => node.parentElement?.className)).toEqual([
			'so-rating__star',
			'so-rating__star-fill',
			'so-rating__star',
			'so-rating__star-fill',
			'so-rating__star',
			'so-rating__star-fill',
		])
		expect(document.querySelectorAll('.so-rating svg')).toHaveLength(0)
	})

	/** Данные копия берёт по месту: номер — место её звезды, слой — внутри ли она заливки. */
	it('данные копии — по месту: номер звезды и слой', async () => {
		await mountRating(`<span is="so-rating" max="2">
			<template slot="icon"><b class="probe"></b></template>
		</span>`)

		const stars = all('.so-rating__star')
		const scope = all('.probe').map((probe) => {
			const star = probe.closest('.so-rating__star')
			const value = star instanceof HTMLElement ? stars.indexOf(star) + 1 : 0

			return [value, probe.closest('.so-rating__star-fill') !== null]
		})

		expect(scope).toEqual([
			[1, false],
			[1, true],
			[2, false],
			[2, true],
		])
	})

	it('пустой образец — как не заданный: значки роли star', async () => {
		await mountRating(`<span is="so-rating" max="2">
			<template slot="icon"></template>
		</span>`)

		expect(document.querySelectorAll('.so-rating svg.so-rating__icon')).toHaveLength(4)
	})
})

describe('значение и commit', () => {
	it('клавиша — шаг, so:change:value, звёзды и поле — за ним', async () => {
		const root = await mountRating('<span is="so-rating" value="2"></span>')
		const changes = collect(root, 'so:change:value')

		await press('ArrowRight')

		expect(changes.map(newValueOf)).toEqual([3])
		expect(field().value).toBe('3')
		expect(fractions()).toEqual(['1', '1', '1', '0', '0'])
		expect(field().getAttribute('aria-valuetext')).toBe('3 of 5')
	})

	it('commit — событием элемента', async () => {
		const root = await mountRating('<span is="so-rating" value="2"></span>')
		const commits = collect(root, 'so:commit')

		await press('End')

		const expected: TValuePayload<number> = { newValue: 5, oldValue: 2 }

		expect(commits).toEqual([expected])
	})

	it('ctrl: значение снаружи и из разметки — одно', async () => {
		const ctrl = new TRating({ value: 1 })

		await mountCtrl(ctrl)

		ctrl.value = 4
		await flush()

		expect(field().value).toBe('4')
		expect(fractions()).toEqual(['1', '1', '1', '1', '0'])
	})

	/** Ход пишется раньше значения: значение за прежним краем браузер прижал бы. */
	it('число звёзд и значение сменились разом — значение поля по новому ходу', async () => {
		const root = await mountRating('<span is="so-rating" value="2"></span>')

		root.max = 10
		root.value = 8
		await flush()

		expect(field().max).toBe('10')
		expect(field().value).toBe('8')
	})
})

/**
 * `required` у range браузер не знает — у ползунка значение есть всегда, —
 * и ошибку полю ставит плагин обязательности. Узел он получает кадром, как
 * все плагины, поэтому ошибка есть после `ready`. Отправку формы проверяет
 * браузер.
 */
describe('обязательность', () => {
	it('обязательная оценка с 0 — поле неверно; поставили оценку — верно', async () => {
		await mountRating('<span is="so-rating" required></span>')

		expect(field().validity.customError).toBe(true)
		expect(field().validationMessage).toBe('Please select a rating')
		// Атрибутов, которых у range нет, разметка не ставит
		expect(field().hasAttribute('required')).toBe(false)
		expect(field().hasAttribute('aria-required')).toBe(false)

		await press('ArrowRight')

		expect(field().validity.customError).toBe(false)
	})

	it('ошибка — на языке поддерева', async () => {
		await mountRu('<span is="so-rating" required></span>')

		expect(field().validationMessage).toBe('Поставьте оценку')
	})
})

describe('указатель', () => {
	it('нажатие на левую половину звезды при шаге 0,5 — половина', async () => {
		const root = await mountRating('<span is="so-rating" step="0.5"></span>')
		const changes = collect(root, 'so:change:value')

		measure()
		await pointer('pointerdown', 185)
		await pointer('pointerup', 185)

		expect(changes.map(newValueOf)).toEqual([2.5])
		expect(fractions()).toEqual(['1', '1', '0.5', '0', '0'])
	})

	it('наведение — звёзды показывают предпросмотр, ушёл указатель — значение', async () => {
		const root = await mountRating('<span is="so-rating" value="1"></span>')
		const previews = collect(root, 'so:change:preview')
		const changes = collect(root, 'so:change:value')

		measure()
		await pointer('pointermove', 250)

		expect(fractions()).toEqual(['1', '1', '1', '1', '0'])
		expect(previews).toEqual([4])
		expect(changes).toEqual([])

		root.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
		await flush()

		expect(fractions()).toEqual(['1', '0', '0', '0', '0'])
	})

	/**
	 * Выход `stars` — новые записи на каждую смену, а петля идёт по номеру
	 * звезды: предпросмотр наведением не пересоздаёт узлы ряда.
	 */
	it('предпросмотр не пересоздаёт звёзды', async () => {
		await mountRating('<span is="so-rating" value="1"></span>')

		const stars = all('.so-rating__star')

		measure()
		await pointer('pointermove', 250)

		expect(all('.so-rating__star')).toEqual(stars)
	})
})

describe('в окружении', () => {
	it('подпись Label связана с полем', async () => {
		const host = await mount(
			'<label is="so-label" text="Оценка"><span is="so-rating" value="3"></span></label>',
		)
		const label = host.querySelector('[is="so-label"]')

		if (!isLabel(label)) throw new Error('<label is="so-label"> нет')

		expect(label.control).toBe(field())
	})

	it('значение звучит на языке поддерева', async () => {
		await mountRu('<span is="so-rating" value="3.5" step="0.5"></span>')

		expect(field().getAttribute('aria-valuetext')).toBe('3,5 из 5')
	})
})
