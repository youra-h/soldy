/**
 * `<div is="so-skeleton">` — заглушка поверх содержимого.
 *
 * Корень есть всегда — в нём лежит содержимое, — а `rendered` и `visible`
 * решают только, показана ли заглушка. Корень поэтому видимостью не прячется
 * (`hides: false` в описании корня): `display: none` спрятал бы и содержимое.
 *
 * `variant` — проп, а не атрибут, который ставит база (тот же сценарий, что у
 * Vue, `skeleton-variant.spec.ts`, и React). Значения — условные имена из
 * фикстуры темы (`__tests__/theme.d.ts`), не имена oren.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { SkeletonDescriptor } from '@soldy-ui/setup'
import { TSkeletonElement, type TSkeletonElementProps } from '@soldy-ui/webc'
import { skeletonTemplate } from '../src/components/skeleton/skeleton.template'
import { bareContext } from './template-context'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Что `TElementPlugin` элемента сообщил о своём узле, по порядку: узел из
 * `so:element:ready` и `'removed'`. События элементов внутри, всплывшие до
 * него, — не его.
 */
function elementEvents(el: Element): (Element | 'removed')[] {
	const events: (Element | 'removed')[] = []

	el.addEventListener('so:element:ready', (event) => {
		if (
			event.target === el &&
			event instanceof CustomEvent &&
			event.detail instanceof Element
		) {
			events.push(event.detail)
		}
	})
	el.addEventListener('so:element:removed', (event) => {
		if (event.target === el) events.push('removed')
	})

	return events
}

const variantClasses = (el: HTMLElement) =>
	[...el.classList].filter((name) => name.includes('--variant-'))

/** Заглушка корня, если она в нём есть. */
const placeholder = (el: HTMLElement) => el.querySelector(':scope > .so-skeleton__placeholder')

function isSkeleton(node: Element | null): node is TSkeletonElementProps {
	return node instanceof TSkeletonElement
}

/** Заглушка из разметки; узел другой — тест падает здесь. */
function mount(html: string): TSkeletonElementProps {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const node = host.querySelector('[is="so-skeleton"]')

	if (!isSkeleton(node)) throw new Error('<div is="so-skeleton"> нет')

	return node
}

/** Заглушка из JS, ещё не подключённая: свойства до подключения уходят в сборку. */
function create(): TSkeletonElementProps {
	const node = document.createElement('div', { is: 'so-skeleton' })

	if (!isSkeleton(node)) throw new Error('<div is="so-skeleton"> нет')

	return node
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('Skeleton · variant', () => {
	it('доходит до инстанса: у корня класс варианта, атрибута variant база не ставит', () => {
		const el = create()

		el.variant = 'brand'
		document.body.appendChild(el)

		expect(variantClasses(el)).toEqual(['so-skeleton--variant-brand'])
		expect(el.hasAttribute('variant')).toBe(false)
	})

	it('смена пропа меняет класс', async () => {
		const el = mount('<div is="so-skeleton" variant="brand"></div>')

		el.variant = 'danger'
		await flush()

		expect(variantClasses(el)).toEqual(['so-skeleton--variant-danger'])
	})
})

describe('Skeleton · заглушка и содержимое', () => {
	it('показанная заглушка — перед содержимым, скрыта от скринридера', () => {
		const el = mount('<div is="so-skeleton"><b>Данные</b></div>')

		expect([...el.children].map((child) => child.localName)).toEqual(['div', 'b'])
		expect(el.firstElementChild?.className).toBe('so-skeleton__placeholder')
		expect(el.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
		// Пока заглушка показана, область занята
		expect(el.getAttribute('aria-busy')).toBe('true')
	})

	it('visible=false: заглушки нет, содержимое на месте, корень не скрыт', () => {
		const el = create()

		el.innerHTML = '<b>Данные</b>'
		el.visible = false
		document.body.appendChild(el)

		expect(placeholder(el)).toBeNull()
		expect(el.querySelector('b')?.textContent).toBe('Данные')
		expect(el.style.display).toBe('')
		expect(el.hasAttribute('aria-busy')).toBe(false)
	})

	it('rendered=false: то же — корень остаётся с содержимым', () => {
		const el = create()

		el.innerHTML = '<b>Данные</b>'
		el.rendered = false
		document.body.appendChild(el)

		expect(placeholder(el)).toBeNull()
		expect(el.querySelector('b')?.textContent).toBe('Данные')
		expect(el.style.display).toBe('')
	})

	/**
	 * Корня Skeleton `rendered` не снимает: у Vue `v-if` на нём не стоит. Узел у
	 * плагинов остаётся тем же — `so:element:removed` не приходит, — и у
	 * элемента в содержимом тоже: поддерево на виду.
	 */
	it('rendered=false: узел корня и элемента в содержимом у плагинов остаётся', async () => {
		const el = mount('<div is="so-skeleton"><button is="so-button"></button></div>')
		const button = el.querySelector('button')

		if (!button) throw new Error('кнопки нет')

		const own = elementEvents(el)
		const inner = elementEvents(button)

		await nextFrame()

		expect(own).toEqual([el])
		expect(inner).toEqual([button])

		el.rendered = false
		await flush()
		await nextFrame()

		expect(placeholder(el)).toBeNull()
		expect(own).toEqual([el])
		expect(inner).toEqual([button])
	})

	/**
	 * `rendered` Skeleton снимает одну заглушку, а не поддерево: у Vue его
	 * корень `v-if` не носит, и слои в содержимом остаются на виду.
	 */
	it('rendered=false: открытая панель поповера в содержимом остаётся на виду', async () => {
		const el = mount(`<div is="so-skeleton">
			<span is="so-popover" open><button class="so-test-inside">В поповере</button></span>
		</div>`)
		const panel = document.querySelector('.so-popover__panel')

		if (!(panel instanceof HTMLElement)) throw new Error('панели поповера нет')

		expect(panel.parentElement).toBe(document.body)
		expect(panel.style.display).toBe('')

		el.rendered = false
		await flush()

		expect(placeholder(el)).toBeNull()
		expect(panel.parentElement).toBe(document.body)
		expect(panel.style.display).toBe('')
	})

	it('заглушка уходит и возвращается со сменой visible, содержимое — тот же узел', async () => {
		const el = mount('<div is="so-skeleton"><b>Данные</b></div>')
		const content = el.querySelector('b')
		const shown = placeholder(el)

		el.visible = false
		await flush()

		expect(placeholder(el)).toBeNull()
		expect(el.style.display).toBe('')

		el.visible = true
		await flush()

		// Тот же узел заглушки — снова первым
		expect(placeholder(el)).toBe(shown)
		expect(el.firstElementChild).toBe(shown)
		expect(el.querySelector('b')).toBe(content)
	})

	it('перестановка в DOM заглушку не дублирует', async () => {
		const el = mount('<div is="so-skeleton"><b>Данные</b></div>')

		document.body.appendChild(document.createElement('section')).appendChild(el)
		await flush()

		expect([...el.children].map((child) => child.localName)).toEqual(['div', 'b'])
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const root = document.createElement('div')
		const targets = skeletonTemplate.create(root, () => false, bareContext(root)).slots

		expect(Object.keys(targets).sort()).toEqual(
			SkeletonDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

describe('Skeleton · размер', () => {
	it('width и height — стилем корня', () => {
		const el = mount('<div is="so-skeleton" width="120" height="1em"></div>')

		expect(el.style.width).toBe('120px')
		expect(el.style.height).toBe('1em')
	})

	it('смена размера — новым стилем корня', async () => {
		const el = mount('<div is="so-skeleton" width="120"></div>')

		el.width = '50%'
		await flush()

		expect(el.style.width).toBe('50%')
	})
})
