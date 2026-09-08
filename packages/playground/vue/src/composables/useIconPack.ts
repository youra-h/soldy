import { ref } from 'vue'
import { setIcons } from '@soldy/setup'
import { ICON_PACKS } from '@soldy/playground-shared'
import * as material from '@soldy/icons-material'

/** Пакеты по идентификатору из общего реестра. */
const PACKS: Record<string, Record<string, { viewBox: string; body: string }>> = {
	material: material as never,
}

const pack = ref(ICON_PACKS[0].id)

/**
 * Счётчик смен набора.
 *
 * Нужен потому, что `useIcon` резолвит роль **на отрисовке** — иначе `setIcons`
 * нельзя было бы вызвать позже старта приложения. Обратная сторона: реактивных
 * зависимостей у `getIcon` нет, и сменив пакет, Vue об этом не узнает.
 * Счётчик подставляется в `key` превью и заставляет перерисовать всё, что
 * рисует иконки.
 *
 * Подписки на реестр иконок для этого не нужно: смену вызывает сам стенд, вот
 * здесь, — значит и знает о ней без посредника. Приложению такое переключение
 * не нужно вовсе (`setIcons` зовут один раз при старте), поэтому и в библиотеке
 * ему делать нечего.
 */
const version = ref(0)

export function useIconPack() {
	function apply(id: string): void {
		const next = PACKS[id]

		if (!next || id === pack.value) return

		pack.value = id
		setIcons(next)
		version.value++
	}

	return { pack, packs: ICON_PACKS, version, apply }
}
