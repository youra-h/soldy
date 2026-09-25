/**
 * Остановки Tab — элементы, на которые браузер ставит фокус клавишей Tab, в
 * порядке документа.
 *
 * Браузер этот порядок наружу не отдаёт, поэтому он восстанавливается по
 * разметке: что фокусируется само, что получило `tabindex`, что выключено.
 * Раскладку поиск не проверяет — в jsdom её нет, а в браузере скрытый
 * элемент сам не примет фокус: кандидатов перебирают по очереди, пока один
 * не примет (`focusFirst`). Положительный `tabindex` порядок не меняет: он
 * ломает порядок обхода и в APG не рекомендован.
 *
 * Живёт в общих утилитах, а не у модели фокуса Popover: спрашивают об этом
 * трое — поповер (куда уводить фокус), лента (становиться ли ей самой
 * остановкой Tab) и жест выезжающей панели (не контрол ли под указателем,
 * `closestControl`). Свой список селекторов у любого из них был бы вторым
 * путём к тому же знанию.
 */

/** Элементы, которые встают в порядок Tab сами, без `tabindex`. */
const NATIVE_STOPS = [
	'a[href]',
	'area[href]',
	'button',
	'input:not([type="hidden"])',
	'select',
	'textarea',
	'iframe',
	'audio[controls]',
	'video[controls]',
	'summary',
	'[contenteditable]:not([contenteditable="false"])',
].join(',')

const CANDIDATES = `${NATIVE_STOPS},[tabindex]`

/** Остановки Tab внутри узла или документа, в порядке документа. */
export function tabStops(scope: ParentNode): Element[] {
	return [...scope.querySelectorAll(CANDIDATES)].filter(isTabStop)
}

/**
 * Контрол, в котором лежит узел, — ближайший кандидат в остановки Tab между
 * узлом и `scope` (сам `scope` не в счёт): поле, кнопка, ссылка, всё с
 * `tabindex`. `null` — узел лежит в разметке без контрола.
 *
 * Кандидат, а не остановка: выключенное поле, радио не первое в группе и
 * строка с `tabindex="-1"` в roving tabindex остановками не бывают, но с ними
 * работают указателем. Об этом спрашивает жест выезжающей панели — тянуть её
 * можно за любое место, кроме контролов. Список тот же, что у остановок:
 * свой набор селекторов разошёлся бы с ним.
 */
export function closestControl(node: Element, scope: Element): Element | null {
	const control = node.closest(CANDIDATES)

	return control && control !== scope && scope.contains(control) ? control : null
}

function isTabStop(element: Element): boolean {
	const tabindex = explicitTabIndex(element)

	if (tabindex === null ? !element.matches(NATIVE_STOPS) : tabindex < 0) return false

	if (element.matches(':disabled') || element.closest('[inert]')) return false

	return isRadioStop(element)
}

/** Значение атрибута `tabindex`; `null` — атрибута нет или он не число. */
function explicitTabIndex(element: Element): number | null {
	const value = element.getAttribute('tabindex')

	if (value === null) return null

	const parsed = Number.parseInt(value, 10)

	return Number.isNaN(parsed) ? null : parsed
}

/**
 * Группа радио с общим `name` — одна остановка: выбранное радио, а если
 * выбранного нет — первое. По остальным ходят стрелки. Без этого последним в
 * панели считалось бы последнее радио группы, и Tab с выбранного первого
 * уводил бы фокус мимо правила «из панели — к тому, что за триггером».
 */
function isRadioStop(element: Element): boolean {
	if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name) {
		return true
	}

	const group = radioGroup(element)
	const checked = group.find((radio) => radio.checked)

	return checked ? checked === element : group[0] === element
}

function radioGroup(radio: HTMLInputElement): HTMLInputElement[] {
	const scope = radio.form ?? radio.ownerDocument

	return [...scope.querySelectorAll('input[type="radio"]')].filter(
		(candidate): candidate is HTMLInputElement =>
			candidate instanceof HTMLInputElement &&
			candidate.name === radio.name &&
			candidate.form === radio.form,
	)
}
