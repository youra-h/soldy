/**
 * Dialog во Vue — проводка целиком, на настоящей разметке.
 *
 * Модель проверяет ядро (`core/__tests__/dialog.spec.ts`), правила фокуса и
 * нажатия мимо — плагины; здесь важно, что они сходятся: окно телепортировано
 * целиком, подложка — сосед панели с тем же слоем, панель помечена владельцем,
 * кнопки шапки говорят с ядром, три причины закрытия проходят через запрос, а
 * окно поверх окна и Select внутри закрывают только свой слой.
 *
 * Раскладку и действие `mousedown` jsdom не выполняет: место, размер и то,
 * что нажатие по подложке не уносит фокус, — `playground/vue/browser/dialog.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type Ref, type VNode } from 'vue'
import { Dialog, Select, SelectItem } from '@soldy-ui/vue'
import { TDialog } from '@soldy-ui/core'
import type { IDialogProps, TCloseEvent, TCloseReason } from '@soldy-ui/core'
import * as material from '@soldy-ui/icons-material'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, scope: ParentNode = document): HTMLElement {
	const element = scope.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const panel = (scope: ParentNode = document) => find('.s-dialog', scope)
const backdrop = (scope: ParentNode = document) => find('.s-dialog__backdrop', scope)
const isOpen = (element: HTMLElement = panel()) => element.style.display !== 'none'
const opener = () => find('.s-test-opener')

/** Нажатие мимо — `pointerdown`, как его слушает плагин оверлея. */
const pointerDown = (target: Element) =>
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))

/** Клавиша на элементе под фокусом. Отдаёт событие: по нему видно, погашена ли она. */
function press(key: string, options: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options })

	;(document.activeElement ?? document.body).dispatchEvent(event)

	return event
}

/** Содержимое окна с двумя остановками Tab. */
const inside = () => [
	h('button', { class: 's-test-first' }, 'Первая'),
	h('button', { class: 's-test-second' }, 'Вторая'),
]

type TPageOptions = {
	props?: Partial<IDialogProps> & Record<string, unknown>
	content?: () => VNode | VNode[]
	slots?: Record<string, () => VNode | VNode[] | string>
}

/**
 * Страница с кнопкой, которая открывает окно, и само окно на `v-model:visible`.
 * Отдаёт открытость: её пишет и тест, и окно (`update:visible`).
 */
async function render({ props = {}, content = inside, slots = {} }: TPageOptions = {}): Promise<
	Ref<boolean>
> {
	const shown = ref(false)

	wrapper = mount(
		defineComponent({
			render: () =>
				h('div', [
					h('button', { class: 's-test-opener' }, 'Открыть'),
					h(
						Dialog,
						{
							...props,
							visible: shown.value,
							'onUpdate:visible': (value: boolean) => {
								shown.value = value
							},
						},
						{ title: () => 'Настройки', default: content, ...slots },
					),
				]),
		}),
		{ attachTo: document.body },
	)

	await settle()

	return shown
}

/** Рендер и кадр: корень плагины получают через `requestAnimationFrame`, фокус уходит кадром позже. */
async function settle(): Promise<void> {
	await nextTick()
	await nextFrame()
}

/** Открыть окно с кнопки страницы и дождаться, пока фокус уйдёт в окно. */
async function open(shown: Ref<boolean>): Promise<void> {
	opener().focus()
	shown.value = true

	await settle()
}

describe('разметка', () => {
	it('окно телепортировано целиком: подложка и панель — соседи в body, подложка раньше', async () => {
		await render()

		expect(panel().parentElement).toBe(document.body)
		expect(backdrop().parentElement).toBe(document.body)
		expect(backdrop().nextElementSibling).toBe(panel())
		expect(panel().contains(backdrop())).toBe(false)
	})

	it('закрытое окно спрятано вместе с подложкой, а не размонтировано', async () => {
		await render()

		expect(isOpen()).toBe(false)
		expect(isOpen(backdrop())).toBe(false)
		expect(document.querySelector('.s-test-first')).not.toBeNull()
	})

	it('панель — модальный диалог, имя — заголовок', async () => {
		await render()

		const title = find('.s-dialog__title')

		expect(panel().getAttribute('role')).toBe('dialog')
		expect(panel().getAttribute('aria-modal')).toBe('true')
		expect(panel().getAttribute('tabindex')).toBe('-1')
		expect(panel().getAttribute('aria-labelledby')).toBe(title.id)
		expect(title.textContent).toBe('Настройки')
		expect(panel().hasAttribute('aria-describedby')).toBe(false)
	})

	it('предупреждение — alertdialog, описание — тело окна', async () => {
		await render({ props: { alert: true } })

		const body = find('.s-dialog__body')

		expect(panel().getAttribute('role')).toBe('alertdialog')
		expect(panel().getAttribute('aria-describedby')).toBe(body.id)
		expect(body.contains(find('.s-test-first'))).toBe(true)
	})

	it('слоты — по местам: заголовок, тело, подвал', async () => {
		await render({ slots: { footer: () => h('button', { class: 's-test-ok' }, 'Готово') } })

		expect(find('.s-dialog__title').textContent).toBe('Настройки')
		expect(find('.s-dialog__body').contains(find('.s-test-first'))).toBe(true)
		expect(find('.s-dialog__footer').contains(find('.s-test-ok'))).toBe(true)
	})

	it('место — модификатором, по умолчанию центр; развёрнутость — data-maximized', async () => {
		await render({ props: { placement: 'end' } })

		expect(panel().classList).toContain('s-dialog--placement-end')
		expect(panel().dataset.maximized).toBe('false')
	})

	it('размер — переменными темы, не инлайном', async () => {
		await render({ props: { width: 480, height: '60vh' } })

		expect(panel().style.getPropertyValue('--dialog-width')).toBe('480px')
		expect(panel().style.getPropertyValue('--dialog-height')).toBe('60vh')
		expect(panel().style.width).toBe('')
	})

	it('незаданный размер переменной не даёт: умолчание — у темы', async () => {
		await render()

		expect(panel().style.getPropertyValue('--dialog-width')).toBe('')
		expect(panel().style.getPropertyValue('--dialog-height')).toBe('')
	})

	it('открытое: панель и подложка в одном слое — z-index и data-layer одни', async () => {
		const shown = await render()

		await open(shown)

		const layer = panel().dataset.layer

		expect(layer).toMatch(/^\d+$/)
		expect(backdrop().dataset.layer).toBe(layer)
		expect(panel().style.zIndex).toBe(layer)
		expect(backdrop().style.zIndex).toBe(layer)
	})

	it('панель помечена владельцем, подложка — нет: для окна она мимо', async () => {
		await render()

		expect(panel().dataset.owner).toMatch(/^\d+$/)
		expect(backdrop().hasAttribute('data-owner')).toBe(false)
	})

	it('атрибуты и события потребителя — на панели, а не в телепорте', async () => {
		const onClick = vi.fn()

		await render({ props: { class: 's-test-mine', 'data-test': 'x', onClick } })

		expect(panel().classList).toContain('s-test-mine')
		expect(panel().classList).toContain('s-dialog')
		expect(panel().dataset.test).toBe('x')

		panel().click()

		expect(onClick).toHaveBeenCalledTimes(1)
	})

	it('target меняет место телепорта', async () => {
		const host = document.createElement('div')

		host.id = 's-test-host'
		document.body.appendChild(host)

		await render({ props: { target: '#s-test-host' } })

		expect(panel().parentElement).toBe(host)
		expect(backdrop().parentElement).toBe(host)
	})
})

describe('кнопки шапки', () => {
	it('крестик назван closeLabel, closable: false его убирает из DOM', async () => {
		await render({ props: { closeLabel: 'Закрыть' } })

		expect(find('.s-dialog__close').getAttribute('aria-label')).toBe('Закрыть')

		wrapper?.unmount()
		document.body.innerHTML = ''

		await render({ props: { closable: false } })

		expect(document.querySelector('.s-dialog__close')).toBeNull()
	})

	it('кнопки разворота по умолчанию нет, maximizable её рисует', async () => {
		await render()

		expect(document.querySelector('.s-dialog__maximize')).toBeNull()

		wrapper?.unmount()
		document.body.innerHTML = ''

		await render({ props: { maximizable: true, maximizeLabel: 'Развернуть' } })

		const button = find('.s-dialog__maximize')

		expect(button.getAttribute('aria-label')).toBe('Развернуть')
		expect(button.getAttribute('aria-pressed')).toBe('false')
	})

	it('разворот переключает maximized: data-maximized, aria-pressed и иконка', async () => {
		const dialog = new TDialog()
		const shown = await render({ props: { ctrl: dialog, maximizable: true } })

		await open(shown)

		const button = find('.s-dialog__maximize')
		/** Контур значка кнопки — сравнивается с контуром роли в пакете. */
		const iconPath = () => button.querySelector('svg path')?.getAttribute('d')
		const pathOf = (body: string) => /d="([^"]+)"/.exec(body)?.[1]

		expect(iconPath()).toBe(pathOf(material.arrowsOutward.body))

		button.click()
		await nextTick()

		expect(dialog.maximized).toBe(true)
		expect(panel().dataset.maximized).toBe('true')
		expect(button.getAttribute('aria-pressed')).toBe('true')
		expect(iconPath()).toBe(pathOf(material.arrowsInward.body))

		button.click()
		await nextTick()

		expect(panel().dataset.maximized).toBe('false')
		expect(iconPath()).toBe(pathOf(material.arrowsOutward.body))
	})

	it('разворот виден v-model: update:maximized на каждый клик', async () => {
		const shown = await render({ props: { maximizable: true } })

		await open(shown)

		find('.s-dialog__maximize').click()
		await nextTick()

		expect(wrapper?.findComponent(Dialog).emitted('update:maximized')).toEqual([[true]])
	})
})

describe('закрытие пользователем', () => {
	/** Причины закрытия, которые видел подписчик `close:before`. */
	const recorder = () => {
		const reasons: TCloseReason[] = []

		return {
			reasons,
			'onClose:before': (event: TCloseEvent) => {
				reasons.push(event.reason)
			},
		}
	}

	it('крестик — причина button, фокус возвращается туда, откуда открыли', async () => {
		const { reasons, ...listener } = recorder()
		const shown = await render({ props: listener })

		await open(shown)

		expect(document.activeElement).toBe(find('.s-test-first'))

		find('.s-dialog__close').click()
		await nextTick()

		expect(reasons).toEqual(['button'])
		expect(shown.value).toBe(false)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(opener())
	})

	it('Escape — причина escape, клавиша погашена', async () => {
		const { reasons, ...listener } = recorder()
		const shown = await render({ props: listener })

		await open(shown)

		const event = press('Escape')

		await nextTick()

		expect(event.defaultPrevented).toBe(true)
		expect(reasons).toEqual(['escape'])
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(opener())
	})

	it('нажатие по подложке — причина outside, фокус возвращается', async () => {
		const { reasons, ...listener } = recorder()
		const shown = await render({ props: listener })

		await open(shown)

		pointerDown(backdrop())
		await nextTick()

		expect(reasons).toEqual(['outside'])
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(opener())
	})

	it('нажатие в окно его не закрывает', async () => {
		const shown = await render()

		await open(shown)

		pointerDown(find('.s-test-second'))
		await nextTick()

		expect(isOpen()).toBe(true)
	})

	it('отмена close:before оставляет окно открытым', async () => {
		const shown = await render({
			props: { 'onClose:before': (event: TCloseEvent) => event.preventDefault() },
		})

		await open(shown)

		find('.s-dialog__close').click()
		press('Escape')
		pointerDown(backdrop())
		await nextTick()

		expect(shown.value).toBe(true)
		expect(isOpen()).toBe(true)
	})

	describe('dismissible: false', () => {
		it('подложка и Escape окно не закрывают и close:before не шлют', async () => {
			const { reasons, ...listener } = recorder()
			const shown = await render({ props: { dismissible: false, ...listener } })

			await open(shown)

			pointerDown(backdrop())
			press('Escape')
			await nextTick()

			expect(reasons).toEqual([])
			expect(isOpen()).toBe(true)
		})

		it('крестик закрывает', async () => {
			const shown = await render({ props: { dismissible: false } })

			await open(shown)

			find('.s-dialog__close').click()
			await nextTick()

			expect(isOpen()).toBe(false)
		})
	})
})

describe('открытость — visible и v-model', () => {
	it('visible из шаблона открывает и закрывает, программное закрытие — без close:before', async () => {
		const onCloseBefore = vi.fn()
		const shown = await render({ props: { 'onClose:before': onCloseBefore } })

		await open(shown)

		expect(isOpen()).toBe(true)
		expect(isOpen(backdrop())).toBe(true)
		expect(document.activeElement).toBe(find('.s-test-first'))

		shown.value = false
		await settle()

		expect(isOpen()).toBe(false)
		expect(isOpen(backdrop())).toBe(false)
		expect(onCloseBefore).not.toHaveBeenCalled()
		expect(document.activeElement).toBe(opener())
	})

	it('открытие и закрытие пользователем видит v-model: update:visible', async () => {
		const shown = await render()

		await open(shown)
		press('Escape')
		await nextTick()

		expect(shown.value).toBe(false)
		expect(wrapper?.findComponent(Dialog).emitted('update:visible')).toEqual([[true], [false]])
	})

	it('visible из инстанса открывает так же, как из шаблона', async () => {
		const dialog = new TDialog()

		wrapper = mount(Dialog, {
			props: { ctrl: dialog },
			slots: { default: inside },
			attachTo: document.body,
		})

		await settle()

		dialog.visible = true
		await settle()

		expect(isOpen()).toBe(true)
		expect(document.activeElement).toBe(find('.s-test-first'))
	})
})

describe('окно поверх окна', () => {
	/** Нижнее окно, из которого открыто верхнее. */
	async function renderNested() {
		const lower = ref(false)
		const upper = ref(false)

		wrapper = mount(
			defineComponent({
				render: () =>
					h('div', [
						h('button', { class: 's-test-opener' }, 'Открыть'),
						h(
							Dialog,
							{
								class: 's-test-lower',
								visible: lower.value,
								'onUpdate:visible': (value: boolean) => {
									lower.value = value
								},
							},
							() => [
								h('button', { class: 's-test-lower-first' }, 'Внизу'),
								h(
									Dialog,
									{
										class: 's-test-upper',
										visible: upper.value,
										'onUpdate:visible': (value: boolean) => {
											upper.value = value
										},
									},
									() => h('button', { class: 's-test-upper-first' }, 'Наверху'),
								),
							],
						),
					]),
			}),
			{ attachTo: document.body },
		)

		await settle()

		opener().focus()
		lower.value = true
		await settle()

		upper.value = true
		await settle()

		return { lower, upper }
	}

	const backdropOf = (dialog: HTMLElement) => {
		const previous = dialog.previousElementSibling

		if (!(previous instanceof HTMLElement)) throw new Error('у окна нет подложки')

		return previous
	}

	it('верхнее окно — слоем выше нижнего, его подложка — тоже', async () => {
		await renderNested()

		const lower = Number(find('.s-test-lower').dataset.layer)
		const upper = Number(find('.s-test-upper').dataset.layer)

		expect(upper).toBeGreaterThan(lower)
		expect(backdropOf(find('.s-test-upper')).dataset.layer).toBe(String(upper))
		expect(document.activeElement).toBe(find('.s-test-upper-first'))
	})

	it('нажатие по подложке верхнего закрывает только его', async () => {
		const { lower, upper } = await renderNested()

		pointerDown(backdropOf(find('.s-test-upper')))
		await nextTick()

		expect(upper.value).toBe(false)
		expect(lower.value).toBe(true)
		expect(document.activeElement).toBe(find('.s-test-lower-first'))
	})

	it('Escape в верхнем закрывает только его', async () => {
		const { lower, upper } = await renderNested()

		press('Escape')
		await nextTick()

		expect(upper.value).toBe(false)
		expect(lower.value).toBe(true)
	})

	it('нижнее окно для скринридера спрятано, пока открыто верхнее', async () => {
		const { upper } = await renderNested()

		expect(find('.s-test-lower').getAttribute('aria-hidden')).toBe('true')
		expect(find('.s-test-upper').closest('[aria-hidden="true"]')).toBeNull()

		upper.value = false
		await settle()

		expect(find('.s-test-lower').hasAttribute('aria-hidden')).toBe(false)
	})
})

describe('Select внутри', () => {
	const withSelect = () => [
		h(Select, { class: 's-test-select' }, () => [
			h(SelectItem, { key: 'a', value: 'a', text: 'Первый' }),
			h(SelectItem, { key: 'b', value: 'b', text: 'Второй' }),
		]),
	]

	const field = () => find('.s-test-select input')
	const selectPanel = () => find('.s-select__panel')

	/** Клик мышью целиком: нажатие, фокус от `mousedown`, клик. */
	async function click(target: HTMLElement): Promise<void> {
		pointerDown(target)
		target.focus()
		target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

		await nextTick()
	}

	it('список Select — слоем выше окна: нажатие в него окно не закрывает', async () => {
		const shown = await render({ content: withSelect })

		await open(shown)
		await click(field())
		await nextFrame()

		expect(isOpen(selectPanel())).toBe(true)
		expect(Number(selectPanel().dataset.layer)).toBeGreaterThan(Number(panel().dataset.layer))

		const option = find('.s-select__panel [role="option"]')

		pointerDown(option)
		option.click()
		await nextTick()

		expect(shown.value).toBe(true)
		expect(isOpen()).toBe(true)
	})

	it('Escape в открытом Select закрывает только Select, второй — окно', async () => {
		const shown = await render({ content: withSelect })

		await open(shown)
		await click(field())

		expect(isOpen(selectPanel())).toBe(true)

		press('Escape')
		await nextTick()

		expect(isOpen(selectPanel())).toBe(false)
		expect(shown.value).toBe(true)

		press('Escape')
		await nextTick()

		expect(shown.value).toBe(false)
	})
})

describe('фон под окном', () => {
	it('открытое окно прячет страницу от скринридера и запирает прокрутку', async () => {
		const shown = await render()

		await open(shown)

		expect(opener().closest('[aria-hidden="true"]')).not.toBeNull()
		expect(document.documentElement.style.overflow).toBe('hidden')

		shown.value = false
		await settle()

		expect(opener().closest('[aria-hidden="true"]')).toBeNull()
		expect(document.documentElement.style.overflow).toBe('')
	})
})
