/**
 * Field в Solid: поле формы — подпись, контрол, подсказка и ошибка.
 *
 * Сценарии — те же, что у Vue (`field.spec.ts`) и React (`field.spec.tsx`),
 * на контролах, которые в адаптере есть. Части — разметка поля: часть стоит,
 * пока задан её текст, ошибка — при `invalid` и на месте подсказки. С
 * контролом поле связывает проводка: поле опускает связку в слой своего лифта
 * (`Elevate`), контрол её берёт. Labelable-контрол (Input, NumberInput,
 * Select, CheckBox, Switch, Rating, Slider с одной ручкой) подпись называет своим
 * `for`, группу (DateInput, DatePicker, RadioGroup, Slider с несколькими
 * ручками) — ссылкой `aria-labelledby`.
 * Справку контрол получает в `aria-describedby`, ошибку — `aria-invalid` и
 * `data-invalid` на своём корне.
 *
 * Своё у Solid — где создаются узлы слота: там, где слот развернули. Поле и
 * контрол разворачивают своё содержимое под своим слоем лифта, иначе контрол
 * в слоте контрола видел бы связку поля формы над ним.
 *
 * Раскладку сторон, выравнивание по первой строке и клик по подписи jsdom не
 * считает — их проверяет `playground/vue/browser/field.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { Show, createSignal, useContext, type JSX } from 'solid-js'
import { TField, TInput, TSlider } from '@soldy-ui/core'
import type { TFieldPosition } from '@soldy-ui/core'
import {
	CheckBox,
	DateInput,
	DatePicker,
	Field,
	Input,
	Label,
	NumberInput,
	RadioGroup,
	Rating,
	Select,
	Slider,
	Switch,
} from '@soldy-ui/solid'
import { ElevatorContext, type TElevatorLayer } from '../src/adapter/elevator/layer'
import { find, mount } from './mount'

/** Подпись поля на странице; нет её — тест падает здесь. */
const label = () => find(document, '.so-field__label', HTMLLabelElement)

/** Атрибут ссылок, разобранный на `id`. */
const refsOf = (element: Element, name: string): string[] =>
	(element.getAttribute(name) ?? '').split(' ').filter(Boolean)

/** Узел по селектору в документе. */
const node = (selector: string) => find(document, selector, HTMLElement)

/** Поле контрола по селектору в документе. */
const input = (selector: string) => find(document, selector, HTMLInputElement)

/** Радио группы — подписи текстом, как у Vue. */
const radios = (): JSX.Element => (
	<RadioGroup>
		<RadioGroup.Item value="a">А</RadioGroup.Item>
		<RadioGroup.Item value="b">Б</RadioGroup.Item>
	</RadioGroup>
)

describe('Field · разметка', () => {
	it('корень — div с модификаторами стороны и размера, части по порядку', () => {
		const root = mount(() => (
			<Field label="Почта" helper="Не покажем никому">
				<Input />
			</Field>
		)).root()

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
		expect(node('.so-field__helper').textContent).toBe('Не покажем никому')
		expect(root.querySelector('.so-field__control > .so-input')).not.toBeNull()
	})

	it('часть без текста не рисуется', () => {
		const root = mount(() => (
			<Field>
				<Input />
			</Field>
		)).root()

		expect([...root.children].map((part) => part.className)).toEqual(['so-field__control'])
	})

	it('ошибка — при invalid и на месте подсказки, со значком', () => {
		const ctrl = new TField({ helper: 'Подсказка', error: 'Нет @' })

		mount(() => (
			<Field ctrl={ctrl}>
				<Input />
			</Field>
		))

		expect(document.querySelector('.so-field__error')).toBeNull()

		ctrl.invalid = true

		expect(document.querySelector('.so-field__helper')).toBeNull()
		expect(node('.so-field__error-text').textContent).toBe('Нет @')

		// Значок — декор: смысл несёт текст. Корень иконки по роли — `<svg>`
		const icon = document.querySelector('.so-field__error > .so-field__error-icon')

		expect(icon?.localName).toBe('svg')
		expect(icon?.getAttribute('aria-hidden')).toBe('true')
	})

	it('слот части — своя разметка внутри части, но без текста части не создаёт', () => {
		mount(() => (
			<Field
				label="Почта"
				label-content={<b>Почта *</b>}
				helper-content={<a href="#">Подробнее</a>}
			>
				<Input />
			</Field>
		))

		expect(label().innerHTML).toBe('<b>Почта *</b>')
		expect(document.querySelector('.so-field__helper')).toBeNull()
	})

	it('слот ошибки — своя разметка вместо текста', () => {
		mount(() => (
			<Field error="Ошибка" invalid error-content={<b>Нет @</b>}>
				<Input />
			</Field>
		))

		expect(node('.so-field__error-text').innerHTML).toBe('<b>Нет @</b>')
	})

	it('смена position меняет модификатор стороны', () => {
		const [position, setPosition] = createSignal<TFieldPosition>('start')
		const { root } = mount(() => <Field position={position()} />)

		expect(root().classList.contains('so-field--position-start')).toBe(true)

		setPosition('end')

		expect(root().classList.contains('so-field--position-end')).toBe(true)
		expect(root().classList.contains('so-field--position-start')).toBe(false)
	})

	it('tag рисует корень другим тегом', () => {
		expect(mount(() => <Field tag="section" />).root().localName).toBe('section')
	})
})

/**
 * Labelable-контрол: `for` подписи ведёт на его поле, а справка и ошибка — в
 * наборе поля. Селекторы — корень контрола и поле, которое называет подпись.
 */
const LABELABLES: ReadonlyArray<readonly [string, () => JSX.Element, string, string]> = [
	['Input', () => <Input />, '.so-input', '.so-input input'],
	['NumberInput', () => <NumberInput />, '.so-number-input', '.so-number-input__input'],
	['CheckBox', () => <CheckBox />, '.so-check-box', '.so-check-box input'],
	['Switch', () => <Switch />, '.so-switch', '.so-switch input'],
	['Rating', () => <Rating />, '.so-rating', '.so-rating input'],
	['Slider', () => <Slider />, '.so-slider', '.so-slider input'],
	['Select', () => <Select />, '.so-select', '.so-select__field input'],
]

describe.each(LABELABLES)('%s в поле', (_name, control, root, element) => {
	it('for подписи — на id поля контрола, подписи-ссылки нет', () => {
		mount(() => <Field label="Подпись">{control()}</Field>)

		expect(input(element).id).not.toBe('')
		expect(label().htmlFor).toBe(input(element).id)
		expect(input(element).hasAttribute('aria-labelledby')).toBe(false)
	})

	it('справка — в aria-describedby, ошибка — вместо неё, с aria-invalid и data-invalid', () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })

		mount(() => <Field ctrl={ctrl}>{control()}</Field>)

		expect(refsOf(input(element), 'aria-describedby')).toEqual([node('.so-field__helper').id])
		expect(input(element).hasAttribute('aria-invalid')).toBe(false)
		expect(node(root).hasAttribute('data-invalid')).toBe(false)

		ctrl.invalid = true

		expect(refsOf(input(element), 'aria-describedby')).toEqual([node('.so-field__error').id])
		expect(input(element).getAttribute('aria-invalid')).toBe('true')
		expect(node(root).dataset['invalid']).toBe('true')
		expect(input(element).hasAttribute('data-invalid')).toBe(false)

		ctrl.invalid = false

		expect(input(element).hasAttribute('aria-invalid')).toBe(false)
		expect(node(root).hasAttribute('data-invalid')).toBe(false)
	})
})

/**
 * Поле даты и DatePicker — группы: подпись называет их ссылкой, `for` нет.
 * Селектор — элемент с именем группы: у одной даты группа — само поле
 * DatePicker, у диапазона — его корень. Поля DatePicker — детали его разметки
 * (`embedded`): связку поля формы берёт DatePicker и отдаёт её полю своим
 * набором `aria`.
 */
const GROUPS: ReadonlyArray<readonly [string, () => JSX.Element, string]> = [
	['DateInput', () => <DateInput />, '.so-date-input'],
	['DatePicker', () => <DatePicker />, '.so-date-picker__field'],
	['DatePicker range', () => <DatePicker mode="range" />, '.so-date-picker'],
]

describe.each(GROUPS)('%s в поле', (_name, control, group) => {
	it('for у подписи нет, группа ссылается на подпись', () => {
		mount(() => <Field label="Подпись">{control()}</Field>)

		expect(label().hasAttribute('for')).toBe(false)
		expect(label().id).not.toBe('')
		expect(refsOf(node(group), 'aria-labelledby')).toEqual([label().id])
	})

	it('справка и ошибка — у группы', () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })

		mount(() => <Field ctrl={ctrl}>{control()}</Field>)

		expect(refsOf(node(group), 'aria-describedby')).toEqual([node('.so-field__helper').id])

		ctrl.invalid = true

		expect(refsOf(node(group), 'aria-describedby')).toEqual([node('.so-field__error').id])
		expect(node(group).getAttribute('aria-invalid')).toBe('true')
	})
})

/** Группа: подпись называет её ссылкой, `for` нет. */
describe('RadioGroup в поле', () => {
	const group = () => node('.so-radio-group')

	it('for у подписи нет, группа ссылается на подпись', () => {
		mount(() => <Field label="Подпись">{radios()}</Field>)

		expect(label().hasAttribute('for')).toBe(false)
		expect(label().id).not.toBe('')
		expect(refsOf(group(), 'aria-labelledby')).toEqual([label().id])
	})

	it('справка и ошибка — у группы, data-invalid — на её корне', () => {
		const ctrl = new TField({ label: 'Подпись', helper: 'Подсказка', error: 'Ошибка' })

		mount(() => <Field ctrl={ctrl}>{radios()}</Field>)

		expect(refsOf(group(), 'aria-describedby')).toEqual([node('.so-field__helper').id])

		ctrl.invalid = true

		expect(refsOf(group(), 'aria-describedby')).toEqual([node('.so-field__error').id])
		expect(group().getAttribute('aria-invalid')).toBe('true')
		expect(group().dataset['invalid']).toBe('true')
	})

	it('радио связку поля не берут: id и ссылок на части у них нет', () => {
		mount(() => (
			<Field label="Подпись" helper="Подсказка">
				{radios()}
			</Field>
		))

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
	const range = (): JSX.Element => <Slider value={[20, 80]} thumbLabels={['От', 'До']} />
	const root = () => node('.so-slider')
	const thumbs = () => [...document.querySelectorAll('.so-slider input')]

	it('for у подписи нет, корень — группа со ссылкой на подпись, имена ручек целы', () => {
		mount(() => <Field label="Цена">{range()}</Field>)

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

		mount(() => <Field ctrl={ctrl}>{range()}</Field>)

		expect(refsOf(root(), 'aria-describedby')).toEqual([node('.so-field__helper').id])
		expect(thumbs().map((thumb) => thumb.hasAttribute('aria-describedby'))).toEqual([
			false,
			false,
		])

		ctrl.invalid = true

		expect(refsOf(root(), 'aria-describedby')).toEqual([node('.so-field__error').id])
		expect(thumbs().map((thumb) => thumb.getAttribute('aria-invalid'))).toEqual([
			'true',
			'true',
		])
		expect(root().hasAttribute('aria-invalid')).toBe(false)
		expect(root().dataset['invalid']).toBe('true')
	})

	it('число ручек сменилось — подпись за ним: for у одной, ссылка группы у нескольких', () => {
		const ctrl = new TSlider({ value: 30 })

		mount(() => (
			<Field label="Цена">
				<Slider ctrl={ctrl} />
			</Field>
		))

		expect(label().htmlFor).toBe(input('.so-slider input').id)

		ctrl.value = [20, 80]

		expect(label().hasAttribute('for')).toBe(false)
		expect(root().getAttribute('role')).toBe('group')
		expect(refsOf(root(), 'aria-labelledby')).toEqual([label().id])
		expect(thumbs().map((thumb) => thumb.id)).toEqual(['', ''])

		ctrl.value = 50

		const field = input('.so-slider input')

		expect(field.id).not.toBe('')
		expect(label().htmlFor).toBe(field.id)
		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-labelledby')).toBe(false)
	})
})

describe('Field · id поля', () => {
	it('свой id контрола — его, и for подписи ведёт на него', () => {
		mount(() => (
			<Field label="Почта">
				<Input id="email" />
			</Field>
		))

		expect(input('.so-input input').id).toBe('email')
		expect(label().htmlFor).toBe('email')
	})

	it('свой id задали позже — for идёт за ним', () => {
		const ctrl = new TInput()

		mount(() => (
			<Field label="Почта">
				<Input ctrl={ctrl} />
			</Field>
		))

		ctrl.id = 'email'

		expect(input('.so-input input').id).toBe('email')
		expect(label().htmlFor).toBe('email')
	})

	it('контрол сняли — его id от поля снят, for — снова на id поля', () => {
		const ctrl = new TInput()
		const [shown, setShown] = createSignal(true)

		mount(() => (
			<Field label="Почта">
				<Show when={shown()}>
					<Input ctrl={ctrl} />
				</Show>
			</Field>
		))

		const id = input('.so-input input').id

		setShown(false)

		expect(ctrl.id).toBeUndefined()
		expect(label().htmlFor).toBe(id)
	})
})

describe('Field · имя контрола', () => {
	it('своё имя контрола-группы главнее подписи поля', () => {
		mount(() => (
			<Field label="Подпись">
				<RadioGroup aria_label="Своё">
					<RadioGroup.Item value="a">А</RadioGroup.Item>
				</RadioGroup>
			</Field>
		))

		expect(node('.so-radio-group').getAttribute('aria-label')).toBe('Своё')
		expect(node('.so-radio-group').hasAttribute('aria-labelledby')).toBe(false)
	})

	it('своё имя поля даты главнее подписи поля', () => {
		mount(() => (
			<Field label="Подпись">
				<DateInput aria_label="Своё" />
			</Field>
		))

		expect(node('.so-date-input').getAttribute('aria-label')).toBe('Своё')
		expect(node('.so-date-input').hasAttribute('aria-labelledby')).toBe(false)
	})

	it('флажок в подписи Label внутри поля: Label называет его, поле даёт справку', () => {
		mount(() => (
			<Field helper="Можно отказаться в любой момент">
				<Label text="Согласен">
					<CheckBox />
				</Label>
			</Field>
		))

		const checkbox = input('.so-check-box input')

		expect(document.querySelector('.so-field__label')).toBeNull()
		expect(checkbox.closest('label')?.classList.contains('so-label')).toBe(true)
		expect(refsOf(checkbox, 'aria-describedby')).toEqual([node('.so-field__helper').id])
	})
})

/**
 * Поле Select — деталь его разметки (`embedded`): связку поля формы берёт
 * сам Select, а не его Input, и свой набор `aria` с `id` от поля отдаёт
 * `<input>` комбобокса. Своему содержимому Select опускает пустую связку:
 * поле встаёт под неё, потому что развёрнуто в слое лифта Select.
 */
describe('Field · Select', () => {
	it('поле Select — деталь его разметки: связку берёт Select, а не его Input', () => {
		mount(() => (
			<Field label="Город">
				<Select />
			</Field>
		))

		const combobox = input('.so-select__field input')

		expect(combobox.getAttribute('role')).toBe('combobox')
		expect(combobox.id).not.toBe('')
		expect(label().htmlFor).toBe(combobox.id)
	})

	it('aria_label Select доходит до комбобокса', () => {
		mount(() => <Select aria_label="Город" />)

		expect(input('.so-select__field input').getAttribute('aria-label')).toBe('Город')
		expect(node('.so-select').hasAttribute('aria-label')).toBe(false)
	})

	/**
	 * Своё поле в слоте `field` — тоже содержимое Select: оно развёрнуто в его
	 * слое и видит пустую связку, а не связку поля формы над Select.
	 */
	it('своё поле в слоте field связку поля формы не берёт — её взял Select', () => {
		mount(() => (
			<Field label="Город" helper="Подсказка">
				<Select field={<Input class="own-field" />} />
			</Field>
		))

		const own = input('.own-field input')

		expect(own.id).toBe('')
		expect(own.hasAttribute('aria-describedby')).toBe(false)
		expect(label().htmlFor).not.toBe('')
	})
})

describe('Field · одно поле — один контрол', () => {
	it('второй контрол в поле связки не берёт', () => {
		mount(() => (
			<Field label="Подпись" helper="Подсказка">
				<Input />
				<CheckBox />
			</Field>
		))

		const second = input('.so-check-box input')

		expect(second.id).toBe('')
		expect(second.hasAttribute('aria-describedby')).toBe(false)
		expect(label().htmlFor).toBe(input('.so-input input').id)
	})

	it('контрол в слоте поля связки не берёт — её берёт само поле', () => {
		mount(() => (
			<Field label="Почта" helper="Подсказка">
				<Input trailing={<CheckBox />} />
			</Field>
		))

		const field = input('.so-input > input')
		const nested = input('.so-check-box input')

		expect(label().htmlFor).toBe(field.id)
		expect(refsOf(field, 'aria-describedby')).toEqual([node('.so-field__helper').id])
		expect(nested.id).toBe('')
		expect(nested.hasAttribute('aria-describedby')).toBe(false)
	})

	/**
	 * Слоты ползунка и оценки разворачиваются под их слоем лифта, с пустой
	 * связкой: контрол в подписи метки или в значке звезды — их содержимое, а не
	 * контрол поля. Связку взял флажок раньше них, флажок сняли — связка
	 * свободна, а переключатель, появившийся в слоте, её всё равно не берёт.
	 */
	it.each([
		[
			'Slider, слот mark',
			(nested: () => boolean) => (
				<Slider
					value={20}
					marks={[{ value: 50 }]}
					mark={() => (
						<Show when={nested()}>
							<Switch />
						</Show>
					)}
				/>
			),
		],
		[
			'Rating, слот icon',
			(nested: () => boolean) => (
				<Rating
					max={1}
					icon={({ filled }) => (
						<Show when={filled && nested()}>
							<Switch />
						</Show>
					)}
				/>
			),
		],
	])('%s: связка освободилась — контрол в слоте её не берёт', (_name, control) => {
		const [first, setFirst] = createSignal(true)
		const [nested, setNested] = createSignal(false)

		mount(() => (
			<Field label="Подпись" helper="Подсказка">
				<Show when={first()}>
					<CheckBox />
				</Show>
				{control(nested)}
			</Field>
		))

		setFirst(false)
		setNested(true)

		const switchField = input('.so-switch input')

		expect(switchField.id).toBe('')
		expect(switchField.hasAttribute('aria-describedby')).toBe(false)
	})

	/**
	 * Поле, которое связки не взяло — её взял флажок раньше него, — своему
	 * содержимому всё равно опускает пустую связку: контрол в его слоте — его
	 * содержимое. Флажок сняли, связка свободна, а переключатель, появившийся в
	 * слоте поля, её не берёт: слот разворачивается под слоем поля.
	 */
	it('связка освободилась — контрол в слоте другого контрола её не берёт', () => {
		const [first, setFirst] = createSignal(true)
		const [nested, setNested] = createSignal(false)

		mount(() => (
			<Field label="Почта" helper="Подсказка">
				<Show when={first()}>
					<CheckBox />
				</Show>
				<Input
					trailing={
						<Show when={nested()}>
							<Switch />
						</Show>
					}
				/>
			</Field>
		))

		setFirst(false)
		setNested(true)

		const switchField = input('.so-switch input')

		expect(switchField.id).toBe('')
		expect(switchField.hasAttribute('aria-describedby')).toBe(false)
	})

	it('контрол появился позже — связку берёт он', () => {
		const [shown, setShown] = createSignal(false)

		mount(() => (
			<Field label="Почта" helper="Подсказка">
				<Show when={shown()}>
					<Input />
				</Show>
			</Field>
		))

		setShown(true)

		const field = input('.so-input input')

		expect(label().htmlFor).toBe(field.id)
		expect(refsOf(field, 'aria-describedby')).toEqual([node('.so-field__helper').id])
	})
})

/** Слой лифта, который видит узел в этом месте дерева. */
function LayerProbe(props: { into: (layer: TElevatorLayer | undefined) => void }): JSX.Element {
	props.into(useContext(ElevatorContext))

	return null
}

/**
 * Пустую связку контрол опускает своему содержимому, только когда поле над
 * ним есть. Вне поля своего в слое контрола нет, и провайдера он не ставит:
 * содержимое его слотов видит слой предка — тот же объект, — и флажок в каждой
 * строке таблицы провайдера не несёт.
 */
describe('Field · слой лифта контрола', () => {
	it('вне поля — содержимое слота видит слой предка, провайдера у контрола нет', () => {
		const layers: (TElevatorLayer | undefined)[] = []

		mount(() => (
			<RadioGroup>
				<LayerProbe into={(layer) => layers.push(layer)} />
				<Input trailing={<LayerProbe into={(layer) => layers.push(layer)} />} />
			</RadioGroup>
		))

		expect(layers).toHaveLength(2)
		expect(layers[0]).toBeDefined()
		expect(layers[1]).toBe(layers[0])
	})

	it('в поле — у содержимого слота свой слой контрола, с пустой связкой', () => {
		const layers: (TElevatorLayer | undefined)[] = []

		mount(() => (
			<Field label="Почта">
				<LayerProbe into={(layer) => layers.push(layer)} />
				<Input trailing={<LayerProbe into={(layer) => layers.push(layer)} />} />
			</Field>
		))

		expect(layers).toHaveLength(2)
		expect(layers[1]).not.toBe(layers[0])
		expect(layers[1]?.empty).toBe(false)
	})
})
