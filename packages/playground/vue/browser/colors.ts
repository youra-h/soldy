/**
 * How colors are measured in a real browser — shared by the specs that look
 * at the theme (`button-view.spec.ts`, `switch-view.spec.ts`,
 * `tabs-view.spec.ts`, `toasts.spec.ts`).
 *
 * The colors of a view are the design's call, and the specs don't know them
 * (`themes/oren/AGENTS.md`, «Что тестом не проверяется»). They know relations:
 * how far a color moved from its backdrop and which way, and whether text
 * reads on its background — the WCAG contrast ratio (`contrast`). One copy for
 * everyone: lightness, luminance and layer over layer are not obvious here, and
 * nothing would keep two copies from drifting apart.
 *
 * The exception is forced colors mode: there the user picks the palette, and a
 * part the theme paints itself must take the user's system color. That is what
 * the specs compare it with (`systemColor`; progress indicators —
 * `progress-linear.spec.ts` and `progress-spinner.spec.ts`).
 */

/**
 * The computed style of a node or of its pseudo-element. The pseudo-element is
 * no luxury: the theme draws the line under the tab list and the bar under the
 * active tab with `::before` and `::after`, they have no node of their own.
 */
export const style = (element: Element, pseudo?: string): CSSStyleDeclaration =>
	getComputedStyle(element, pseudo)

/** A node by selector; without it the test fails here, not on reading a property. */
export const find = (selector: string, root: ParentNode = document): HTMLElement => {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Shapes of an SVG picture: what the browser paints with fill or stroke. */
const SHAPES = 'path, circle, ellipse, line, polyline, polygon, rect'

/**
 * The color of an icon's picture — what the pack paints its shape with: the
 * fill, or the stroke of a shape without fill (Lucide lines). The theme sets
 * the icon color with the `--so-icon-color` variable, not `fill` on the root
 * (`docs/agents/theming.md`, «Пакеты иконок»), so the root `svg` doesn't show
 * the picture's color — only the shapes do. The icon is an `svg` root or a
 * `span` root with the picture's `<svg>` inside (Web Components); without a
 * shape the test fails here.
 */
export function iconPaint(icon: Element): string {
	const svg = icon instanceof SVGSVGElement ? icon : icon.querySelector(':scope > svg')
	const shape = svg?.querySelector(SHAPES)

	if (!(shape instanceof SVGGeometryElement)) throw new Error('фигуры в рисунке иконки нет')

	const { fill, stroke } = style(shape)

	return fill === 'none' ? stroke : fill
}

/**
 * A color transition plays out before the color is read: on the theme's
 * controls it lasts 200 ms, and the frame right after hovering catches the
 * color at the start of its way. A transition another one interrupted is
 * cancelled, and its `finished` rejects — for the wait that is an end too:
 * WebKit interrupts transitions Chromium lets play out.
 */
export const settled = (element: Element): Promise<unknown> =>
	Promise.all(
		element
			.getAnimations({ subtree: true })
			.map((animation) => animation.finished.catch(() => undefined)),
	)

/**
 * A color over its backdrop — through the same canvas the browser lays it with.
 *
 * Parsing the computed style string ourselves won't do: `getComputedStyle`
 * gives a color in the space it was declared in, and the theme uses `oklch()`
 * for steps and `oklab()` for veils, not `rgb()`. The canvas takes any of
 * them, lays layer over layer exactly as the page does and gives back the
 * resulting sRGB bytes.
 *
 * A string that is not a color the canvas skips silently, laying the layer in
 * the previous call's color. So `none` of a mark's `fill` would match the color
 * read before it, and the comparison would pass on someone else's color. Such
 * a string fails the test here.
 */
const paint = document.createElement('canvas').getContext('2d', { willReadFrequently: true })

export function pixel(colors: string[]): Uint8ClampedArray {
	if (!paint) throw new Error('канвы нет')

	paint.clearRect(0, 0, 1, 1)

	for (const color of colors) {
		if (!CSS.supports('color', color)) throw new Error(`${color}: не цвет`)

		paint.fillStyle = color
		paint.fillRect(0, 0, 1, 1)
	}

	return paint.getImageData(0, 0, 1, 1).data
}

/**
 * The gradient color in a node's background — the first color of
 * `background-image`. That's how the theme lays a one-color layer over
 * `background-color`: the fill of the current Pagination page (the background
 * transition doesn't carry it) and the line under the sticky Table head as the
 * bottom pixel of the background. Without a gradient the test fails here.
 */
export function gradientColor(element: Element): string {
	const image = style(element).backgroundImage
	const color = /(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)/.exec(image)

	if (!color) throw new Error(`градиента в фоне нет: ${image}`)

	return color[0]
}

/**
 * A system color in the current mode, as the browser resolves it. The probe
 * doesn't obey the mode (`forced-color-adjust: none`), or the browser would
 * replace its color too. `Canvas` is the page background in the mode: the
 * browser replaces the theme's backgrounds with it.
 */
export function systemColor(
	keyword: 'Highlight' | 'HighlightText' | 'GrayText' | 'CanvasText' | 'Canvas' | 'ButtonText',
): string {
	const probe = document.createElement('span')

	probe.style.setProperty('forced-color-adjust', 'none')
	probe.style.color = keyword
	document.body.append(probe)

	const color = getComputedStyle(probe).color

	probe.remove()

	return color
}

/** The opacity of a color: below one for a veil, one for a step. */
export const opacity = (color: string): number => pixel([color])[3] / 255

/**
 * Whether the browser draws the node's outline: a style is set, there is a
 * width, the color isn't transparent. A transparent outline is the second half
 * of the panels' edge: invisible in the normal mode, while in forced colors
 * mode the browser paints it a system color and it becomes a border. The
 * pseudo-element is as in `style()`: the theme draws the card of the active
 * `contained` tab with the list's `::before`.
 */
export const outlined = (element: Element, pseudo?: string): boolean => {
	const { outlineStyle, outlineWidth, outlineColor } = style(element, pseudo)

	return outlineStyle !== 'none' && parseFloat(outlineWidth) >= 1 && opacity(outlineColor) > 0
}

/**
 * An sRGB channel byte to linear light: both OKLab and WCAG luminance come
 * from it. WCAG 2 writes the knee as 0.03928, sRGB as 0.04045, but no byte lies
 * between them, and the result is the same.
 */
function linear(value: number): number {
	const unit = value / 255

	return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
}

/**
 * The color of layers in OKLab: lightness and two color axes — `a`
 * (green–red) and `b` (blue–yellow). Layers go through the same canvas
 * (`pixel`).
 */
export function oklab(colors: string[]): { lightness: number; a: number; b: number } {
	const [red, green, blue] = pixel(colors)
	const [r, g, b] = [linear(red), linear(green), linear(blue)]
	const long = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
	const medium = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
	const short = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

	return {
		lightness: 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
		a: 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
		b: 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
	}
}

/**
 * OKLab lightness — the only measure comparable between schemes: the theme's
 * scale is inverted by roles, and a step equal to the eye is smaller in sRGB
 * among dark colors than among light ones (`tokens-dark.css`).
 */
export const lightness = (colors: string[]): number => oklab(colors).lightness

/**
 * The hue of layers — the angle on the OKLab color plane, in degrees — and the
 * chroma — the distance from gray. The hue shows the color family, not its
 * step: a veil and a step of one family share it.
 */
export function hue(colors: string[]): { angle: number; chroma: number } {
	const { a, b } = oklab(colors)

	return { angle: (Math.atan2(b, a) * 180) / Math.PI, chroma: Math.hypot(a, b) }
}

/** How far a color moved from its backdrop, signed: plus is lighter, minus darker. */
export const shift = (color: string, backdrop: string): number =>
	lightness([backdrop, color]) - lightness([backdrop])

/**
 * The relative luminance of layers by WCAG 2 — from the canvas bytes
 * (`pixel`). The layers must cover the canvas fully: for a see-through result
 * the color bytes without its transparency are not the color one sees.
 */
function luminance(colors: string[]): number {
	const [red, green, blue, alpha] = pixel(colors)

	if (alpha !== 255) throw new Error(`${colors.join(' + ')}: подложка просвечивает`)

	return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
}

/**
 * The WCAG 2 contrast ratio, from 1 to 21: a color over its backdrop against
 * the backdrop itself. The backdrop is layers bottom up, an opaque one first:
 * under a button's label on a toast lie the toast and the button's background,
 * a veil over the toast. Layers go through the same canvas as for lightness —
 * the way the browser lays them, not by tokens: a description at 95 % and the
 * buttons' shade show only so. Thresholds are the specs', by WCAG: 4.5 for
 * `text-sm` text (1.4.3), 3 for graphics — an icon, a cross, a focus ring
 * (1.4.11).
 */
export const contrast = (color: string, backdrop: string[]): number => {
	const front = luminance([...backdrop, color])
	const back = luminance(backdrop)

	return (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05)
}
