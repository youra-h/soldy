/**
 * Чем меряются цвета в настоящем браузере — общее для спеков, которые смотрят
 * на тему (`button-view.spec.ts`, `switch-view.spec.ts`, `tabs-view.spec.ts`,
 * `toasts.spec.ts`).
 *
 * Цвета вида решает дизайн, и спеки их не знают (`themes/oren/AGENTS.md`, «Что
 * тестом не проверяется»). Знают они отношение: насколько цвет ушёл от
 * подложки и в какую сторону, а читается ли текст на своём фоне — отношение
 * контраста по WCAG (`contrast`). Одна копия на всех — счёт светлоты, яркости
 * и слой поверх слоя тут неочевидные, и разъехаться двум копиям было бы нечему
 * помешать.
 *
 * Исключение — режим принудительных цветов: палитру там выбирает
 * пользователь, и часть, которую тема красит сама, обязана взять его
 * системный цвет. С ним спеки и сверяют её (`systemColor`, индикаторы
 * выполнения — `progress-linear.spec.ts` и `progress-spinner.spec.ts`).
 */

/**
 * Вычисленный стиль узла или его псевдоэлемента. Псевдоэлемент нужен не ради
 * красоты: линию под списком табов и полосу под активным табом тема рисует
 * `::before` и `::after`, своего узла у них нет вовсе.
 */
export const style = (element: Element, pseudo?: string): CSSStyleDeclaration =>
	getComputedStyle(element, pseudo)

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
export const find = (selector: string, root: ParentNode = document): HTMLElement => {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Фигуры рисунка SVG: то, что браузер красит заливкой или обводкой. */
const SHAPES = 'path, circle, ellipse, line, polyline, polygon, rect'

/**
 * Цвет рисунка иконки — то, чем пакет рисует её фигуру: заливка, а у фигуры
 * без заливки — обводка (линии Lucide). Тема задаёт цвет иконки переменной
 * `--so-icon-color`, а не `fill` у корня (`docs/agents/theming.md`, «Пакеты
 * иконок»), поэтому у корня `svg` цвета рисунка не видно — только у фигур.
 * Иконка — корень `svg` или корень `span` с `<svg>` рисунка внутри (Web
 * Components); фигуры нет — тест падает здесь.
 */
export function iconPaint(icon: Element): string {
	const svg = icon instanceof SVGSVGElement ? icon : icon.querySelector(':scope > svg')
	const shape = svg?.querySelector(SHAPES)

	if (!(shape instanceof SVGGeometryElement)) throw new Error('фигуры в рисунке иконки нет')

	const { fill, stroke } = style(shape)

	return fill === 'none' ? stroke : fill
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
 *
 * Строку, которая не цвет, холст молча пропускает и кладёт слой прежним
 * цветом — от прошлого вызова. Так `none` у `fill` отметки совпал бы с цветом,
 * прочитанным перед ним, и сверка прошла бы на чужом цвете. Поэтому такая
 * строка роняет тест здесь.
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
 * Цвет градиента в фоне узла — первый цвет в `background-image`. Так тема
 * кладёт слой одного цвета поверх `background-color`: заливку текущей
 * страницы Pagination — переход фона её не ведёт, — и линию под закреплённой
 * шапкой Table нижним пикселем фона. Градиента нет — тест падает здесь.
 */
export function gradientColor(element: Element): string {
	const image = style(element).backgroundImage
	const color = /(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)/.exec(image)

	if (!color) throw new Error(`градиента в фоне нет: ${image}`)

	return color[0]
}

/**
 * Системный цвет в текущем режиме, как его разрешает браузер. Проба не
 * подчиняется режиму (`forced-color-adjust: none`): иначе браузер заменил бы и
 * её цвет. `Canvas` — фон страницы в этом режиме: им браузер заменяет фоны
 * темы.
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

/** Непрозрачность цвета: у вуали она меньше единицы, у ступени равна ей. */
export const opacity = (color: string): number => pixel([color])[3] / 255

/**
 * Рисует ли браузер контур узла: стиль задан, толщина есть, цвет не
 * прозрачный. Прозрачный контур — вторая половина кромки панелей: в обычном
 * режиме его не видно, а в режиме принудительных цветов браузер красит его
 * системным цветом, и он становится рамкой. Псевдоэлемент — как у `style()`:
 * карточку активного таба `contained` тема рисует `::before` списка.
 */
export const outlined = (element: Element, pseudo?: string): boolean => {
	const { outlineStyle, outlineWidth, outlineColor } = style(element, pseudo)

	return outlineStyle !== 'none' && parseFloat(outlineWidth) >= 1 && opacity(outlineColor) > 0
}

/**
 * Байт канала sRGB — в линейный свет: из него считаются и OKLab, и яркость
 * WCAG. Порог перегиба у WCAG 2 записан как 0,03928, у sRGB — 0,04045, но
 * между ними не лежит ни одного байта, и счёт один.
 */
function linear(value: number): number {
	const unit = value / 255

	return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
}

/**
 * Цвет слоёв в OKLab: светлота и две оси цвета — `a` (зелёный — красный) и
 * `b` (синий — жёлтый). Слои кладутся тем же холстом (`pixel`).
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
 * Светлота OKLab — единственная мера, сравнимая между схемами: шкала темы
 * инвертирована по ролям, и одинаковый на глаз шаг у тёмных цветов меньше по
 * sRGB, чем у светлых (`tokens-dark.css`).
 */
export const lightness = (colors: string[]): number => oklab(colors).lightness

/**
 * Тон слоёв — угол на плоскости цвета OKLab, в градусах, и насыщенность —
 * расстояние от серого. По тону видно семейство цвета, а не его ступень: у
 * вуали и у ступени одного семейства он один.
 */
export function hue(colors: string[]): { angle: number; chroma: number } {
	const { a, b } = oklab(colors)

	return { angle: (Math.atan2(b, a) * 180) / Math.PI, chroma: Math.hypot(a, b) }
}

/** Насколько цвет отошёл от подложки — со знаком: плюс светлее, минус темнее. */
export const shift = (color: string, backdrop: string): number =>
	lightness([backdrop, color]) - lightness([backdrop])

/**
 * Относительная яркость слоёв по WCAG 2 — из байтов холста (`pixel`). Слои
 * обязаны закрыть холст целиком: у просвечивающего итога байты цвета без его
 * прозрачности — не тот цвет, который видно.
 */
function luminance(colors: string[]): number {
	const [red, green, blue, alpha] = pixel(colors)

	if (alpha !== 255) throw new Error(`${colors.join(' + ')}: подложка просвечивает`)

	return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
}

/**
 * Отношение контраста по WCAG 2 — от 1 до 21: цвет поверх подложки против
 * самой подложки. Подложка — слои снизу вверх, первым — непрозрачный: под
 * подписью кнопки на плашке тоста лежат плашка и фон кнопки, вуаль поверх
 * плашки. Слои кладутся тем же холстом, что и у светлоты, то есть так, как их
 * кладёт браузер, а не по токенам: описание на 95 % и тень кнопок видны только
 * так. Пороги — у спеков, по WCAG: тексту кегля `text-sm` — 4,5 (1.4.3),
 * графике — значку, крестику, кольцу фокуса — 3 (1.4.11).
 */
export const contrast = (color: string, backdrop: string[]): number => {
	const front = luminance([...backdrop, color])
	const back = luminance(backdrop)

	return (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05)
}
