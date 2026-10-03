/**
 * Поле даты в настоящем браузере — выделение, буфер обмена и клавиши.
 *
 * Здесь то, чего jsdom не выполняет вовсе. Протяжка мышью: части — свои
 * коробки во флекс-ряду, и протяжка с левого края дня или месяца выделяет
 * дату, а не застревает в соседнем тексте, как в строчной раскладке Chrome.
 * Это главный сторож от возврата строчной раскладки в теме. Буфер обмена:
 * настоящие Ctrl+C и Ctrl+X кладут текст без переводов строк, которые Chrome
 * ставит между флекс-коробками в `Selection#toString()`. Ctrl+A, контекстное
 * меню, вставка, переход фокуса по частям — на настоящей разметке и с
 * раскладкой справа налево. Сенсорный режим: касание пальцем (команда `tap`)
 * делает части редактируемыми ещё до фокуса, ввод без клавиш (`insertText`) и
 * композиция IME (`compose`) доходят до ядра, а нажатие мышью возвращает
 * протяжку. Экранной клавиатуры и скринридеров здесь нет — их проверяют на
 * устройствах. Ширина поля: год, который ядро пишет как есть («2», «20»,
 * «2026»), держит место под все четыре цифры и поле при наборе не растягивает.
 *
 * Модель проверяет ядро, команды клавиш — тест плагинов, проводку —
 * `ui/vue/__tests__/date-input.spec.ts`. Само контекстное меню — нативное:
 * тестом его не достать, проверяется только то, что ряд становится
 * редактируемым и возвращается обратно.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { TDateInput } from '@soldy-ui/core'
import type { IDateInputProps } from '@soldy-ui/core'
import { DateInput } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Поле между текстом и кнопкой — чтобы протяжке было куда уйти за край поля
 * и откуда войти в него по Tab. Узел корня плагины получают кадром позже.
 */
const show = async (
	props: Partial<IDateInputProps> = {},
	attrs: Record<string, unknown> = {},
	dir: 'ltr' | 'rtl' = 'ltr',
): Promise<TDateInput> => {
	const ctrl = new TDateInput({ locale: 'ru-RU', value: '2026-05-12', ...props })

	render(
		defineComponent({
			render: () =>
				h('div', { class: 's-host', dir, style: 'padding: 16px' }, [
					h('span', { class: 's-test-before' }, 'Дата рождения '),
					h(DateInput, { ctrl, aria_label: 'Дата рождения', ...attrs }),
					h('button', { class: 's-test-after' }, 'После'),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()

	return ctrl
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const segment = (type: string) => find(`.s-date-input__segment[data-type="${type}"]`)
const row = () => find('.s-date-input__segments')

/** Текст выделения документа — текстом узлов, как его кладёт в буфер поле. */
const selectedText = (): string => {
	const selection = document.getSelection()

	if (!selection || selection.rangeCount === 0) return ''

	return selection.getRangeAt(0).cloneContents().textContent ?? ''
}

/** Точка узла в его собственных координатах: от левого края, по середине высоты. */
const at = (element: HTMLElement, x: number) => ({
	x,
	y: element.getBoundingClientRect().height / 2,
})

/** Протянуть мышью от точки одного узла до точки другого. */
const drag = async (
	from: HTMLElement,
	fromX: number,
	to: HTMLElement,
	toX: number,
): Promise<void> => {
	await userEvent.hover(from, { position: at(from, fromX) })
	await commands.mouseDown()

	try {
		await userEvent.hover(to, { position: at(to, toX) })
	} finally {
		await commands.mouseUp()
	}
}

/**
 * Что поле положило в буфер обмена. Слушатель — на окне: событие доходит до
 * него после документа, где его исполнил плагин поля.
 */
const clipboardOf = async (keys: string): Promise<{ text: string; prevented: boolean }> => {
	let text = ''
	let prevented = false
	const listen = (event: ClipboardEvent): void => {
		text = event.clipboardData?.getData('text/plain') ?? ''
		prevented = event.defaultPrevented
	}

	window.addEventListener('copy', listen)
	window.addEventListener('cut', listen)

	try {
		await userEvent.keyboard(keys)
	} finally {
		window.removeEventListener('copy', listen)
		window.removeEventListener('cut', listen)
	}

	return { text, prevented }
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	document.getSelection()?.removeAllRanges()
	cleanup()
})

describe('протяжка мышью', () => {
	/**
	 * Начало протяжки — у самого левого края части. В строчной раскладке Chrome
	 * переносит его в соседний текст — в разделитель или в текст перед полем, —
	 * и выделение начинается не там, где нажали.
	 */
	it('с левого края дня до конца года — вся дата', async () => {
		await show()

		const year = segment('year')

		await drag(segment('day'), 0.5, year, year.getBoundingClientRect().width - 0.5)

		expect(selectedText()).toBe('12.05.2026')
		expect(segment('day').contains(document.getSelection()?.anchorNode ?? null)).toBe(true)
	})

	it('с левого края месяца — месяц и год', async () => {
		await show()

		const year = segment('year')

		await drag(segment('month'), 0.5, year, year.getBoundingClientRect().width - 0.5)

		expect(selectedText()).toBe('05.2026')
	})

	it('справа налево по дате — тоже вся дата', async () => {
		await show()

		const year = segment('year')

		await drag(year, year.getBoundingClientRect().width - 0.5, segment('day'), 0.5)

		expect(selectedText()).toBe('12.05.2026')
	})
})

describe('выделение всей даты', () => {
	it('Ctrl+A выделяет ряд, фокус остаётся на части', async () => {
		await show()

		await userEvent.click(segment('month'))
		await userEvent.keyboard('{Control>}a{/Control}')

		expect(selectedText()).toBe('12.05.2026')
		expect(document.activeElement).toBe(segment('month'))
	})

	it('Ctrl+C кладёт в буфер дату без переводов строк', async () => {
		await show()

		await userEvent.click(segment('day'))
		await userEvent.keyboard('{Control>}a{/Control}')

		// Без перехвата Chrome положил бы «12\n.\n05\n.\n2026»
		expect(document.getSelection()?.toString()).not.toBe('12.05.2026')

		const copied = await clipboardOf('{Control>}c{/Control}')

		expect(copied).toEqual({ text: '12.05.2026', prevented: true })
	})

	it('Ctrl+X кладёт дату в буфер и очищает поле', async () => {
		const ctrl = await show()

		await userEvent.click(segment('day'))
		await userEvent.keyboard('{Control>}a{/Control}')

		const cut = await clipboardOf('{Control>}x{/Control}')

		expect(cut.text).toBe('12.05.2026')
		expect(ctrl.value).toBeUndefined()
		await expect.poll(() => segment('year').dataset.placeholder).toBe('true')
	})

	it('протянутое мышью копируется тем же текстом', async () => {
		await show()

		const year = segment('year')

		await drag(segment('month'), 0.5, year, year.getBoundingClientRect().width - 0.5)

		expect(await clipboardOf('{Control>}c{/Control}')).toEqual({
			text: '05.2026',
			prevented: true,
		})
	})

	it('цифра по выделенной дате набирается в первую часть', async () => {
		const ctrl = await show()

		await userEvent.click(segment('year'))
		await userEvent.keyboard('{Control>}a{/Control}')
		await userEvent.keyboard('4')

		// «4» — день набран: к нему не дописать ни одной цифры, фокус ушёл дальше
		await expect.poll(() => segment('day').textContent).toBe('04')
		expect(ctrl.value).toBeUndefined()
		expect(document.activeElement).toBe(segment('month'))
		expect(document.getSelection()?.isCollapsed).toBe(true)
	})
})

describe('контекстное меню и вставка', () => {
	it('над рядом ряд становится редактируемым, клавиша и нажатие возвращают его', async () => {
		await show()

		await userEvent.click(segment('day'), { button: 'right' })
		expect(row().getAttribute('contenteditable')).toBe('true')

		await userEvent.keyboard('{Escape}')
		expect(row().hasAttribute('contenteditable')).toBe(false)

		await userEvent.click(segment('day'), { button: 'right' })
		await userEvent.click(segment('month'))
		expect(row().hasAttribute('contenteditable')).toBe(false)
	})

	it('вставка в часть заменяет всю дату', async () => {
		const ctrl = await show()

		await userEvent.click(segment('month'))

		const data = new DataTransfer()

		data.setData('text/plain', '01.06.2027')

		const event = new ClipboardEvent('paste', {
			clipboardData: data,
			bubbles: true,
			cancelable: true,
		})

		segment('month').dispatchEvent(event)

		expect(event.defaultPrevented).toBe(true)
		expect(ctrl.value).toBe('2027-06-01')
		await expect.poll(() => segment('day').textContent).toBe('01')
	})
})

describe('клавиши и фокус', () => {
	it('набор переводит фокус на следующую часть, когда дописывать некуда', async () => {
		const ctrl = await show({ value: undefined })

		await userEvent.click(segment('day'))
		await userEvent.keyboard('12')
		expect(document.activeElement).toBe(segment('month'))

		await userEvent.keyboard('052026')
		expect(ctrl.value).toBe('2026-05-12')
		expect(document.activeElement).toBe(segment('year'))
	})

	it('у каждой части своя остановка Tab', async () => {
		await show()

		find('.s-test-after').focus()
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
		expect(document.activeElement).toBe(segment('year'))

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
		expect(document.activeElement).toBe(segment('month'))
	})

	it('ar-EG: ряд справа налево, ← ведёт к следующей части формата', async () => {
		await show({ locale: 'ar-EG' })

		// День — первая часть формата — стоит у правого края ряда
		expect(segment('day').getBoundingClientRect().left).toBeGreaterThan(
			segment('month').getBoundingClientRect().left,
		)

		await userEvent.click(segment('day'))
		await userEvent.keyboard('{ArrowLeft}')
		expect(document.activeElement).toBe(segment('month'))

		await userEvent.keyboard('{ArrowRight}')
		expect(document.activeElement).toBe(segment('day'))
	})

	it('he-IL на странице справа налево: цифры слева направо', async () => {
		await show({ locale: 'he-IL' }, {}, 'rtl')

		expect(row().getAttribute('dir')).toBe('ltr')
		expect(segment('day').getBoundingClientRect().left).toBeLessThan(
			segment('year').getBoundingClientRect().left,
		)
	})
})

describe('время', () => {
	it('en-US: час и минута цифрами, буква — период суток, фокус идёт по частям', async () => {
		const ctrl = await show({ locale: 'en-US', kind: 'datetime', value: undefined })

		await userEvent.click(segment('month'))
		await userEvent.keyboard('05122026')
		expect(document.activeElement).toBe(segment('hour'))

		await userEvent.keyboard('0230')
		expect(document.activeElement).toBe(segment('dayPeriod'))
		expect(ctrl.value).toBeUndefined()

		await userEvent.keyboard('p')
		expect(ctrl.value).toBe('2026-05-12T14:30')

		await userEvent.keyboard('{ArrowDown}')
		expect(ctrl.value).toBe('2026-05-12T02:30')
		await expect.poll(() => segment('hour').textContent).toBe('02')
	})

	it('ru: 24 часа, ←/→ ходят из даты во время', async () => {
		const ctrl = await show({ kind: 'datetime', value: '2026-05-12T14:30' })

		await userEvent.click(segment('year'))
		await userEvent.keyboard('{ArrowRight}')
		expect(document.activeElement).toBe(segment('hour'))

		await userEvent.keyboard('09')
		expect(ctrl.value).toBe('2026-05-12T09:30')
		expect(document.activeElement).toBe(segment('minute'))
	})

	it('дата и время — один ряд в строку', async () => {
		await show({ locale: 'en-US', kind: 'datetime', value: '2026-05-12T14:30' })

		const tops = [...document.querySelectorAll('.s-date-input__segment')].map(
			(node) => node.getBoundingClientRect().top,
		)

		expect(new Set(tops).size).toBe(1)
	})

	it('Ctrl+A и Ctrl+C — дата со временем текстом поля, без переводов строк', async () => {
		await show({ kind: 'datetime', value: '2026-05-12T14:30' })

		await userEvent.click(segment('hour'))
		await userEvent.keyboard('{Control>}a{/Control}')

		expect(await clipboardOf('{Control>}c{/Control}')).toEqual({
			text: row().textContent,
			prevented: true,
		})
		expect(row().textContent).toBe('12.05.2026, 14:30')
	})
})

describe('сенсорный режим', () => {
	/** Селектор части — касание ищет узел в рамке теста. */
	const part = (type: string) => `.s-date-input__segment[data-type="${type}"]`

	it('касание делает части редактируемыми ещё до фокуса, каретка — в части', async () => {
		await show()

		// Экранная клавиатура открывается, только если узел под фокусом уже
		// редактируемый: фокус браузер переводит после конца касания
		const focused: boolean[] = []

		segment('day').addEventListener('focusin', () =>
			focused.push(segment('day').isContentEditable),
		)

		await commands.tap(part('day'))

		await expect.poll(() => focused).toEqual([true])
		expect(segment('year').getAttribute('inputmode')).toBe('numeric')
		expect(document.activeElement).toBe(segment('day'))
		expect(segment('day').contains(document.getSelection()?.anchorNode ?? null)).toBe(true)
	})

	it('ввод без клавиш набирает дату, фокус идёт по частям за ядром', async () => {
		const ctrl = await show({ value: undefined })

		await commands.tap(part('day'))
		await commands.insertText('1')
		await commands.insertText('2')
		await expect.poll(() => document.activeElement).toBe(segment('month'))

		// Ввод доходит до части, куда фокус перевёл скрипт, а не остаётся в дне
		await commands.insertText('0')
		await commands.insertText('5')
		await commands.insertText('2026')

		await expect.poll(() => ctrl.value).toBe('2026-05-12')
		expect(segment('day').textContent).toBe('12')
		expect(segment('year').textContent).toBe('2026')
	})

	it('двойное касание выделяет часть, ввод заменяет её: ряд ради меню не правится', async () => {
		const ctrl = await show()

		await commands.tap(part('month'), 2)

		// Двойное касание — выделение слова и контекстное меню. Часть уже
		// редактируемая, и меню над ней — меню правки: ряд редактируемым не
		// становится, а ввод идёт в часть, а не в погашенную правку ряда
		await expect.poll(() => selectedText()).toBe('05')
		expect(row().hasAttribute('contenteditable')).toBe(false)

		await commands.insertText('7')

		await expect.poll(() => ctrl.value).toBe('2026-07-12')
		expect(document.activeElement).toBe(segment('year'))
	})

	it('композиция: набранное в ней — в ядро, часть показывает текст ядра', async () => {
		const ctrl = await show({ value: '2026-01-12' })

		await commands.tap(part('month'))
		await commands.compose('０')
		await commands.compose('０５')
		await commands.insertText('０５')

		await expect.poll(() => ctrl.value).toBe('2026-05-12')
		expect(segment('month').textContent).toBe('05')
	})

	it('композиция не цифр — в части остаётся текст ядра', async () => {
		const ctrl = await show()

		await commands.tap(part('month'))
		await commands.compose('あ')
		await commands.insertText('あ')

		await expect.poll(() => segment('month').textContent).toBe('05')
		expect(segment('month').childNodes).toHaveLength(1)
		expect(ctrl.value).toBe('2026-05-12')
	})

	it('после касания мышь снова выделяет дату протяжкой', async () => {
		await show()

		await commands.tap(part('day'))
		await expect.poll(() => segment('day').getAttribute('contenteditable')).toBe('true')

		const year = segment('year')

		await drag(segment('day'), 0.5, year, year.getBoundingClientRect().width - 0.5)

		expect(segment('day').hasAttribute('contenteditable')).toBe(false)
		expect(selectedText()).toBe('12.05.2026')
	})
})

describe('нажатие мимо частей', () => {
	it('справа от даты — фокус на ближайшую часть, слева — на первую', async () => {
		await show({}, { style: 'width: 320px' })

		const root = find('.s-date-input')
		const box = root.getBoundingClientRect()

		await userEvent.click(root, { position: { x: box.width - 8, y: box.height / 2 } })
		expect(document.activeElement).toBe(segment('year'))

		await userEvent.click(root, { position: { x: 2, y: box.height / 2 } })
		expect(document.activeElement).toBe(segment('day'))
	})

	it('протяжка с пустого места поля выделяет дату', async () => {
		await show({}, { style: 'width: 320px' })

		const root = find('.s-date-input')
		const year = segment('year')
		const { height } = root.getBoundingClientRect()

		await userEvent.hover(root, { position: { x: 2, y: height / 2 } })
		await commands.mouseDown()

		try {
			await userEvent.hover(year, {
				position: at(year, year.getBoundingClientRect().width - 0.5),
			})
		} finally {
			await commands.mouseUp()
		}

		expect(selectedText()).toBe('12.05.2026')
	})
})

/**
 * Год ядро пишет как есть, без нулей впереди, — место под его четыре цифры
 * держит тема. Без него поле росло на цифру с каждой набранной цифрой года.
 * Цифры других систем (`ar-EG`) и ширина пустой части здесь не сверяются:
 * место считается в `ch`, по латинскому нулю шрифта, а они рисуются своими
 * глифами, и совпадение зависит от шрифта машины прогона.
 */
describe('ширина поля', () => {
	/**
	 * Ширина корня поля. Раскладка субпиксельная, поэтому сверка — с допуском в
	 * долю пикселя. Рост, который сторожится, крупнее: цифра года или два поля
	 * части, если место их не учло, — по пикселю на `normal`.
	 */
	const fieldWidth = () => find('.s-date-input').getBoundingClientRect().width

	it('набор года по одной цифре ширину поля не меняет', async () => {
		await show({ value: undefined })

		await userEvent.click(segment('day'))
		await userEvent.keyboard('1205')
		expect(document.activeElement).toBe(segment('year'))

		// Год ядро пишет как есть: «2», «20», «202», «2026»
		const widths: number[] = []
		let typed = ''

		for (const digit of '2026') {
			await userEvent.keyboard(digit)
			typed += digit
			await expect.poll(() => segment('year').textContent).toBe(typed)
			widths.push(fieldWidth())
		}

		for (const width of widths) expect(width).toBeCloseTo(widths[0], 0)
	})

	it('год 99 занимает в поле столько же места, сколько 2026', async () => {
		const ctrl = await show()
		const full = fieldWidth()

		ctrl.value = '0099-05-12'
		await expect.poll(() => segment('year').textContent).toBe('99')

		expect(fieldWidth()).toBeCloseTo(full, 0)
	})

	// Подсказка шире цифр: у ru «мм» шире «01», у en-US «mm» шире «12». Ширину
	// держит минимум ряда: текст внутри сдвигается, корень — нет.
	for (const [locale, keys] of [
		['ru-RU', '11012026'],
		['en-US', '12112026'],
		['lt-LT', '20261211'],
	] as const) {
		it(`${locale}: с пустого поля до собранной даты корень не меняет ширину`, async () => {
			await show({ locale, value: undefined })
			const empty = fieldWidth()
			const first = document.querySelector('.s-date-input__segment')

			if (!(first instanceof HTMLElement)) throw new Error('части нет')

			await userEvent.click(first)

			for (const key of keys) {
				await userEvent.keyboard(key)
				await nextTick()
				expect(fieldWidth(), `после «${key}»`).toBeCloseTo(empty, 0)
			}
		})
	}

	it('поле со временем: пустое и набранное — одной ширины', async () => {
		const ctrl = await show({ locale: 'en-US', kind: 'datetime', value: undefined })
		const empty = fieldWidth()

		ctrl.value = '2026-12-28T20:59'
		await nextTick()

		expect(fieldWidth()).toBeCloseTo(empty, 0)
	})
})
