/**
 * Слоты Solid — props с JSX; scoped-слот принимает функцию.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { createRenderEffect, createRoot, createSignal, type JSX } from 'solid-js'
import {
	ButtonDescriptor,
	type CheckBoxDescriptor,
	type DialogDescriptor,
	type InputDescriptor,
	type TabsDescriptor,
} from '@soldy-ui/setup'
import { TButton } from '@soldy-ui/core'
import {
	Button,
	liveScope,
	relaySlot,
	renderSlot,
	type ButtonProps,
	type CheckBoxProps,
	type FrameProps,
	type InputProps,
	type LabelProps,
	type PaginationProps,
	type PopoverProps,
	type ProgressLinearProps,
	type RatingProps,
	type ScrollerProps,
	type SliderProps,
	type SwitchProps,
	type TooltipProps,
	type UseDomProps,
} from '@soldy-ui/solid'
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

		expect(el.querySelector('.so-button__text')?.textContent?.trim()).toBe('Custom')
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

		expect(el.querySelector('.so-button__text')?.textContent).toBe('Сохранить')
	})

	it('слот children получает scope с text', () => {
		const el = button({
			text: 'Scoped',
			children: (scope: { text: string }) => <b>{scope.text}!</b>,
		})

		expect(el.querySelector('.so-button__text')?.textContent?.trim()).toBe('Scoped!')
	})

	it('без слота показывается text из props', () => {
		const el = button({ text: 'Fallback' })

		expect(el.querySelector('.so-button__text')?.textContent?.trim()).toBe('Fallback')
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
		const node = el.querySelector('.so-button__text b')

		expect(el.querySelectorAll('b')).toHaveLength(1)

		ctrl.text = 'b'

		expect(el.querySelector('.so-button__text b')).toBe(node)
	})

	/**
	 * Scope функция слота получает живой (`liveScope`): прочитанное в её
	 * разметке следует за ним на месте, и функция зовётся один раз — кнопка или
	 * поле внутри слота не теряют ни узла, ни фокуса.
	 */
	it('scope, прочитанный в разметке, — содержимое следует за text на месте, узел тот же', () => {
		const ctrl = new TButton({ text: 'a' })
		let calls = 0
		const el = mount(() => (
			<Button ctrl={ctrl}>
				{(scope: { text: string }) => {
					calls += 1

					return <b>{scope.text}!</b>
				}}
			</Button>
		)).root()
		const node = el.querySelector('.so-button__text b')

		ctrl.text = 'b'

		expect(el.querySelector('.so-button__text b')).toBe(node)
		expect(node?.textContent).toBe('b!')
		expect(calls).toBe(1)
	})

	/**
	 * Прочитанное в теле функции — деструктуризация — читается при вызове, и
	 * смена scope функцию перезапускает, с новым значением.
	 */
	it('деструктурированный scope — функция зовётся заново, с новым text', () => {
		const ctrl = new TButton({ text: 'a' })
		let calls = 0
		const el = mount(() => (
			<Button ctrl={ctrl}>
				{({ text }: { text: string }) => {
					calls += 1

					return <b>{text}!</b>
				}}
			</Button>
		)).root()

		ctrl.text = 'b'

		expect(el.querySelector('.so-button__text')?.textContent).toBe('b!')
		expect(calls).toBe(2)
	})

	/**
	 * Рисовать ли своё, слот решает по scope в теле функции: пустое, что он
	 * вернул при новом scope, уступает место тексту, а непустое вытесняет его
	 * снова.
	 */
	it('пустое при новом scope уступает место text, непустое — вытесняет его', () => {
		const ctrl = new TButton({ text: 'a' })
		const el = mount(() => (
			<Button ctrl={ctrl}>
				{(scope: { text: string }) => (scope.text === 'a' ? <b>свой</b> : null)}
			</Button>
		)).root()
		const content = () => el.querySelector('.so-button__text')?.innerHTML

		expect(content()).toBe('<b>свой</b>')

		ctrl.text = 'b'

		expect(content()).toBe('b')

		ctrl.text = 'a'

		expect(content()).toBe('<b>свой</b>')
	})

	it('слот, заданный после монтирования, вытесняет text, снятый — возвращает', () => {
		const [shown, setShown] = createSignal(false)
		const el = mount(() => <Button text="Сохранить">{shown() && <b>Custom</b>}</Button>).root()
		const content = () => el.querySelector('.so-button__text')?.textContent

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

		expect(el.querySelector('.so-button__text table td')?.textContent).toBe('ячейка')
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

		expect(el.querySelector('.so-button__text li')?.textContent).toBe('Заголовок')
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

	/**
	 * Поля берут атрибуты `<input>` (`TFieldAttributes`), а `children` есть и
	 * там: вычитается он и у них. Подпись поля — `Label` вокруг, контрол — её
	 * слот `default`.
	 */
	it('у полей CheckBox, Switch и Input children нет, у Label — есть: это её контрол', () => {
		expectTypeOf<CheckBoxProps>().not.toHaveProperty('children')
		expectTypeOf<SwitchProps>().not.toHaveProperty('children')
		expectTypeOf<InputProps>().not.toHaveProperty('children')
		expectTypeOf<LabelProps>().toHaveProperty('children')
		expectTypeOf<LabelProps['children']>().toEqualTypeOf<JSX.Element>()
	})

	/**
	 * Ручки, звёзды и страницы рисует сам компонент, а их содержимое — слоты со
	 * scope (`thumb`, `mark`, `icon`, `item`); содержимого у полосы нет вовсе.
	 * Лента — наоборот: её содержимое и есть слот по умолчанию.
	 */
	it('у Slider, Rating, ProgressLinear и Pagination children нет, у Scroller — есть', () => {
		expectTypeOf<SliderProps>().not.toHaveProperty('children')
		expectTypeOf<RatingProps>().not.toHaveProperty('children')
		expectTypeOf<ProgressLinearProps>().not.toHaveProperty('children')
		expectTypeOf<PaginationProps>().not.toHaveProperty('children')
		expectTypeOf<ScrollerProps>().toHaveProperty('children')
		expectTypeOf<ScrollerProps['children']>().toEqualTypeOf<JSX.Element>()
	})

	/**
	 * Содержимое поповера и текст подсказки — их панель, слот по умолчанию; то,
	 * у чего панель встаёт, — слот `trigger` со scope связки.
	 */
	it('у Popover и Tooltip children — содержимое панели, триггер — слот trigger', () => {
		expectTypeOf<PopoverProps['children']>().toEqualTypeOf<JSX.Element>()
		expectTypeOf<TooltipProps['children']>().toEqualTypeOf<JSX.Element>()
		expectTypeOf<PopoverProps>().toHaveProperty('trigger')
		expectTypeOf<TooltipProps>().toHaveProperty('trigger')
	})
})

/**
 * Живой scope (`liveScope`) — объект с геттерами по ключам scope: функция
 * слота получает его один раз, а читают его там, где он нужен. Прочитанное в
 * разметке компилятор Solid отдаёт аксессором, и смена scope обновляет его на
 * месте; прочитанное в теле функции — деструктуризация — перезапускает её,
 * как свежий объект scope.
 */
describe('живой scope', () => {
	type TScope = { text: string; aria: Record<string, string> }

	/** Scope от сигнала теста — так scope слота меняет компонент. */
	function live() {
		const [text, setText] = createSignal('a')
		const scope = liveScope<TScope>(() => ({ text: text(), aria: { 'aria-label': text() } }))

		return { scope, setText }
	}

	it('прочитанный в разметке — узел тот же, значение новое', () => {
		const { scope, setText } = live()
		const { container } = mount(() => (
			<div>
				{renderSlot(
					(slot: TScope) => (
						<b {...slot.aria}>{slot.text}</b>
					),
					scope,
				)}
			</div>
		))
		const node = container.querySelector('b')

		setText('b')

		expect(container.querySelector('b')).toBe(node)
		expect(node?.textContent).toBe('b')
		expect(node?.getAttribute('aria-label')).toBe('b')
	})

	it('деструктурированный — значение тоже новое', () => {
		const { scope, setText } = live()
		const { container } = mount(() => (
			<div>
				{renderSlot(
					({ text }: TScope) => (
						<b>{text}</b>
					),
					scope,
				)}
			</div>
		))

		setText('b')

		expect(container.querySelector('b')?.textContent).toBe('b')
	})

	it('ключи — перечислимые: спред и Object.keys видят текущие значения', () => {
		const { scope, setText } = live()

		setText('b')

		expect(Object.keys(scope)).toEqual(['text', 'aria'])
		expect({ ...scope }).toEqual({ text: 'b', aria: { 'aria-label': 'b' } })
	})

	/**
	 * Проброс (`relaySlot`) сливает живой scope элемента с тем, что добавил
	 * владелец, живыми полями, а не спредом: спред прочёл бы scope в теле
	 * проброса, и слот владельца перерисовывался бы на каждую его смену.
	 */
	it('проброс: scope элемента и добавка — живыми полями, слот владельца зовётся один раз', () => {
		const { scope, setText } = live()
		let joined: (TScope & { item: string }) | undefined
		let calls = 0
		const relay = relaySlot<TScope, { item: string }>(
			(slot) => {
				calls += 1
				joined = slot

				return (
					<b>
						{slot.text}:{slot.item}
					</b>
				)
			},
			{ item: 'x' },
		)
		const { container } = mount(() => <div>{renderSlot(relay, scope)}</div>)
		const node = container.querySelector('b')

		setText('b')

		expect(container.querySelector('b')).toBe(node)
		expect(node?.textContent).toBe('b:x')
		expect(calls).toBe(1)
		expect(Object.keys(joined ?? {})).toEqual(['text', 'aria', 'item'])
		expect({ ...joined }).toEqual({ text: 'b', aria: { 'aria-label': 'b' }, item: 'x' })
	})

	it('проброс: добавка владельца — поверх scope элемента, как в спреде', () => {
		let joined: { item: string } | undefined
		const relay = relaySlot<{ item: string }, { item: string }>(
			(slot) => {
				joined = slot

				return null
			},
			{ item: 'владелец' },
		)

		renderSlot(
			relay,
			liveScope(() => ({ item: 'элемент' })),
		)

		expect(joined?.item).toBe('владелец')
	})

	/**
	 * Ключи живой scope берёт первым чтением вне слежения: собранный внутри
	 * вычисления (мемо разворота слота), он не подписывает его на scope — иначе
	 * смена scope перезапускала бы функцию слота, как свежий объект.
	 */
	it('сборка за аксессором scope не следит', () => {
		const [text, setText] = createSignal('a')
		let runs = 0
		const dispose = createRoot((dispose) => {
			createRenderEffect(() => {
				runs += 1
				liveScope(() => ({ text: text() }))
			})

			return dispose
		})

		setText('b')
		dispose()

		expect(runs).toBe(1)
	})
})
