/**
 * Модальность последнего взаимодействия со страницей — клавиатура или
 * указатель. Ровно то, что браузер сам умеет для `:focus-visible` на
 * `<button>`, но не умеет для текстовых полей: `<input>`/`<select>`
 * матчат `:focus-visible` при фокусе от клика, потому что спека считает
 * их «ожидающими клавиатуру» независимо от того, как пришёл фокус.
 * Эвристика классическая, как в focus-visible-полифиле: `keydown` ставит
 * «последним был клавиатурный ввод», `pointerdown` — сбрасывает.
 *
 * Общий трекер, а не слушатель на каждый инстанс `TActionPlugin`: контролов
 * на странице может быть сотня, а модальность одна на документ. Слушатели
 * вешаются лениво на первое подключение и снимаются, когда ушёл последний
 * потребитель — считает `_usageCount`, а не булев флаг, потому что
 * подключений может быть несколько одновременно.
 */

let lastInputWasKeyboard = true
let usageCount = 0
let attachedDoc: Document | null = null

const onKeyDown = (): void => {
	lastInputWasKeyboard = true
}

const onPointerDown = (): void => {
	lastInputWasKeyboard = false
}

/** Подключиться к трекеру модальности. */
export function acquireFocusModalityTracking(doc: Document): void {
	usageCount++

	if (attachedDoc) return

	attachedDoc = doc
	doc.addEventListener('keydown', onKeyDown, true)
	doc.addEventListener('pointerdown', onPointerDown, true)
}

/** Отключиться от трекера. Снимает слушатели, когда ушёл последний потребитель. */
export function releaseFocusModalityTracking(): void {
	usageCount = Math.max(0, usageCount - 1)

	if (usageCount > 0 || !attachedDoc) return

	attachedDoc.removeEventListener('keydown', onKeyDown, true)
	attachedDoc.removeEventListener('pointerdown', onPointerDown, true)
	attachedDoc = null
}

/** Пришёл ли последний ввод на странице с клавиатуры. */
export function wasLastInputKeyboard(): boolean {
	return lastInputWasKeyboard
}
