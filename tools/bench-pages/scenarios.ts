/**
 * Сценарии страниц — что делает пользователь с компонентом: нажать, набрать,
 * открыть и закрыть оверлей, выбрать, прокрутить. Общие для всех фреймворков:
 * превью хостов одни, и разметка частей у всех одна (классы `so-*`).
 *
 * Сценарий действует на первые `act` копий страницы и возвращает, сколько
 * действий сделал. События — из скрипта страницы, полной цепочкой указателя
 * (`pointerdown` … `click`): плагины слушают и нажатие, и клик. Набор —
 * `insertText`, как вставляет его браузер (`beforeinput` и `input`).
 */
export type TScenario = (scope: HTMLElement, act: number) => Promise<number>

export function frame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export async function frames(count = 2): Promise<void> {
	for (let index = 0; index < count; index++) await frame()
}

export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Событие указателя в центре узла. */
export function pointer(element: Element, type: string, at = 0.5): void {
	const box = element.getBoundingClientRect()
	const init: PointerEventInit = {
		bubbles: true,
		cancelable: true,
		composed: true,
		pointerId: 1,
		pointerType: 'mouse',
		isPrimary: true,
		button: 0,
		buttons: type === 'pointerdown' || type === 'mousedown' ? 1 : 0,
		clientX: box.left + box.width * at,
		clientY: box.top + box.height / 2,
	}

	element.dispatchEvent(
		type.startsWith('mouse') ? new MouseEvent(type, init) : new PointerEvent(type, init),
	)
}

/** Нажатие мышью: указатель, фокус и клик, как у настоящего нажатия. */
export async function press(element: Element | null | undefined, at = 0.5): Promise<number> {
	if (!(element instanceof HTMLElement)) return 0

	pointer(element, 'pointerdown', at)
	pointer(element, 'mousedown', at)
	element.focus({ preventScroll: true })
	pointer(element, 'pointerup', at)
	pointer(element, 'mouseup', at)
	element.click()
	await frames()

	return 1
}

/** Клавиша на узле: `keydown` и `keyup`. */
export async function key(element: Element | null | undefined, name: string): Promise<number> {
	if (!element) return 0

	const init: KeyboardEventInit = { key: name, bubbles: true, cancelable: true, composed: true }

	element.dispatchEvent(new KeyboardEvent('keydown', init))
	element.dispatchEvent(new KeyboardEvent('keyup', init))
	await frames()

	return 1
}

/**
 * Escape — узлу под фокусом, как с клавиатуры. Фокус ушёл из открытой панели
 * — самой панели: Escape слушает слой, а не документ.
 */
export function escape(panel?: HTMLElement | null): Promise<number> {
	const focused = document.activeElement

	return key(panel && !panel.contains(focused) ? panel : (focused ?? document.body), 'Escape')
}

/** Набор в поле: фокус и вставка текста, потом уход фокуса. */
export async function type(element: Element | null | undefined, text: string): Promise<number> {
	if (!(element instanceof HTMLElement)) return 0

	element.focus({ preventScroll: true })
	document.execCommand('insertText', false, text)
	await frames()
	element.blur()

	return 1
}

/** Первые `act` узлов по селектору — у каждой копии свой. */
export function first<T extends Element = HTMLElement>(
	scope: Element,
	selector: string,
	act: number,
): T[] {
	return [...scope.querySelectorAll<T>(selector)].slice(0, act)
}

/** Открытая панель слоя по классу — их телепортирует слой в конец документа. */
export function open(selector: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`${selector}[data-open="true"]`)
}

/** Нажать кнопку с подписью внутри узла. */
export function button(scope: Element, text: string): HTMLElement | undefined {
	return [...scope.querySelectorAll<HTMLElement>('.so-button')].find(
		(node) => node.textContent?.trim() === text,
	)
}

/** Первые `act` кнопок с подписью — по кнопке у каждой копии. */
export function labelled(scope: Element, text: string, act: number): HTMLElement[] {
	return [...scope.querySelectorAll<HTMLElement>('.so-button')]
		.filter((node) => node.textContent?.trim() === text)
		.slice(0, act)
}

/** Сценарий на каждую из `act` копий: сумма действий. */
export function each(selector: string, run: (copy: HTMLElement) => Promise<number>): TScenario {
	return async (scope, act) => {
		let done = 0

		for (const copy of first(scope, selector, act)) done += await run(copy)

		return done
	}
}

/** Открыть оверлей кнопкой, сделать внутри и закрыть Escape. */
export async function overlay(
	opener: Element | null | undefined,
	panel: string,
	inside?: (node: HTMLElement) => Promise<number>,
): Promise<number> {
	let done = await press(opener)

	await frames()

	const node = open(panel)

	if (node && inside) done += await inside(node)

	done += await escape(node)

	return done
}

export const SCENARIOS: Record<string, TScenario> = {
	button: each('.so-button', press),
	input: each('.so-input input', (field) => type(field, 'abc')),
	'number-input': each('.so-number-input', async (copy) => {
		const field = copy.querySelector('input.so-number-input__input')
		let done = await key(field, 'ArrowUp')

		done += await press(copy.querySelector('.so-number-input__increment'))
		done += await type(field, '7')

		return done
	}),
	textarea: each('.so-textarea textarea', (field) => type(field, 'abc')),
	'check-box': each('.so-label', press),
	switch: each('.so-label', press),
	label: each('.so-label', press),
	field: each('.so-field input', (field) => type(field, 'name@example.com')),
	slider: each('.so-slider__track', (track) => press(track, 0.7)),
	rating: each('.so-rating', (copy) => press(copy.querySelectorAll('.so-rating__star')[3])),
	'radio-group': each('.so-radio-group', async (copy) => {
		const items = copy.querySelectorAll('.so-radio-group-item')

		return (await press(items[1])) + (await press(items[2]))
	}),
	// Поле с вводом (`editable` превью): панель открывает стрелка и набор
	select: each('.so-select', async (copy) => {
		const arrow = copy.querySelector('.so-select__arrow')
		let done = await press(arrow)

		await frames()
		done += await press(open('.so-select__panel')?.querySelector('[role="option"]'))
		done += await overlay(arrow, '.so-select__panel')
		done += await type(copy.querySelector('.so-select__field input'), 'Вт')

		return done
	}),
	calendar: each('.so-calendar', async (copy) => {
		let done = await press(copy.querySelectorAll('.so-calendar-item')[4])

		done += await press(copy.querySelector('.so-calendar__next'))
		done += await overlay(copy.querySelector('.so-calendar__title'), '.so-popover__panel')

		return done
	}),
	'date-input': each('.so-date-input', async (copy) => {
		const segment = copy.querySelector('.so-date-input__segment')
		let done = 0

		for (const digit of ['1', '0']) done += await key(segment, digit)

		done += await key(segment, 'ArrowUp')

		return done
	}),
	'date-picker': each('.so-date-picker', async (copy) => {
		const trigger = copy.querySelector('.so-date-picker__trigger')
		let done = await press(trigger)

		await frames()
		done += await press(
			open('.so-date-picker__panel')?.querySelectorAll('.so-calendar-item')[9],
		)
		done += await overlay(trigger, '.so-date-picker__panel')

		return done
	}),
	popover: each('.so-popover', (copy) =>
		overlay(copy.querySelector('.so-button'), '.so-popover__panel'),
	),
	menu: each('.so-menu', async (copy) => {
		const trigger = copy.querySelector('.so-button')
		let done = await overlay(trigger, '.so-menu__panel', (panel) =>
			press(panel.querySelector('[role="menuitemcheckbox"]')),
		)

		done += await press(trigger)
		await frames()
		done += await press(open('.so-menu__panel')?.querySelector('[role="menuitem"]'))

		return done
	}),
	tooltip: async (scope, act) => {
		const triggers = first(scope, '.so-tooltip .so-button', act)
		let done = 0

		// Наведение — с задержкой открытия (400 мс), на первой копии; на
		// остальных — фокус, он открывает сразу
		const hovered = triggers[0]

		if (hovered) {
			pointer(hovered, 'pointerenter')
			await wait(450)
			await frames()
			pointer(hovered, 'pointerleave')
			done += 1
		}

		for (const trigger of triggers) {
			trigger.focus({ preventScroll: true })
			await frames(3)
			trigger.blur()
			done += 1
		}

		await frames()

		return done
	},
	dialog: async (scope, act) => {
		let done = 0

		for (const opener of labelled(scope, 'Открыть окно', act)) {
			done += await overlay(opener, '.so-dialog', (panel) =>
				type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	drawer: async (scope, act) => {
		let done = 0

		for (const opener of labelled(scope, 'Открыть панель', act)) {
			done += await overlay(opener, '.so-drawer', (panel) =>
				type(panel.querySelector('input'), 'Анна'),
			)
		}

		return done
	},
	toasts: async (scope, act) => {
		let done = 0

		for (const copy of labelled(scope, 'обычное', act).map((node) => node.parentElement)) {
			if (!copy) continue

			for (const text of ['обычное', 'success', 'загрузка → готово']) {
				done += await press(button(copy, text))
			}
		}

		return done
	},
	scroller: each('.so-scroller', async (copy) => {
		const viewport = copy.querySelector('.so-scroller__viewport')

		viewport?.scrollBy({ left: 200 })
		await frames()

		return (await press(copy.querySelector('.so-scroller__prev'))) + 1
	}),
	'list-box': each('.so-list-box', async (copy) => {
		const options = copy.querySelectorAll('[role="option"]')

		return (await press(options[1])) + (await press(options[3]))
	}),
	pagination: each('.so-pagination', async (copy) => {
		let done = await press(copy.querySelector('.so-pagination__next'))

		done += await press(button(copy, '1'))

		return done
	}),
	table: each('.so-table', async (copy) => {
		const sort = copy.querySelector('.so-table-column__sort')
		let done = (await press(sort)) + (await press(sort))

		done += await press(copy.querySelector('.so-table-row__cell'))

		return done
	}),
	tabs: each('.so-tabs', async (copy) => {
		const tabs = copy.querySelectorAll('[role="tab"]')

		return (await press(tabs[1])) + (await press(tabs[2]))
	}),
	tags: each('.so-tags', async (copy) => {
		const tags = copy.querySelectorAll('[role="listitem"]')

		return (await press(tags[1])) + (await key(tags[1], 'ArrowRight'))
	}),
	accordion: each('.so-accordion', async (copy) => {
		const headers = copy.querySelectorAll('.so-accordion-item__header')

		return (await press(headers[0])) + (await press(headers[1]))
	}),
	'drag-and-drop': each('.so-tabs', (copy) => press(copy.querySelectorAll('[role="tab"]')[2])),
	virtual: async (scope, act) => {
		let done = 0

		for (const list of first(scope, '.so-list-box__list', act)) {
			// Прокручивает предок окна: ближайший со своей прокруткой
			let scroller: HTMLElement | null = list

			while (scroller && scroller.scrollHeight <= scroller.clientHeight) {
				scroller = scroller.parentElement
			}

			if (!scroller || scroller === document.documentElement) continue

			scroller.scrollTop = scroller.scrollHeight
			await frames(3)
			scroller.scrollTop = 0
			await frames(3)
			done += 1
		}

		return done
	},
}
