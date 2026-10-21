/**
 * Замер открытой панели у триггера и открытого слоя у края или по центру окна
 * — для сверки раскладки двух отрисовок: Vue и Web Components
 * (`webc-frame.spec.ts`), Vue и Angular (`angular-host.spec.ts`).
 *
 * Панель встаёт у якоря, поэтому её место сверяется не от угла окна, а от
 * триггера: рамки триггера и панели с её частями — от его угла. Окно и
 * выезжающая панель стоят у края или по центру окна, и их рамки с подложкой и
 * частями сверяются от угла окна. Тема видит у слоёв разных фреймворков одни
 * классы и одну разметку, и рамки обязаны совпасть.
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

/** Части открытого окна: подложка, окно, заголовок, тело с содержимым, подвал с кнопками, крестик. */
export const DIALOG_PARTS =
	'.so-dialog__backdrop, .so-dialog, .so-dialog__title, .so-dialog__body, .so-dialog__body > *, .so-dialog__footer, .so-dialog__footer > *, .so-dialog__close'

/** Части открытой выезжающей панели — те же, что у окна. */
export const DRAWER_PARTS =
	'.so-drawer__backdrop, .so-drawer, .so-drawer__title, .so-drawer__body, .so-drawer__body > *, .so-drawer__footer, .so-drawer__footer > *, .so-drawer__close'

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
 * Переход, перебитый новым значением или переносом узла, отменяется, и его
 * `finished` отклонён: для ожидания это тоже конец — устоялось ли, решают рамки.
 */
export async function measure(trigger: () => Element | null, parts: string): Promise<TBox[]> {
	let previous = ''

	for (let frame = 0; frame < 60; frame += 1) {
		await nextFrame()
		await Promise.all(
			document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
		)

		const boxes = boxesOf(trigger, parts)
		const current = JSON.stringify(boxes)

		if (boxes.length > 0 && current === previous) return boxes

		previous = current
	}

	throw new Error(`${parts}: открытая панель не встала за 60 кадров`)
}

/** Рамки открытого слоя и его частей — от угла окна: они стоят у края или по центру экрана. */
function windowBoxesOf(parts: string): TBox[] {
	return [...document.querySelectorAll(parts)]
		.filter((node) => node.getClientRects().length > 0)
		.map((node) => {
			const box = node.getBoundingClientRect()

			return {
				x: Math.round(box.left),
				y: Math.round(box.top),
				width: Math.round(box.width),
				height: Math.round(box.height),
			}
		})
}

/**
 * Рамки, когда слой встал: доиграли переходы темы — проявление окна, въезд
 * панели, — и два кадра подряд рамки те же. Перебитый переход отменяется, и
 * его `finished` отклонён: для ожидания это тоже конец, как в `measure`.
 */
export async function measureLayer(parts: string): Promise<TBox[]> {
	let previous = ''

	for (let frame = 0; frame < 60; frame += 1) {
		await nextFrame()
		await Promise.all(
			document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
		)

		const boxes = windowBoxesOf(parts)
		const current = JSON.stringify(boxes)

		if (boxes.length > 0 && current === previous) return boxes

		previous = current
	}

	throw new Error(`${parts}: открытый слой не встал за 60 кадров`)
}
