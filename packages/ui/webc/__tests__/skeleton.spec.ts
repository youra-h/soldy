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

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

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
		const targets = skeletonTemplate.create(document.createElement('div'))

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
