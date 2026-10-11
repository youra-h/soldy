/**
 * Слоты Solid — props с JSX; scoped-слот принимает функцию.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { createSignal, type JSX } from 'solid-js'
import {
	ButtonDescriptor,
	type CheckBoxDescriptor,
	type DialogDescriptor,
	type InputDescriptor,
	type TabsDescriptor,
} from '@soldy-ui/setup'
import { TButton } from '@soldy-ui/core'
import { Button, type ButtonProps, type FrameProps, type UseDomProps } from '@soldy-ui/solid'
import { mount } from './mount'

/** Корень кнопки с пропсами `props`. */
const button = (props: ButtonProps) => mount(() => <Button {...props} />).root()

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
		const el = button({ text: 'Mid', leading: <i>L</i>, trailing: <i>T</i> })

		expect(el.textContent?.replace(/\s+/g, '')).toBe('LMidT')
	})

	it('содержимое children переопределяет text', () => {
		const el = button({ text: 'ignored', children: <b>Custom</b> })

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Custom')
	})

	/**
	 * Пустое по правилам JSX — `null` и булево — не содержимое: текст на месте,
	 * как у шаблона Vue. `{cond() && <Icon />}` при ложном условии — `false`, и
	 * он не должен глушить `text`. Так же функция слота, вернувшая пустое.
	 */
	it.each([
		['false', false],
		['null', null],
		['функция, вернувшая null', (_scope: { text: string }) => null],
	])('children — %s: рисуется text', (_name, children) => {
		const el = button({ text: 'Сохранить', children })

		expect(el.querySelector('.s-button__text')?.textContent).toBe('Сохранить')
	})

	it('слот children получает scope с text', () => {
		const el = button({
			text: 'Scoped',
			children: (scope: { text: string }) => <b>{scope.text}!</b>,
		})

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Scoped!')
	})

	it('без слота показывается text из props', () => {
		const el = button({ text: 'Fallback' })

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Fallback')
	})

	/**
	 * Слот разворачивается один раз: геттер `children` в пропсах Solid на каждое
	 * чтение создаёт узлы заново, и проверка «задан ли слот» не должна рисовать
	 * второй экземпляр. Готовые узлы от смены scope не пересоздаются.
	 */
	it('готовые узлы слота — одни на монтирование, смена text их не пересоздаёт', () => {
		const ctrl = new TButton({ text: 'a' })
		const el = mount(() => (
			<Button ctrl={ctrl}>
				<b>Custom</b>
			</Button>
		)).root()
		const node = el.querySelector('.s-button__text b')

		expect(el.querySelectorAll('b')).toHaveLength(1)

		ctrl.text = 'b'

		expect(el.querySelector('.s-button__text b')).toBe(node)
	})

	it('функция слота зовётся заново со сменой text', () => {
		const ctrl = new TButton({ text: 'a' })
		const el = mount(() => (
			<Button ctrl={ctrl}>{(scope: { text: string }) => <b>{scope.text}!</b>}</Button>
		)).root()

		ctrl.text = 'b'

		expect(el.querySelector('.s-button__text')?.textContent).toBe('b!')
	})

	it('слот, заданный после монтирования, вытесняет text, снятый — возвращает', () => {
		const [shown, setShown] = createSignal(false)
		const el = mount(() => <Button text="Сохранить">{shown() && <b>Custom</b>}</Button>).root()
		const content = () => el.querySelector('.s-button__text')?.textContent

		expect(content()).toBe('Сохранить')

		setShown(true)

		expect(content()).toBe('Custom')

		setShown(false)

		expect(content()).toBe('Сохранить')
	})
})

describe('слот не ограничивает содержимое', () => {
	/**
	 * `scope` в объявлении слота — данные, которые компонент передаёт ВНУТРЬ,
	 * а не тип содержимого. Положить можно что угодно.
	 */
	it('в children можно положить целую таблицу', () => {
		const el = button({
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
		})

		expect(el.querySelector('.s-button__text table td')?.textContent).toBe('ячейка')
		expect(el.tagName.toLowerCase()).toBe('button')
	})

	it('scope доступен и при произвольной разметке', () => {
		const el = button({
			text: 'Заголовок',
			children: (scope: { text: string }) => (
				<ul>
					<li>{scope.text}</li>
				</ul>
			),
		})

		expect(el.querySelector('.s-button__text li')?.textContent).toBe('Заголовок')
	})
})

describe('слоты не уходят в атрибуты корня', () => {
	it('leading и trailing не становятся атрибутами', () => {
		const el = button({ text: 'Mid', leading: <i>L</i>, trailing: <i>T</i> })

		expect(el.hasAttribute('leading')).toBe(false)
		expect(el.hasAttribute('trailing')).toBe(false)
	})
})

describe('слот важнее одноимённого атрибута HTML', () => {
	/**
	 * В Solid слот — проп компонента, и его имя встречается с атрибутами
	 * `HTMLAttributes`. `title` там — строка: пересечение свело бы слот
	 * заголовка окна к строке, и разметку в него было бы не передать.
	 * `UseDomProps` вычитает из атрибутов имена слотов, как и пропсов.
	 *
	 * Тип проверяет не vitest, а шаг CI «Типы — Solid».
	 */
	it('title по DialogDescriptor и content по TabsDescriptor — разметка, а не строки атрибута', () => {
		expectTypeOf<UseDomProps<typeof DialogDescriptor>['title']>().toEqualTypeOf<JSX.Element>()
		expectTypeOf<UseDomProps<typeof TabsDescriptor>['content']>().toEqualTypeOf<JSX.Element>()
	})
})

describe('содержимое — только слот default', () => {
	/**
	 * `children` в Solid — это слот `default`, и ничего больше. Компонент, чья
	 * разметка содержимого не рисует, слота не объявляет, и `children` в его
	 * пропсах нет — ни из слотов, ни из атрибутов DOM: `UseDomProps` вычитает
	 * его всегда. Подпись контрола — `Label` вложением.
	 *
	 * Тип проверяет не vitest, а шаг CI «Типы — Solid».
	 */
	it('у CheckBox и Input children нет, у Frame — есть: его разметка содержимое рисует', () => {
		expectTypeOf<UseDomProps<typeof CheckBoxDescriptor>>().not.toHaveProperty('children')
		expectTypeOf<UseDomProps<typeof InputDescriptor>>().not.toHaveProperty('children')
		expectTypeOf<FrameProps>().toHaveProperty('children')
		expectTypeOf<FrameProps['children']>().toEqualTypeOf<JSX.Element>()
	})
})
