/**
 * `<div is="so-frame">` в настоящем браузере — перенос телепортом не
 * пересобирает.
 *
 * Элемент soldy живёт на колбэках DOM: перенос узла — это отключение и
 * подключение его и всего, что внутри, а база заводит связку на каждое
 * подключение. Перенос, который делает сама база, — телепорт в цель и
 * обратно, раскладка света, — связку не трогает: узел едет одной операцией,
 * не выходя из документа, и отключение приходит, когда он снова в документе.
 * Когда и в каком порядке приходят колбэки, решает движок, и jsdom
 * (`ui/webc/__tests__/frame.spec.ts`) лишь повторяет спецификацию. Здесь тот
 * же порядок сверяет Chromium: Frame и кнопка в панели собраны по разу, с
 * локалью провайдера вокруг Frame, перенос, `contained` и смена цели их не
 * пересобирают, а перестановка потребителем — пересобирает.
 *
 * Панели на Frame — Popover и Tooltip: их Frame — деталь шаблона, а якорь —
 * корень элемента. Раскладку jsdom не считает, и место открытой панели у
 * триггера, её размер и части в ней сверяются здесь с Vue: тема видит у них
 * одни классы и одну разметку.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { TButton, TComponentView, TFrame } from '@soldy-ui/core'
import { TBasePlugin, ruRU, zhCN, type IPluginContext, type TLocale } from '@soldy-ui/plugins'
import {
	useIcons,
	usePlugins,
	type DescriptorSlots,
	type PopoverDescriptor,
	type TooltipDescriptor,
} from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { Button, Popover, Tooltip } from '@soldy-ui/vue'
import { TFrameElement, TLocaleProviderElement, type TFrameElementProps } from '@soldy-ui/webc'

import '@soldy-ui/theme-oren'

useIcons(material)

type TPopoverTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']
type TTooltipTriggerScope = DescriptorSlots<typeof TooltipDescriptor>['trigger']

/** Флаш раскладки элемента — на микрозадаче. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** Кадр: `TElementPlugin` объявляет узел через него, привязка панели считает место после. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Сборки: вид компонента и тег локали, которые плагин видел при установке набора. */
const assembled: (readonly [kind: string, locale: string])[] = []

const kindOf = (instance: unknown): string =>
	instance instanceof TFrame ? 'frame' : instance instanceof TButton ? 'button' : 'other'

/** Плагин-зонд: сборка ставит его в набор — по одному разу на связку. */
class TAssemblyProbePlugin extends TBasePlugin<TComponentView> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		assembled.push([kindOf(ctx.getInstance()), ctx.locale.locale.tag])
	}
}

/** Теги локали сборок компонентов этого вида — по одному на сборку. */
const assembledOf = (kind: string): string[] =>
	assembled.filter(([each]) => each === kind).map(([, tag]) => tag)

/** Узлы теста — снимаются после каждого. */
const nodes: Element[] = []

let dispose: (() => void) | undefined

afterEach(() => {
	for (const node of nodes.splice(0)) node.remove()

	dispose?.()
	dispose = undefined
	assembled.length = 0
})

/**
 * Разметка под провайдером с этой локалью — в конце `body`. Локаль провайдер
 * получает до вставки: элементы собираются уже под ней.
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

/** Цель с `id` в конце `body`. */
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

/** Frame теста — где бы он ни стоял; нет его — тест падает здесь. */
function frame(): TFrameElementProps {
	const node = document.querySelector('[is="so-frame"]')

	if (!isFrame(node)) throw new Error('<div is="so-frame"> нет')

	return node
}

/** Якоря телепорта в поддереве — комментарии на месте увезённых корней. */
function anchors(scope: Node): Comment[] {
	const walker = document.createTreeWalker(scope, NodeFilter.SHOW_COMMENT)
	const found: Comment[] = []

	while (walker.nextNode()) {
		const node = walker.currentNode

		if (node instanceof Comment && node.data === 'so-teleport') found.push(node)
	}

	return found
}

/** Frame с кнопкой в контейнере под провайдером `ruRU`. */
const PANEL = `<section class="place">
	<div is="so-frame" visible target="#first"><button is="so-button" text="Сохранить"></button></div>
</section>`

describe('<div is="so-frame"> · перенос в браузере', () => {
	it('панель в цели, на месте якорь; Frame и кнопка собраны по разу, с локалью провайдера', () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])

		const first = addTarget('first')
		const root = stage(PANEL, ruRU)

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
		const node = frame()
		const place = root.querySelector('.place')

		node.contained = true
		await flush()

		expect(node.parentElement).toBe(place)
		expect(anchors(root)).toHaveLength(0)

		node.contained = false
		await flush()
		node.target = '#second'
		await flush()

		expect(node.parentElement).toBe(second)
		expect(anchors(root)).toHaveLength(1)
		expect(assembledOf('frame')).toEqual([ruRU.tag])
		expect(assembledOf('button')).toEqual([ruRU.tag])
	})

	it('перестановка потребителем пересобирает Frame и кнопку под новым провайдером', () => {
		dispose = usePlugins(TComponentView, [TAssemblyProbePlugin])

		const first = addTarget('first')
		const root = stage(PANEL, ruRU)
		const other = stage('', zhCN)
		const node = frame()

		node.remove()
		other.appendChild(node)

		expect(node.parentElement).toBe(first)
		expect(anchors(root)).toHaveLength(0)
		expect(anchors(other)).toHaveLength(1)
		expect(assembledOf('frame')).toEqual([ruRU.tag, zhCN.tag])
		expect(assembledOf('button')).toEqual([ruRU.tag, zhCN.tag])
	})
})

/** Рамка узла от угла триггера, в пикселях. */
type TBox = { x: number; y: number; width: number; height: number }

/** Блок, в котором стоит компонент, — один на обе отрисовки, Vue и Web Components. */
const BOX = 'padding: 48px 24px; width: 400px'

/** Части открытого поповера: панель, обёртка содержимого, содержимое, крестик и иконка в нём. */
const POPOVER_PARTS =
	'.so-popover__panel, .so-popover__content, .so-popover__content > *, .so-popover__close, .so-popover__close .so-icon'

/** Части открытой подсказки: панель и обёртка текста. */
const TOOLTIP_PARTS = '.so-tooltip__panel, .so-tooltip__content'

/** Содержимое панели поповера — абзац и кнопка, как в превью стенда. */
const TEXT = 'Произвольное содержимое: текст, поля, кнопки'

/**
 * Рамки триггера и открытой панели с её частями — от угла триггера: панель
 * встаёт у якоря, и её место сверяется не от угла окна, а от него. Меряется,
 * когда привязка досчитала место (кадры после показа) и доиграли переходы
 * темы — проявление панели.
 */
async function measure(parts: string): Promise<TBox[]> {
	await nextFrame()
	await nextFrame()
	await Promise.all(document.getAnimations().map((animation) => animation.finished))
	await nextFrame()

	const trigger = document.querySelector('.so-test-trigger')
	const found = [...document.querySelectorAll(parts)].filter(
		(node) => node.getClientRects().length > 0,
	)

	if (!trigger || found.length === 0) throw new Error(`${parts}: открытой панели нет`)

	const origin = trigger.getBoundingClientRect()

	return [trigger, ...found].map((node) => {
		const box = node.getBoundingClientRect()

		return {
			x: Math.round(box.left - origin.left),
			y: Math.round(box.top - origin.top),
			width: Math.round(box.width),
			height: Math.round(box.height),
		}
	})
}

/** Vue: компонент в блоке, меряется и снимается — следующей отрисовке он не мешает. */
async function measureVue(content: () => VNode, parts: string): Promise<TBox[]> {
	render(defineComponent({ render: () => h('div', { style: BOX }, [content()]) }))
	await nextTick()

	const boxes = await measure(parts)

	cleanup()

	return boxes
}

/** Web Components: разметка в блоке — как её пишет потребитель. */
async function measureWebc(html: string, parts: string): Promise<TBox[]> {
	const root = document.createElement('div')

	root.style.cssText = BOX
	root.innerHTML = html
	document.body.appendChild(root)
	nodes.push(root)

	return measure(parts)
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

		// Триггер, панель, обёртка, абзац, кнопка, крестик и иконка в нём
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
