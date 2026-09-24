import { FRAME_LAYER_ATTRIBUTE } from '@soldy-ui/core'

/**
 * Номер слоя узла (`data-layer`); `null` — узла нет или слоя у него нет.
 *
 * Номер пишет показанный слой (`TLayer` — Frame и модальное окно,
 * `FRAME_LAYER_ATTRIBUTE`): больше номер — выше слой, открытый позже.
 *
 * Живёт в общих утилитах, а не у `TDismissPlugin`: по слоям решают двое —
 * «нажали мимо» и то, что прячет фон модального слоя от скринридера
 * (`THideOutsidePlugin`). Своё чтение атрибута у второго разошлось бы с
 * первым.
 */
export function layerOf(element: Element | null): number | null {
	const value = element?.getAttribute(FRAME_LAYER_ATTRIBUTE)

	if (value === null || value === undefined) return null

	const layer = Number(value)

	return Number.isFinite(layer) ? layer : null
}
