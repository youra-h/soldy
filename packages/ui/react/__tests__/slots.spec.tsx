/**
 * Слоты React — props с ReactNode; scoped-слот принимает функцию.
 *
 * Первые тесты React-пакета. Раньше адаптер держался только на `tsc` и демо,
 * а без них conformance-гарантия «одна структура во всех фреймворках» на React
 * не распространялась.
 */

import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ButtonDescriptor, type TabsDescriptor } from '@soldy-ui/setup'
import { Button, type ButtonProps, type UseDomProps } from '@soldy-ui/react'

const roots: Root[] = []

function mount(props: ButtonProps = {}): HTMLElement {
	const target = document.createElement('div')

	document.body.appendChild(target)

	const reactRoot = createRoot(target)

	roots.push(reactRoot)

	act(() => {
		reactRoot.render(<Button {...props} />)
	})

	return target
}

afterEach(() => {
	// С конца — в порядке, обратном монтированию
	for (const reactRoot of roots.splice(0).reverse()) {
		act(() => reactRoot.unmount())
	}

	document.body.innerHTML = ''
})

const root = (target: HTMLElement) => target.firstElementChild as HTMLElement

describe('соответствие контракту', () => {
	it('дескриптор объявляет leading, default, trailing', () => {
		expect(
			ButtonDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		).toEqual(['default', 'leading', 'trailing'])
	})
})

describe('поведение слотов Button', () => {
	it('leading ставится перед текстом, trailing — после', () => {
		const el = root(mount({ text: 'Mid', leading: <i>L</i>, trailing: <i>T</i> }))

		expect(el.textContent?.replace(/\s+/g, '')).toBe('LMidT')
	})

	it('содержимое children переопределяет text', () => {
		const el = root(mount({ text: 'ignored', children: <b>Custom</b> }))

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Custom')
	})

	it('слот children получает scope с text', () => {
		const el = root(
			mount({
				text: 'Scoped',
				children: (scope: { text: string }) => <b>{scope.text}!</b>,
			}),
		)

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Scoped!')
	})

	it('без слота показывается text из props', () => {
		const el = root(mount({ text: 'Fallback' }))

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Fallback')
	})
})

describe('слот не ограничивает содержимое', () => {
	/**
	 * `scope` в объявлении слота — данные, которые компонент передаёт ВНУТРЬ,
	 * а не тип содержимого. Положить можно что угодно.
	 */
	it('в children можно положить целую таблицу', () => {
		const el = root(
			mount({
				text: 'ignored',
				children: (
					<table>
						<tbody>
							<tr>
								<td>ячейка</td>
							</tr>
						</tbody>
					</table>
				),
			}),
		)

		expect(el.querySelector('.s-button__text table td')?.textContent).toBe('ячейка')
		expect(el.tagName.toLowerCase()).toBe('button')
	})

	it('scope доступен и при произвольной разметке', () => {
		const el = root(
			mount({
				text: 'Заголовок',
				children: (scope: { text: string }) => (
					<ul>
						<li>{scope.text}</li>
					</ul>
				),
			}),
		)

		expect(el.querySelector('.s-button__text li')?.textContent).toBe('Заголовок')
	})
})

describe('слоты не уходят в атрибуты корня', () => {
	it('leading и trailing не становятся атрибутами', () => {
		const el = root(mount({ text: 'Mid', leading: <i>L</i>, trailing: <i>T</i> }))

		expect(el.hasAttribute('leading')).toBe(false)
		expect(el.hasAttribute('trailing')).toBe(false)
	})
})

describe('слот важнее одноимённого атрибута HTML', () => {
	/**
	 * В React слот — проп компонента, и его имя встречается с атрибутами
	 * `HTMLAttributes`. `content` там — атрибут RDFa со строкой: пересечение
	 * сузило бы слот панелей у Tabs до строки, и разметку в него было бы не
	 * передать. `UseDomProps` вычитает из атрибутов имена слотов, как и пропсов.
	 *
	 * Тип проверяет не vitest, а шаг CI «Типы — React».
	 */
	it('content по TabsDescriptor принимает ReactNode, а не строку атрибута', () => {
		expectTypeOf<UseDomProps<typeof TabsDescriptor>['content']>().toEqualTypeOf<ReactNode>()
	})
})
