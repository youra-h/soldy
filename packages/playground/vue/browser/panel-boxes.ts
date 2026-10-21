/**
 * Замер открытой панели у триггера — для сверки раскладки двух отрисовок:
 * Vue и Web Components (`webc-frame.spec.ts`), Vue и Angular
 * (`angular-host.spec.ts`).
 *
 * Панель встаёт у якоря, поэтому её место сверяется не от угла окна, а от
 * триггера: рамки триггера и панели с её частями — от его угла. Тема видит у
 * панелей разных фреймворков одни классы и одну разметку, и рамки обязаны
 * совпасть.
 */

/** Рамка узла от угла триггера, в пикселях. */
export type TBox = { x: number; y: number; width: number; height: number }

/** Блок, в котором стоит компонент, — один на обе отрисовки. */
export const BOX = 'padding: 48px 24px; width: 400px'

/** Части открытого поповера: панель, обёртка содержимого, содержимое, крестик и иконка в нём. */
export const POPOVER_PARTS =
	'.so-popover__panel, .so-popover__content, .so-popover__content > *, .so-popover__close, .so-popover__close .so-icon'

/** Части открытой подсказки: панель и обёртка текста. */
export const TOOLTIP_PARTS = '.so-tooltip__panel, .so-tooltip__content'

/** Кадр: привязка панели считает место после него. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Рамки триггера и открытой панели с её частями — от угла триггера. Части
 * ищутся по документу: панель телепортирована. Скрытые части рамок не имеют и
 * не считаются. Панели нет — пусто.
 */
function boxesOf(trigger: () => Element | null, parts: string): TBox[] {
	const anchor = trigger()
	const found = [...document.querySelectorAll(parts)].filter(
		(node) => node.getClientRects().length > 0,
	)

	if (!anchor || found.length === 0) return []

	const origin = anchor.getBoundingClientRect()

	return [anchor, ...found].map((node) => {
		const box = node.getBoundingClientRect()

		return {
			x: Math.round(box.left - origin.left),
			y: Math.round(box.top - origin.top),
			width: Math.round(box.width),
			height: Math.round(box.height),
		}
	})
}

/**
 * Рамки, когда панель встала: доиграли переходы темы — проявление панели, — и
 * два кадра подряд рамки те же. Место панели привязка досчитывает кадром после
 * показа, а под нагрузкой кадры идут реже, и число кадров не загадывается.
 */
export async function measure(trigger: () => Element | null, parts: string): Promise<TBox[]> {
	let previous = ''

	for (let frame = 0; frame < 60; frame += 1) {
		await nextFrame()
		await Promise.all(document.getAnimations().map((animation) => animation.finished))

		const boxes = boxesOf(trigger, parts)
		const current = JSON.stringify(boxes)

		if (boxes.length > 0 && current === previous) return boxes

		previous = current
	}

	throw new Error(`${parts}: открытая панель не встала за 60 кадров`)
}
