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
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton, TComponentView, TFrame } from '@soldy-ui/core'
import { TBasePlugin, ruRU, zhCN, type IPluginContext, type TLocale } from '@soldy-ui/plugins'
import { usePlugins } from '@soldy-ui/setup'
import { TFrameElement, TLocaleProviderElement, type TFrameElementProps } from '@soldy-ui/webc'

/** Флаш раскладки элемента — на микрозадаче. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

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
