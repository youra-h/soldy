/**
 * Чем меряются цвета в настоящем браузере — общее для спеков, которые смотрят
 * на тему (`button-view.spec.ts`, `switch-view.spec.ts`).
 *
 * Цвета вида решает дизайн, и спеки их не знают (`themes/oren/AGENTS.md`, «Что
 * тестом не проверяется»). Знают они отношение: насколько цвет ушёл от
 * подложки и в какую сторону. Одна копия на всех — счёт светлоты и слой поверх
 * слоя тут неочевидные, и разъехаться двум копиям было бы нечему помешать.
 */

export const style = (element: Element): CSSStyleDeclaration => getComputedStyle(element)

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
export const find = (selector: string, root: ParentNode = document): HTMLElement => {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/**
 * Переход цвета доигрывает, прежде чем цвет читают: у контролов темы он длится
 * 200 мс, и кадр сразу после наведения застаёт цвет в начале пути.
 */
export const settled = (element: Element): Promise<unknown> =>
	Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished))

/**
 * Цвет поверх подложки — тем же холстом, которым его кладёт браузер.
 *
 * Разбирать строку вычисленного стиля самим нельзя: `getComputedStyle` отдаёт
 * цвет в том пространстве, в котором он объявлен, и у темы это `oklch()` у
 * ступеней и `oklab()` у вуали, а не `rgb()`. Канва принимает любую из этих
 * записей, кладёт слой на слой ровно так же, как страница, и отдаёт
 * получившиеся байты sRGB.
 */
const paint = document.createElement('canvas').getContext('2d', { willReadFrequently: true })

export function pixel(colors: string[]): Uint8ClampedArray {
	if (!paint) throw new Error('канвы нет')

	paint.clearRect(0, 0, 1, 1)

	for (const color of colors) {
		paint.fillStyle = color
		paint.fillRect(0, 0, 1, 1)
	}

	return paint.getImageData(0, 0, 1, 1).data
}

/** Непрозрачность цвета: у вуали она меньше единицы, у ступени равна ей. */
export const opacity = (color: string): number => pixel([color])[3] / 255

/**
 * Светлота OKLab — единственная мера, сравнимая между схемами: шкала темы
 * инвертирована по ролям, и одинаковый на глаз шаг у тёмных цветов меньше по
 * sRGB, чем у светлых (`tokens-dark.css`).
 */
export function lightness(colors: string[]): number {
	const [red, green, blue] = pixel(colors)
	const linear = (value: number) => {
		const unit = value / 255

		return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
	}

	const [r, g, b] = [linear(red), linear(green), linear(blue)]
	const long = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
	const medium = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
	const short = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

	return 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short
}

/** Насколько цвет отошёл от подложки — со знаком: плюс светлее, минус темнее. */
export const shift = (color: string, backdrop: string): number =>
	lightness([backdrop, color]) - lightness([backdrop])
