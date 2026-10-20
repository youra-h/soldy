/**
 * Field в React: поле формы — подпись, контрол, подсказка и ошибка.
 *
 * Сценарии — те же, что у Vue (`field.spec.ts`), на контролах, которые в
 * адаптере есть. Части — разметка поля: часть стоит, пока задан её текст,
 * ошибка — при `invalid` и на месте подсказки. С контролом поле связывает
 * проводка: поле опускает связку по лифту (`Elevate`), контрол её берёт.
 * Labelable-контрол (Input, NumberInput, CheckBox, Switch, Rating, Slider с
 * одной ручкой) подпись называет своим `for`, группу (RadioGroup, Slider с
 * несколькими ручками) — ссылкой `aria-labelledby`. Справку контрол получает в
 * `aria-describedby`, ошибку — `aria-invalid` и `data-invalid` на своём корне.
 *
 * Своё у React — момент приёма: контрол сообщает полю о себе при коммите, а
 * эффекты детей React зовёт раньше родителя. Контрол в слоте поля поэтому
 * принимался бы раньше самого поля, если бы поле не опускало своему
 * содержимому пустую связку. StrictMode пересобирает и поле, и контрол.
 *
 * Раскладку сторон, выравнивание по первой строке и клик по подписи jsdom не
 * считает — их проверяет `playground/vue/browser/field.spec.ts`.
 */

import { describe, it, expect, vi } from 'vitest'
import { StrictMode, act, useState, type ReactElement, type ReactNode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TField, TInput, TSlider } from '@soldy-ui/core'
import {
	CheckBox,
	Field,
	Input,
	Label,
	NumberInput,
	RadioGroup,
	Rating,
	Slider,
	Switch,
} from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

/** Подпись поля на странице; нет её — тест падает здесь. */
const label = (scope: ParentNode = document) => find(scope, '.so-field__label', HTMLLabelElement)

/** Атрибут ссылок, разобранный на `id`. */
const refsOf = (element: Element, name: string): string[] =>
	(element.getAttribute(name) ?? '').split(' ').filter(Boolean)

/** Радио группы — подписи текстом, как у Vue. */
const radios = (): ReactNode => (
	<RadioGroup>
		<RadioGroup.Item value="a">А</RadioGroup.Item>
		<RadioGroup.Item value="b">Б</RadioGroup.Item>
	</RadioGroup>
)

describe('Field · разметка', () => {
	it('корень — div с модификаторами стороны и размера, части по порядку', () => {
		const root = mount(
			<Field label="Почта" helper="Не покажем никому">
				<Input />
			</Field>,
		).root()

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
		expect(label().textContent).toBe('Почта')
		expect(find(root, '.so-field__helper', HTMLElement).textContent).toBe('Не покажем никому')
		expect(root.querySelector('.so-field__control > .so-input')).not.toBeNull()
	})

	it('часть без текста не рисуется', () => {
		const root = mount(
			<Field>
				<Input />
			</Field>,
		).root()

		expect([...root.children].map((part) => part.className)).toEqual(['so-field__control'])
	})

	it('ошибка — при invalid и на месте подсказки, со значком', () => {
		const ctrl = new TField({ helper: 'Подсказка', error: 'Нет @' })

		mount(
			<Field ctrl={ctrl}>
				<Input />
			</Field>,
		)

		expect(document.querySelector('.so-field__error')).toBeNull()

		act(() => {
			ctrl.invalid = true
		})

		expect(document.querySelector('.so-field__helper')).toBeNull()
		expect(find(document, '.so-field__error-text', HTMLElement).textContent).toBe('Нет @')

		// Значок — декор: смысл несёт текст. Корень иконки по роли — `<svg>`
		const icon = document.querySelector('.so-field__error > .so-field__error-icon')

		expect(icon?.localName).toBe('svg')
		expect(icon?.getAttribute('aria-hidden')).toBe('true')
	})

	it('слот части — своя разметка внутри части, но без текста части не создаёт', () => {
		mount(
			<Field
				label="Почта"
				label-content={<b>Почта *</b>}
				helper-content={<a href="#">Подробнее</a>}
			>
				<Input />
			</Field>,
		)

		expect(label().innerHTML).toBe('<b>Почта *</b>')
		expect(document.querySelector('.so-field__helper')).toBeNull()
	})

	it('слот ошибки — своя разметка вместо текста', () => {
		mount(
			<Field error="Ошибка" invalid error-content={<b>Нет @</b>}>
				<Input />
			</Field>,
		)

		expect(find(document, '.so-field__error-text', HTMLElement).innerHTML).toBe('<b>Нет @</b>')
	})

	it('смена position меняет модификатор стороны', () => {
		const { root, render } = mount(<Field position="start" />)

		expect(root().classList.contains('so-field--position-start')).toBe(true)

		render(<Field position="end" />)

		expect(root().classList.contains('so-field--position-end')).toBe(true)
		expect(root().classList.contains('so-field--position-start')).toBe(false)
	})

	it('tag рисует корень другим тегом', () => {
		expect(mount(<Field tag="section" />).root().localName).toBe('section')
	})
})

/**
 * Labelable-контрол: `for` подписи ведёт на его поле, а справка и ошибка — в
 * наборе поля. Селекторы — корень контрола и поле, которое называет подпись.
 */
const LABELABLES: ReadonlyArray<readonly [string, () => ReactNode, string, string]> = [
	['Input', () => <Input />, '.so-input', '.so-input input'],
	['NumberInput', () => <NumberInput />, '.so-number-input', '.so-number-input__input'],
	['CheckBox', () => <CheckBox />, '.so-check-box', '.so-check-box input'],
	['Switch', () => <Switch />, '.so-switch', '.so-switch input'],
	['Rating', () => <Rating />, '.so-rating', '.so-rating input'],
	['Slider', () => <Slider />, '.so-slider', '.so-slider input'],
]

describe.each(LABELABLES)('%s в поле', (_name, control, root, element) => {
	it('for подписи — на id поля контрола, подписи-ссылки нет', () => {
		mount(<Field label="Подпись">{control()}</Field>)

		const input = find(document, element, HTMLInputElement)

		expect(input.id).not.toBe('')
		expect(label().htmlFor).toBe(input.id)
		expect(input.hasAttribute('aria-labelledby')).toBe(false)
	})

	it('справка — в aria-describedby, ошибка — вместо неё, с aria-invalid и data-invalid', () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })

		mount(<Field ctrl={ctrl}>{control()}</Field>)

		const input = find(document, element, HTMLInputElement)
		const rootOf = () => find(document, root, HTMLElement)

		expect(refsOf(input, 'aria-describedby')).toEqual([
			find(document, '.so-field__helper', HTMLElement).id,
		])
		expect(input.hasAttribute('aria-invalid')).toBe(false)
		expect(rootOf().hasAttribute('data-invalid')).toBe(false)

		act(() => {
			ctrl.invalid = true
		})

		expect(refsOf(input, 'aria-describedby')).toEqual([
			find(document, '.so-field__error', HTMLElement).id,
		])
		expect(input.getAttribute('aria-invalid')).toBe('true')
		expect(rootOf().dataset['invalid']).toBe('true')
		expect(input.hasAttribute('data-invalid')).toBe(false)

		act(() => {
			ctrl.invalid = false
		})

		expect(input.hasAttribute('aria-invalid')).toBe(false)
		expect(rootOf().hasAttribute('data-invalid')).toBe(false)
	})
})

/** Группа: подпись называет её ссылкой, `for` нет. */
describe('RadioGroup в поле', () => {
	const group = () => find(document, '.so-radio-group', HTMLElement)

	it('for у подписи нет, группа ссылается на подпись', () => {
		mount(<Field label="Подпись">{radios()}</Field>)

		expect(label().hasAttribute('for')).toBe(false)
		expect(label().id).not.toBe('')
		expect(refsOf(group(), 'aria-labelledby')).toEqual([label().id])
	})

	it('справка и ошибка — у группы, data-invalid — на её корне', () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })

		mount(<Field ctrl={ctrl}>{radios()}</Field>)

		expect(refsOf(group(), 'aria-describedby')).toEqual([
			find(document, '.so-field__helper', HTMLElement).id,
		])

		act(() => {
			ctrl.invalid = true
		})

		expect(refsOf(group(), 'aria-describedby')).toEqual([
			find(document, '.so-field__error', HTMLElement).id,
		])
		expect(group().getAttribute('aria-invalid')).toBe('true')
		expect(group().dataset['invalid']).toBe('true')
	})

	it('радио связку поля не берут: id и ссылок на части у них нет', () => {
		mount(
			<Field label="Подпись" helper="Подсказка">
				{radios()}
			</Field>,
		)

		const fields = [...document.querySelectorAll('.so-radio-group-item__input')]

		expect(fields).toHaveLength(2)
		expect(fields.map((field) => field.id)).toEqual(['', ''])
		expect(fields.map((field) => field.hasAttribute('aria-describedby'))).toEqual([
			false,
			false,
		])
	})
})

/**
 * Ползунок с несколькими ручками — группа: `for` назвал бы одно поле из них, а
 * ссылка на подпись в наборе полей перекрыла бы имена ручек (`thumbLabels`).
 * Подпись и справка — у корня (`role="group"`), а ошибка — `aria-invalid` на
 * каждом поле: на группе ARIA ошибки не объявляет.
 */
describe('Slider с несколькими ручками в поле', () => {
	const range = () => <Slider value={[20, 80]} thumbLabels={['От', 'До']} />
	const root = () => find(document, '.so-slider', HTMLElement)
	const thumbs = () => [...document.querySelectorAll('.so-slider input')]

	it('for у подписи нет, корень — группа со ссылкой на подпись, имена ручек целы', () => {
		mount(<Field label="Цена">{range()}</Field>)

		expect(label().hasAttribute('for')).toBe(false)
		expect(root().getAttribute('role')).toBe('group')
		expect(refsOf(root(), 'aria-labelledby')).toEqual([label().id])
		expect(thumbs().map((thumb) => thumb.getAttribute('aria-label'))).toEqual(['От', 'До'])
		expect(thumbs().map((thumb) => thumb.hasAttribute('aria-labelledby'))).toEqual([
			false,
			false,
		])
		expect(thumbs().map((thumb) => thumb.id)).toEqual(['', ''])
	})

	it('справка — у группы, ошибка — aria-invalid на каждой ручке, data-invalid на корне', () => {
		const ctrl = new TField({ label: 'Цена', helper: 'Подсказка', error: 'Ошибка' })

		mount(<Field ctrl={ctrl}>{range()}</Field>)

		expect(refsOf(root(), 'aria-describedby')).toEqual([
			find(document, '.so-field__helper', HTMLElement).id,
		])
		expect(thumbs().map((thumb) => thumb.hasAttribute('aria-describedby'))).toEqual([
			false,
			false,
		])

		act(() => {
			ctrl.invalid = true
		})

		expect(refsOf(root(), 'aria-describedby')).toEqual([
			find(document, '.so-field__error', HTMLElement).id,
		])
		expect(thumbs().map((thumb) => thumb.getAttribute('aria-invalid'))).toEqual([
			'true',
			'true',
		])
		expect(root().hasAttribute('aria-invalid')).toBe(false)
		expect(root().dataset['invalid']).toBe('true')
	})

	it('число ручек сменилось — подпись за ним: for у одной, ссылка группы у нескольких', () => {
		const ctrl = new TSlider({ value: 30 })

		mount(
			<Field label="Цена">
				<Slider ctrl={ctrl} />
			</Field>,
		)

		expect(label().htmlFor).toBe(find(document, '.so-slider input', HTMLInputElement).id)

		act(() => {
			ctrl.value = [20, 80]
		})

		expect(label().hasAttribute('for')).toBe(false)
		expect(root().getAttribute('role')).toBe('group')
		expect(refsOf(root(), 'aria-labelledby')).toEqual([label().id])
		expect(thumbs().map((thumb) => thumb.id)).toEqual(['', ''])

		act(() => {
			ctrl.value = 50
		})

		const input = find(document, '.so-slider input', HTMLInputElement)

		expect(input.id).not.toBe('')
		expect(label().htmlFor).toBe(input.id)
		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-labelledby')).toBe(false)
	})
})

describe('Field · id поля', () => {
	it('свой id контрола — его, и for подписи ведёт на него', () => {
		mount(
			<Field label="Почта">
				<Input id="email" />
			</Field>,
		)

		expect(find(document, '.so-input input', HTMLInputElement).id).toBe('email')
		expect(label().htmlFor).toBe('email')
	})

	it('свой id задали позже — for идёт за ним', () => {
		const ctrl = new TInput()

		mount(
			<Field label="Почта">
				<Input ctrl={ctrl} />
			</Field>,
		)

		act(() => {
			ctrl.id = 'email'
		})

		expect(find(document, '.so-input input', HTMLInputElement).id).toBe('email')
		expect(label().htmlFor).toBe('email')
	})

	it('контрол сняли — его id от поля снят, for — снова на id поля', () => {
		const ctrl = new TInput()
		const { render } = mount(
			<Field label="Почта">
				<Input ctrl={ctrl} />
			</Field>,
		)
		const id = find(document, '.so-input input', HTMLInputElement).id

		render(<Field label="Почта" />)

		expect(ctrl.id).toBeUndefined()
		expect(label().htmlFor).toBe(id)
	})
})

describe('Field · имя контрола', () => {
	it('своё имя контрола-группы главнее подписи поля', () => {
		mount(
			<Field label="Подпись">
				<RadioGroup aria_label="Своё">
					<RadioGroup.Item value="a">А</RadioGroup.Item>
				</RadioGroup>
			</Field>,
		)

		const group = find(document, '.so-radio-group', HTMLElement)

		expect(group.getAttribute('aria-label')).toBe('Своё')
		expect(group.hasAttribute('aria-labelledby')).toBe(false)
	})

	it('флажок в подписи Label внутри поля: Label называет его, поле даёт справку', () => {
		mount(
			<Field helper="Можно отказаться в любой момент">
				<Label text="Согласен">
					<CheckBox />
				</Label>
			</Field>,
		)

		const input = find(document, '.so-check-box input', HTMLInputElement)

		expect(document.querySelector('.so-field__label')).toBeNull()
		expect(input.closest('label')?.classList.contains('so-label')).toBe(true)
		expect(refsOf(input, 'aria-describedby')).toEqual([
			find(document, '.so-field__helper', HTMLElement).id,
		])
	})
})

describe('Field · одно поле — один контрол', () => {
	it('второй контрол в поле связки не берёт', () => {
		mount(
			<Field label="Подпись" helper="Подсказка">
				<Input />
				<CheckBox />
			</Field>,
		)

		const second = find(document, '.so-check-box input', HTMLInputElement)

		expect(second.id).toBe('')
		expect(second.hasAttribute('aria-describedby')).toBe(false)
		expect(label().htmlFor).toBe(find(document, '.so-input input', HTMLInputElement).id)
	})

	/**
	 * Эффекты детей React зовёт раньше родителя, и флажок в слоте поля
	 * принимался бы раньше самого поля. Поле опускает своему содержимому пустую
	 * связку, и флажок её не видит.
	 */
	it('контрол в слоте поля связки не берёт — её берёт само поле', () => {
		mount(
			<Field label="Почта" helper="Подсказка">
				<Input trailing={<CheckBox />} />
			</Field>,
		)

		const input = find(document, '.so-input > input', HTMLInputElement)
		const nested = find(document, '.so-check-box input', HTMLInputElement)

		expect(label().htmlFor).toBe(input.id)
		expect(refsOf(input, 'aria-describedby')).toEqual([
			find(document, '.so-field__helper', HTMLElement).id,
		])
		expect(nested.id).toBe('')
		expect(nested.hasAttribute('aria-describedby')).toBe(false)
	})

	it('контрол появился позже — связку берёт он', () => {
		function Harness(): ReactElement {
			const [shown, setShown] = useState(false)

			return (
				<>
					<button type="button" onClick={() => setShown(true)}>
						Показать
					</button>
					<Field label="Почта" helper="Подсказка">
						{shown ? <Input /> : null}
					</Field>
				</>
			)
		}

		mount(<Harness />)
		act(() => find(document, 'button', HTMLButtonElement).click())

		const input = find(document, '.so-input input', HTMLInputElement)

		expect(label().htmlFor).toBe(input.id)
		expect(refsOf(input, 'aria-describedby')).toEqual([
			find(document, '.so-field__helper', HTMLElement).id,
		])
	})

	/**
	 * Поле, которое связки не взяло — её взял флажок раньше него, — своему
	 * содержимому всё равно опускает пустую связку: контрол в его слоте — его
	 * содержимое. Флажок сняли, связка свободна, а переключатель, появившийся в
	 * слоте поля, её не берёт.
	 */
	it('связка освободилась — контрол в слоте другого контрола её не берёт', () => {
		function Harness({ first, nested }: { first: boolean; nested: boolean }): ReactElement {
			return (
				<Field label="Почта" helper="Подсказка">
					{first ? <CheckBox /> : null}
					<Input trailing={nested ? <Switch /> : null} />
				</Field>
			)
		}

		const { render } = mount(<Harness first nested={false} />)

		render(<Harness first={false} nested={false} />)
		render(<Harness first={false} nested />)

		const nested = find(document, '.so-switch input', HTMLInputElement)

		expect(nested.id).toBe('')
		expect(nested.hasAttribute('aria-describedby')).toBe(false)
	})
})

/**
 * StrictMode заново устанавливает эффекты: поле собирается заново и опускает
 * новую связку, контрол пересобирается вслед за ним — сменилось прочитанное
 * через лифт. Связку держит контрол последней сборки.
 */
describe('Field · StrictMode', () => {
	it('связка — у пересобранного контрола: for, id и справка', async () => {
		mount(
			<StrictMode>
				<Field label="Почта" helper="Подсказка">
					<Input />
				</Field>
			</StrictMode>,
		)
		await nextFrame()

		const input = find(document, '.so-input input', HTMLInputElement)

		expect(input.id).not.toBe('')
		expect(label().htmlFor).toBe(input.id)
		expect(refsOf(input, 'aria-describedby')).toEqual([
			find(document, '.so-field__helper', HTMLElement).id,
		])
	})

	it('ошибка поля доходит до пересобранного контрола', () => {
		const ctrl = new TField({ label: 'Почта', error: 'Нет @' })

		mount(
			<StrictMode>
				<Field ctrl={ctrl}>
					<Input />
				</Field>
			</StrictMode>,
		)

		act(() => {
			ctrl.invalid = true
		})

		const input = find(document, '.so-input input', HTMLInputElement)

		expect(input.getAttribute('aria-invalid')).toBe('true')
		expect(find(document, '.so-input', HTMLElement).dataset['invalid']).toBe('true')
		expect(refsOf(input, 'aria-describedby')).toEqual([
			find(document, '.so-field__error', HTMLElement).id,
		])
	})
})

/**
 * Сервер рисует связку: ошибку, `id` поля и ссылки на части контрол берёт при
 * сборке, а `id` — от монтирования (`useId`). Гидратация поэтому идёт без
 * расхождений: о разошедшемся атрибуте React сообщил бы в консоль, и сторож
 * консоли уронил бы тест.
 */
describe('Field · серверный рендер', () => {
	function hydrate(element: ReactElement): {
		server: HTMLElement
		client: HTMLElement
		onRecoverableError: ReturnType<typeof vi.fn>
	} {
		const html = renderToString(element)
		const server = document.createElement('div')
		const client = document.createElement('div')
		const onRecoverableError = vi.fn()

		server.innerHTML = html
		client.innerHTML = html
		document.body.append(client)

		act(() => {
			track(hydrateRoot(client, element, { onRecoverableError }))
		})

		return { server, client, onRecoverableError }
	}

	it('сервер рисует связку: for подписи, id поля и справку', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(
			<Field label="Почта" helper="Подсказка">
				<Input />
			</Field>,
		)

		const input = find(container, 'input', HTMLInputElement)

		expect(input.id).not.toBe('')
		expect(label(container).htmlFor).toBe(input.id)
		expect(refsOf(input, 'aria-describedby')).toEqual([
			find(container, '.so-field__helper', HTMLElement).id,
		])
	})

	it('поле в поле формы: id поля, for подписи и справка у сервера и браузера одни', () => {
		const { server, client, onRecoverableError } = hydrate(
			<Field label="Почта" helper="Подсказка">
				<Input value="a" />
			</Field>,
		)
		const input = find(client, 'input', HTMLInputElement)

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(input.id).toBe(find(server, 'input', HTMLInputElement).id)
		expect(label(client).htmlFor).toBe(input.id)
		expect(refsOf(input, 'aria-describedby')).toEqual([
			find(server, '.so-field__helper', HTMLElement).id,
		])
	})

	it('группа в поле формы: ссылка на подпись у сервера и браузера одна', () => {
		const { server, client, onRecoverableError } = hydrate(
			<Field label="Выбор">{radios()}</Field>,
		)

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(refsOf(find(client, '.so-radio-group', HTMLElement), 'aria-labelledby')).toEqual([
			label(server).id,
		])
		expect(label(client).hasAttribute('for')).toBe(false)
	})

	it('ползунок с несколькими ручками: сервер рисует группу со ссылками на подпись и справку', () => {
		const { server, client, onRecoverableError } = hydrate(
			<Field label="Цена" helper="Подсказка">
				<Slider value={[20, 80]} thumbLabels={['От', 'До']} />
			</Field>,
		)
		const group = find(server, '.so-slider', HTMLElement)

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(group.getAttribute('role')).toBe('group')
		expect(refsOf(group, 'aria-labelledby')).toEqual([label(server).id])
		expect(refsOf(group, 'aria-describedby')).toEqual([
			find(server, '.so-field__helper', HTMLElement).id,
		])
		expect(refsOf(find(client, '.so-slider', HTMLElement), 'aria-labelledby')).toEqual([
			label(server).id,
		])
	})

	it('оценка в поле формы: id поля и for подписи у сервера и браузера одни', () => {
		const { server, client, onRecoverableError } = hydrate(
			<Field label="Оценка">
				<Rating value={3} />
			</Field>,
		)
		const input = find(client, 'input', HTMLInputElement)

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(input.id).toBe(find(server, 'input', HTMLInputElement).id)
		expect(label(client).htmlFor).toBe(input.id)
		expect(input.value).toBe('3')
	})
})
