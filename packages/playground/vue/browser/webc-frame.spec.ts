/**
 * `<div is="so-frame">` in a real browser: a move by the base doesn't rebuild.
 *
 * An element lives on DOM callbacks: a moved node is disconnected and
 * connected with everything in it, and the base binds anew on each connection.
 * The base's own moves — the teleport to the target and back, the light into
 * the template — keep the binding: the node moves in one DOM operation without
 * leaving the document. The outcome is checked in both engines. Chromium calls
 * the callbacks within the operation; WebKit has no customized built-ins, and
 * the polyfill calls them from its observer, microtasks later. So each check
 * comes once the callbacks are delivered (`delivered`), and its form is one
 * for both: the synchronous order is guarded by jsdom
 * (`ui/webc/__tests__/frame.spec.ts`).
 *
 * Frame and the button in its panel are assembled once, with the locale of
 * the provider around Frame; the teleport, `contained` and a new target don't
 * rebuild them. A move by the consumer does: of Frame itself in one operation
 * too, and of its place in one operation — a container with the anchor
 * through the document observer, a popover after its own new assembly.
 *
 * Panels on Frame are Popover and Tooltip: their Frame is a detail of the
 * template, the anchor is the element's root. jsdom has no layout, so the
 * open panel's place at the trigger, its size and parts are compared with Vue
 * here: the theme sees the same classes and markup in both.
 *
 * Layers with their own root are Dialog, Drawer and Toasts: the dialog and the
 * drawer go to `body` themselves, with the backdrop companion before them, and
 * the toast region, a root inside `<so-toasts>`, goes without its element.
 * Open, they stand at an edge or the center of the window, and their boxes
 * with the backdrop and parts are compared with Vue from the window's corner.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from './render'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { TButton, TComponentView, TFrame, createEngineToasts } from '@soldy-ui/core'
import { TBasePlugin, ruRU, zhCN, type IPluginContext, type TLocale } from '@soldy-ui/plugins'
import {
	useIcons,
	usePlugins,
	type DescriptorSlots,
	type PopoverDescriptor,
	type TooltipDescriptor,
} from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import {
	Button,
	Dialog,
	Drawer,
	Input,
	Popover,
	Toasts,
	Tooltip,
	type TToastRender,
} from '@soldy-ui/vue'
import {
	TFrameElement,
	TLocaleProviderElement,
	TToastsElement,
	type TFrameElementProps,
	type TToastRender as TElementToastRender,
} from '@soldy-ui/webc'
import {
	BOX,
	DIALOG_PARTS,
	DRAWER_PARTS,
	POPOVER_PARTS,
	TOOLTIP_PARTS,
	measure,
	measureLayer,
	type TBox,
} from './panel-boxes'

import '@soldy-ui/theme-oren'

useIcons(material)

type TPopoverTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']
type TTooltipTriggerScope = DescriptorSlots<typeof TooltipDescriptor>['trigger']

/**
 * The element callbacks of the last DOM operation are delivered: the next
 * task. Chromium calls them within the operation; in WebKit the polyfill of
 * built-ins calls them from its observer, microtasks later, and the
 * teleport's document observer reacts the same way. By the next task every
 * microtask has run, so a rebuild that didn't come by then won't come.
 */
const delivered = () => new Promise<void>((resolve) => setTimeout(resolve))

/** Assemblies: the kind of the component and the locale tag the plugin saw at install. */
const assembled: (readonly [kind: string, locale: string])[] = []

const kindOf = (instance: unknown): string =>
	instance instanceof TFrame ? 'frame' : instance instanceof TButton ? 'button' : 'other'

/** A probe plugin: an assembly installs it into the bundle, once per binding. */
class TAssemblyProbePlugin extends TBasePlugin<TComponentView> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		assembled.push([kindOf(ctx.getInstance()), ctx.locale.locale.tag])
	}
}

/** Locale tags of the assemblies of this kind, one per assembly. */
const assembledOf = (kind: string): string[] =>
	assembled.filter(([each]) => each === kind).map(([, tag]) => tag)

/** The test's nodes, removed after each test. */
const nodes: Element[] = []

let dispose: (() => void) | undefined

afterEach(async () => {
	for (const node of nodes.splice(0)) node.remove()

	// The polyfill disconnects the removed elements later: within this test,
	// not the next one
	await delivered()

	dispose?.()
	dispose = undefined
	assembled.length = 0
})

/**
 * Markup under a provider with this locale, at the end of `body`. The
 * provider gets the locale before the insertion: the elements assemble under it.
 */
function stage(html: string, locale: TLocale): HTMLElement {
	const root = document.createElement('so-locale-provider')

	if (!(root instanceof TLocaleProviderElement)) throw new Error('<so-locale-provider> нет')

	root.innerHTML = html
	root.locale = locale
	document.body.appendChild(root)
	nodes.push(root)

	return root
}

/** A target with `id` at the end of `body`. */
function addTarget(id: string): HTMLElement {
	const target = document.createElement('section')

	target.id = id
	document.body.appendChild(target)
	nodes.push(target)

	return target
}

function isFrame(node: Element | null): node is TFrameElementProps {
	return node instanceof TFrameElement
}

/** The test's Frame, wherever it stands; without it the test fails here. */
function frame(): TFrameElementProps {
	const node = document.querySelector('[is="so-frame"]')

	if (!isFrame(node)) throw new Error('<div is="so-frame"> нет')

	return node
}

/** Teleport anchors in the subtree: comments in place of the roots taken away. */
function anchors(scope: Node): Comment[] {
	const walker = document.createTreeWalker(scope, NodeFilter.SHOW_COMMENT)
	const found: Comment[] = []

	while (walker.nextNode()) {
		const node = walker.currentNode

		if (node instanceof Comment && node.data === 'so-teleport') found.push(node)
	}

	return found
}

/** Frame with a button in a container; the tests stage it under `ruRU`. */
const PANEL = `<section class="place">
	<div is="so-frame" visible target="#first"><button is="so-button" text="Сохранить"></button></div>
</section>`

describe('<div is="so-frame"> · перенос в браузере', () => {
	it('панель в цели, на месте якорь; Frame и кнопка собраны по разу, с локалью провайдера', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])

		const first = addTarget('first')
		const root = stage(PANEL, ruRU)

		await delivered()

		expect(frame().parentElement).toBe(first)
		expect(anchors(root)).toHaveLength(1)
		expect(frame().querySelector('.so-button__text')?.textContent).toBe('Сохранить')
		expect(assembledOf('frame')).toEqual([ruRU.tag])
		expect(assembledOf('button')).toEqual([ruRU.tag])
	})

	it('contained туда-обратно и смена target не пересобирают ни Frame, ни кнопку', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])

		addTarget('first')

		const second = addTarget('second')
		const root = stage(PANEL, ruRU)

		await delivered()

		const node = frame()
		const place = root.querySelector('.place')

		node.contained = true
		await delivered()

		expect(node.parentElement).toBe(place)
		expect(anchors(root)).toHaveLength(0)

		node.contained = false
		await delivered()
		node.target = '#second'
		await delivered()

		expect(node.parentElement).toBe(second)
		expect(anchors(root)).toHaveLength(1)
		expect(assembledOf('frame')).toEqual([ruRU.tag])
		expect(assembledOf('button')).toEqual([ruRU.tag])
	})

	it('перестановка потребителем пересобирает Frame и кнопку под новым провайдером', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])

		const first = addTarget('first')
		const root = stage(PANEL, ruRU)
		const other = stage('', zhCN)

		await delivered()

		const node = frame()

		node.remove()
		await delivered()
		other.appendChild(node)
		await delivered()

		expect(node.parentElement).toBe(first)
		expect(anchors(root)).toHaveLength(0)
		expect(anchors(other)).toHaveLength(1)
		expect(assembledOf('frame')).toEqual([ruRU.tag, zhCN.tag])
		expect(assembledOf('button')).toEqual([ruRU.tag, zhCN.tag])
	})

	/**
	 * Frame itself is moved in one operation, without removal: its new assembly
	 * takes it to the target, and Chromium delivers the button's disconnection
	 * within that move. It is still a real one: the button is assembled after
	 * Frame, with the locale of the new place.
	 */
	it('Frame, переставленный одной операцией, пересобирает и кнопку под новым провайдером', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])

		const first = addTarget('first')
		const root = stage(PANEL, ruRU)
		const other = stage('', zhCN)

		await delivered()

		const node = frame()

		other.appendChild(node)
		await delivered()

		expect(node.parentElement).toBe(first)
		expect(anchors(root)).toHaveLength(0)
		expect(anchors(other)).toHaveLength(1)
		expect(assembledOf('frame')).toEqual([ruRU.tag, zhCN.tag])
		expect(assembledOf('button')).toEqual([ruRU.tag, zhCN.tag])
	})

	/**
	 * The container with the anchor is moved in one operation: the anchor stays
	 * in the document, but the place is under another provider now. The place
	 * has no owner, and the move is caught by the document observer.
	 */
	it('контейнер, переставленный одной операцией, пересобирает Frame и кнопку под новым провайдером', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])

		const first = addTarget('first')
		const root = stage(PANEL, ruRU)
		const other = stage('', zhCN)
		const place = root.querySelector('.place')

		if (!place) throw new Error('места нет')

		await delivered()

		other.appendChild(place)
		await delivered()

		expect(frame().parentElement).toBe(first)
		expect(anchors(root)).toHaveLength(0)
		expect(anchors(other)).toHaveLength(1)
		expect(assembledOf('frame')).toEqual([ruRU.tag, zhCN.tag])
		expect(assembledOf('button')).toEqual([ruRU.tag, zhCN.tag])
	})

	/**
	 * The popover owns the place of its panel: its new assembly returns the
	 * panel to the anchor, not the document observer, and the panel with the
	 * button in it is assembled after the popover, under its new provider. The
	 * probe is on the details too: the panel is the Frame of the popover's
	 * template.
	 */
	it('поповер, переставленный одной операцией, пересобирает панель под новым провайдером', async () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin], { scope: 'all' })

		const root = stage(
			'<span is="so-popover"><button is="so-button" slot="trigger" text="Открыть"></button><button is="so-button" text="Действие"></button></span>',
			ruRU,
		)
		const other = stage('', zhCN)
		const popover = root.querySelector('[is="so-popover"]')

		if (!popover) throw new Error('поповера нет')

		await delivered()
		assembled.length = 0

		other.appendChild(popover)
		await delivered()

		expect(assembledOf('frame')).toEqual([zhCN.tag])
		// The trigger, the button in the panel and the close button
		expect(assembledOf('button')).toEqual([zhCN.tag, zhCN.tag, zhCN.tag])
		expect(document.querySelector('.so-popover__panel')?.parentElement).toBe(document.body)
		expect(anchors(popover)).toHaveLength(1)
	})
})

/** The popover panel's content: a paragraph and a button, as in the playground preview. */
const TEXT = 'Произвольное содержимое: текст, поля, кнопки'

/** The test's trigger: it has its own class in both renderings. */
const trigger = () => document.querySelector('.so-test-trigger')

/** Vue: the component in a block, measured and unmounted to keep out of the next rendering. */
async function measureVue(content: () => VNode, parts: string): Promise<TBox[]> {
	render(defineComponent({ render: () => h('div', { style: BOX }, [content()]) }))
	await nextTick()

	const boxes = await measure(trigger, parts)

	cleanup()

	return boxes
}

/** Web Components: markup in a block, as a consumer writes it. */
async function measureWebc(html: string, parts: string): Promise<TBox[]> {
	const root = document.createElement('div')

	root.style.cssText = BOX
	root.innerHTML = html
	document.body.appendChild(root)
	nodes.push(root)

	return measure(trigger, parts)
}

describe('Popover и Tooltip · панель у триггера', () => {
	afterEach(() => {
		cleanup()
	})

	it('открытая панель поповера и её части стоят у триггера так же, как у Vue', async () => {
		const vue = await measureVue(
			() =>
				h(
					Popover,
					{ open: true, aria_label: 'Проверка' },
					{
						trigger: ({ triggerAria, triggerDataset }: TPopoverTriggerScope) =>
							h(Button, {
								text: 'Открыть',
								class: 'so-test-trigger',
								...triggerAria,
								...triggerDataset,
							}),
						default: () => [
							h('p', { style: 'margin: 0 0 8px' }, TEXT),
							h(Button, { text: 'Действие' }),
						],
					},
				),
			POPOVER_PARTS,
		)
		const webc = await measureWebc(
			`<span is="so-popover" open aria_label="Проверка"><button is="so-button" slot="trigger" class="so-test-trigger" text="Открыть"></button><p style="margin: 0 0 8px">${TEXT}</p><button is="so-button" text="Действие"></button></span>`,
			POPOVER_PARTS,
		)

		// Trigger, panel, wrapper, paragraph, button, close button and its icon
		expect(webc).toHaveLength(7)
		expect(webc[1].height).toBeGreaterThan(0)
		expect(webc).toEqual(vue)
	})

	it('открытая подсказка стоит у триггера так же, как у Vue', async () => {
		const vue = await measureVue(
			() =>
				h(
					Tooltip,
					{ open: true },
					{
						trigger: ({ triggerAria }: TTooltipTriggerScope) =>
							h(Button, { text: 'Наведи', class: 'so-test-trigger', ...triggerAria }),
						default: () => 'Короткое пояснение к кнопке',
					},
				),
			TOOLTIP_PARTS,
		)
		const webc = await measureWebc(
			'<span is="so-tooltip" open><button is="so-button" slot="trigger" class="so-test-trigger" text="Наведи"></button>Короткое пояснение к кнопке</span>',
			TOOLTIP_PARTS,
		)

		expect(webc).toHaveLength(3)
		expect(webc[1].width).toBeGreaterThan(0)
		expect(webc).toEqual(vue)
	})
})

/** Vue: the layer open from the first render, measured and unmounted to keep out of the next one. */
async function settledVue(content: () => VNode, parts: string): Promise<TBox[]> {
	render(defineComponent({ render: content }))
	await nextTick()

	const boxes = await measureLayer(parts)

	cleanup()

	return boxes
}

/** Web Components: markup as a consumer writes it; properties go before the insertion. */
async function settledWebc(
	html: string,
	parts: string,
	prepare: (root: HTMLElement) => void = () => {},
): Promise<TBox[]> {
	const root = document.createElement('div')

	root.innerHTML = html
	prepare(root)
	document.body.appendChild(root)
	nodes.push(root)

	return measureLayer(parts)
}

/** Parts of the region with a toast: region, toast, card, icon, text, own content, close button. */
const TOASTS_PARTS =
	'.so-toasts:has(.so-toasts-item), .so-toasts-item, .so-toasts-item__card, .so-toasts-item__icon, .so-toasts-item__text, .so-toasts-item__content > *, .so-toasts-item__close'

/** The sample toast: text, description and own content; it stays until closed. */
const TOAST = {
	text: 'Черновик сохранён',
	description: 'Вернуться к нему можно из списка писем',
	duration: 0,
} as const

describe('Dialog, Drawer и Toasts · открытые стоят, как у Vue', () => {
	afterEach(() => {
		cleanup()
	})

	it('открытое окно с подложкой и частями стоит так же, как у Vue', async () => {
		const vue = await settledVue(
			() =>
				h(
					Dialog,
					{ visible: true },
					{
						title: () => 'Настройки',
						default: () => [
							h('p', { style: 'margin:0 0 8px' }, TEXT),
							h(Input, { placeholder: 'Имя' }),
						],
						footer: () => [
							h(Button, { text: 'Отмена' }),
							h(Button, { text: 'Сохранить' }),
						],
					},
				),
			DIALOG_PARTS,
		)
		const webc = await settledWebc(
			`<div is="so-dialog" visible><span slot="title">Настройки</span><p style="margin:0 0 8px">${TEXT}</p><div is="so-input" placeholder="Имя"></div><button is="so-button" slot="footer" text="Отмена"></button><button is="so-button" slot="footer" text="Сохранить"></button></div>`,
			DIALOG_PARTS,
		)

		// Backdrop, dialog, title, body, paragraph, field, footer, two buttons, close button
		expect(webc).toHaveLength(10)
		expect(webc[1].width).toBeGreaterThan(0)
		expect(webc).toEqual(vue)
	})

	it('открытая выезжающая панель с подложкой и частями стоит так же, как у Vue', async () => {
		const vue = await settledVue(
			() =>
				h(
					Drawer,
					{ visible: true },
					{
						title: () => 'Фильтры',
						default: () => [
							h('p', { style: 'margin:0 0 8px' }, TEXT),
							h(Input, { placeholder: 'Поиск' }),
						],
						footer: () => [
							h(Button, { text: 'Сбросить' }),
							h(Button, { text: 'Применить' }),
						],
					},
				),
			DRAWER_PARTS,
		)
		const webc = await settledWebc(
			`<div is="so-drawer" visible><span slot="title">Фильтры</span><p style="margin:0 0 8px">${TEXT}</p><div is="so-input" placeholder="Поиск"></div><button is="so-button" slot="footer" text="Сбросить"></button><button is="so-button" slot="footer" text="Применить"></button></div>`,
			DRAWER_PARTS,
		)

		expect(webc).toHaveLength(10)
		expect(webc[1].width).toBeGreaterThan(0)
		expect(webc).toEqual(vue)
	})

	it('регион с тостом стоит у края окна так же, как у Vue', async () => {
		const undoVue: TToastRender = ({ toast }) =>
			h(Button, { text: 'Отменить', onClick: () => toast.close() })
		const undoWebc: TElementToastRender = (toast) => {
			const button = document.createElement('button', { is: 'so-button' })

			Reflect.set(button, 'text', 'Отменить')
			button.addEventListener('click', () => toast.close())

			return button
		}

		const vueEngine = createEngineToasts()

		vueEngine.extensions.toasts.show({ ...TOAST, render: undoVue })

		const vue = await settledVue(
			() => h(Toasts, { engine: vueEngine }, { default: () => h('main', 'Приложение') }),
			TOASTS_PARTS,
		)

		const webcEngine = createEngineToasts()

		webcEngine.extensions.toasts.show({ ...TOAST, render: undoWebc })

		const webc = await settledWebc(
			'<so-toasts><main>Приложение</main></so-toasts>',
			TOASTS_PARTS,
			(root) => {
				const manager = root.querySelector('so-toasts')

				if (!(manager instanceof TToastsElement)) throw new Error('<so-toasts> нет')

				Reflect.set(manager, 'engine', webcEngine)
			},
		)

		// Region, toast, card, icon, text, the undo button, close button
		expect(webc).toHaveLength(7)
		expect(webc[0].width).toBeGreaterThan(0)
		expect(webc).toEqual(vue)
	})
})
