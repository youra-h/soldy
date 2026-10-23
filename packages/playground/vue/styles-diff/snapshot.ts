/**
 * Снимок вычисленных стилей частей soldy на странице и его сверка — для
 * прогона `compare.spec.ts`.
 *
 * В снимок идёт каждый узел внутри частей `so-*` — сама часть и всё, что в
 * ней, в том числе унесённое в `body` (панели, окна, регион тостов: у них свой
 * класс части), — со всеми свойствами `getComputedStyle` и с псевдоэлементами
 * `::before`, `::after`, `::placeholder` и `::marker`. Псевдоэлемент
 * сравнивается, только если он есть у узла: стиль несуществующего браузер
 * тоже отдаёт, и сброс, который его не задевает, давал бы шум. Есть он у
 * одного листа — различие одно: `content` у `::before` и `::after`, у
 * остальных — `(псевдоэлемент)`.
 *
 * Переменные CSS не сравниваются: облик — это свойства, которые из них
 * вычислены. Переменная, которая пропала или появилась, не сменив ни одного
 * свойства, облика не меняет, а видна она на каждом узле под корнем, — так
 * ушли `--font-sans` и `--default-font-family` Tailwind, которые читал только
 * preflight.
 */

/** Узел библиотеки — с классом `so-*`. */
export function isLibraryNode(node: Element): boolean {
	for (const name of node.classList) if (name.startsWith('so-')) return true

	return false
}

/**
 * Узел, которого браузер не рисует никогда: `<input type="hidden">` (у него
 * `display: none` от браузера). Его стиль ни на что не влияет, и сверять его
 * незачем.
 */
const neverDrawn = (node: Element) => node instanceof HTMLInputElement && node.type === 'hidden'

/** Узлы внутри частей `so-*` на странице — в порядке документа. */
export function partNodes(): Element[] {
	const found: Element[] = []

	const walk = (node: Element, inside: boolean) => {
		const own = inside || isLibraryNode(node)

		if (own && !neverDrawn(node)) found.push(node)

		for (const child of node.children) walk(child, own)
	}

	walk(document.documentElement, false)

	return found
}

/**
 * Кусок пути узла: тег и классы `so-*` без модификаторов. Класс с `--`
 * остаётся, если он у узла единственный (`so-switch__track--thumb`).
 */
function segmentOf(node: Element): string {
	const own = [...node.classList].filter((name) => name.startsWith('so-'))
	const blocks = own.filter((name) => !name.includes('--'))

	return [node.localName, ...(blocks.length > 0 ? blocks : own.slice(0, 1))].join('.')
}

/** Сколько последних кусков пути показывать вслед за внешней частью. */
const PATH_TAIL = 4

/** Путь узла от самой внешней части, в которой он лежит: `div.so-input > input`. */
export function pathOf(node: Element): string {
	const chain: Element[] = []

	for (let current: Element | null = node; current; current = current.parentElement) {
		chain.unshift(current)
	}

	const outer = chain.findIndex(isLibraryNode)
	const inside = chain.slice(outer === -1 ? chain.length - 1 : outer).map(segmentOf)

	if (inside.length <= PATH_TAIL + 1) return inside.join(' > ')

	return [inside[0], '…', ...inside.slice(-PATH_TAIL)].join(' > ')
}

/** Вычисленный стиль: свойство → значение. */
type TStyle = ReadonlyMap<string, string>

function styleOf(node: Element, pseudo: string | null): Map<string, string> {
	const style = getComputedStyle(node, pseudo)
	const entries = new Map<string, string>()

	for (let index = 0; index < style.length; index++) {
		const property = style.item(index)

		if (!property.startsWith('--')) entries.set(property, style.getPropertyValue(property))
	}

	return entries
}

const PSEUDOS = ['::before', '::after', '::placeholder', '::marker'] as const

type TPseudo = (typeof PSEUDOS)[number]

/** Псевдоэлемент узла: есть ли он и его стиль — целиком, если есть. */
type TPseudoSnapshot = { readonly present: boolean; readonly style: TStyle }

/** Снимок узла: свой стиль и псевдоэлементы. */
export type TNodeSnapshot = {
	readonly own: TStyle
	readonly pseudos: Readonly<Record<TPseudo, TPseudoSnapshot>>
}

/** `content`, при котором `::before` и `::after` не рисуются. */
const NO_CONTENT = new Set(['none', 'normal'])

function pseudoOf(node: Element, own: TStyle, pseudo: TPseudo): TPseudoSnapshot {
	if (pseudo === '::before' || pseudo === '::after') {
		const content = getComputedStyle(node, pseudo).getPropertyValue('content')

		return NO_CONTENT.has(content)
			? { present: false, style: new Map([['content', content]]) }
			: { present: true, style: styleOf(node, pseudo) }
	}

	const present =
		pseudo === '::marker'
			? (own.get('display') ?? '').includes('list-item')
			: (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) &&
				node.placeholder !== ''

	return present
		? { present: true, style: styleOf(node, pseudo) }
		: { present: false, style: new Map() }
}

/** Снимок узла под текущим листом. */
export function snapshotOf(node: Element): TNodeSnapshot {
	const own = styleOf(node, null)

	return {
		own,
		pseudos: {
			'::before': pseudoOf(node, own, '::before'),
			'::after': pseudoOf(node, own, '::after'),
			'::placeholder': pseudoOf(node, own, '::placeholder'),
			'::marker': pseudoOf(node, own, '::marker'),
		},
	}
}

/** Различие свойства: свойство, значение «до» и «после». */
export type TPropertyDifference = readonly [property: string, before: string, after: string]

function compareStyles(before: TStyle, after: TStyle): TPropertyDifference[] {
	const found: TPropertyDifference[] = []

	for (const [property, value] of before) {
		const other = after.get(property) ?? ''

		if (other !== value) found.push([property, value, other])
	}

	for (const [property, value] of after) {
		if (!before.has(property)) found.push([property, '', value])
	}

	return found
}

/** Различия двух снимков одного узла: свойство вместе с псевдоэлементом. */
export function compareSnapshots(
	before: TNodeSnapshot,
	after: TNodeSnapshot,
): { pseudo: string; difference: TPropertyDifference }[] {
	const found = compareStyles(before.own, after.own).map((difference) => ({
		pseudo: '',
		difference,
	}))

	for (const pseudo of PSEUDOS) {
		const a = before.pseudos[pseudo]
		const b = after.pseudos[pseudo]

		if (a.present && b.present) {
			found.push(
				...compareStyles(a.style, b.style).map((difference) => ({ pseudo, difference })),
			)
		} else if (a.present !== b.present) {
			const content = a.style.has('content') || b.style.has('content')
			const difference: TPropertyDifference = content
				? ['content', a.style.get('content') ?? '', b.style.get('content') ?? '']
				: ['(псевдоэлемент)', a.present ? 'есть' : 'нет', b.present ? 'есть' : 'нет']

			found.push({ pseudo, difference })
		}
	}

	return found
}

/** Кругов прикалывания самое большее: свойство, вернувшее другое, — ещё круг. */
const PIN_ROUNDS = 5

/**
 * Узел, который двигает раскладку вокруг себя: элемент HTML или корень
 * рисунка `<svg>`. Узлы внутри рисунка (`g`, `path`) — нет: свойства коробки
 * рисунок SVG не читает, а инлайновый стиль на них Chromium отдаёт
 * перерисовкой рисунка, после которой авто-отступы его корня читаются нулём.
 */
const isPinnable = (node: Element): node is HTMLElement | SVGSVGElement =>
	node instanceof HTMLElement || (node instanceof SVGSVGElement && node.ownerSVGElement === null)

/**
 * Приколоть узлы к их стилю «до»: каждое своё свойство, которое разошлось со
 * снимком, — в инлайновый стиль, с `!important`. Кругами, пока расходится
 * хоть одно: свойство бывает от другого — ширина рамки при стиле `none`
 * вычисляется в ноль, и приколотый стиль `solid` возвращает ей `medium`
 * браузера, — следующий круг колет и её. Совпавшее не колется: записанное
 * вычисленное значение не всегда то же, что не заданное (`app-region: none`
 * Chromium вычисляет в `no-drag` узлу и его потомкам). Отдаёт, сколько узлов
 * приколото, и чем их снять: прежний атрибут `style` возвращается как был.
 *
 * Так прогон держит неизменным то, что не часть: содержимое слота другого
 * шрифта поменяло бы ширину подписи, и различие у части было бы не от листа
 * (`compare.spec.ts`).
 */
export function pin(nodes: ReadonlyMap<Element, TNodeSnapshot>): {
	count: number
	release: () => void
} {
	const pinned: { node: HTMLElement | SVGSVGElement; style: string | null; own: TStyle }[] = []

	for (const [node, { own }] of nodes) {
		if (isPinnable(node)) pinned.push({ node, style: node.getAttribute('style'), own })
	}

	for (let round = 0; round < PIN_ROUNDS; round++) {
		let changed = false

		for (const { node, own } of pinned) {
			const current = getComputedStyle(node)

			for (const [property, value] of own) {
				if (current.getPropertyValue(property) === value) continue

				node.style.setProperty(property, value, 'important')
				changed = true
			}
		}

		if (!changed) break
	}

	return {
		count: pinned.length,
		release: () => {
			for (const { node, style } of pinned) {
				if (style === null) node.removeAttribute('style')
				else node.setAttribute('style', style)
			}
		},
	}
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Кадров подряд без правок DOM, после которых страница встала. */
const QUIET_FRAMES = 3

/** Кадров самое большее на одно ожидание: две секунды при 60 Гц. */
const MAX_FRAMES = 120

/** Кругов «встать — доиграть переходы» самое большее. */
const MAX_ROUNDS = 5

/**
 * Ждать, пока DOM не меняется `QUIET_FRAMES` кадров подряд: плагины раскладки
 * меряют части и пишут результат кадром позже (`ResizeObserver`,
 * `TElementPlugin`). Отдаёт, менялся ли DOM за ожидание.
 */
async function quiet(): Promise<boolean> {
	let changed = false
	let calm = 0
	const observer = new MutationObserver(() => {
		changed = true
		calm = 0
	})

	observer.observe(document, {
		subtree: true,
		childList: true,
		attributes: true,
		characterData: true,
	})

	try {
		for (let frame = 0; frame < MAX_FRAMES && calm < QUIET_FRAMES; frame++) {
			await nextFrame()
			calm++
		}
	} finally {
		observer.disconnect()
	}

	return changed
}

/**
 * Переходы — доиграны, анимации — на паузе в начале: снимок не зависит от
 * мгновения, в которое его сняли, и у обоих листов он одного мгновения.
 * Отдаёт, было ли что доигрывать или ставить на паузу.
 */
function freeze(): boolean {
	let touched = false

	for (const animation of document.getAnimations()) {
		if (animation instanceof CSSTransition) {
			animation.finish()
			touched = true
		} else if (animation.playState !== 'paused' || animation.currentTime !== 0) {
			animation.pause()
			animation.currentTime = 0
			touched = true
		}
	}

	return touched
}

/**
 * Страница встала: DOM не меняется, переходы доиграны, анимации на паузе в
 * начале. Доигранный переход отдаёт `transitionend`, и код, который его ждёт
 * (снятие закрытого тоста, признак переезда полосы таба), правит DOM, —
 * поэтому кругами, пока круг ничего не меняет.
 */
export async function settle(): Promise<void> {
	await document.fonts.ready

	for (let round = 0; round < MAX_ROUNDS; round++) {
		const changed = await quiet()
		const touched = freeze()

		if (!changed && !touched) return
	}
}
