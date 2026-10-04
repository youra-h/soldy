import { computed, onScopeDispose, ref, watchEffect } from 'vue'
import { useMotion } from '@soldy-ui/plugins'
import type { TMotionMode } from '@soldy-ui/plugins'
import { MOTION_MODES } from '@soldy-ui/playground-shared'

const STORAGE_KEY = 'soldy-playground-motion'

/** Медиазапрос настройки системы: пользователь просит меньше движения. */
const SYSTEM_REDUCE = '(prefers-reduced-motion: reduce)'

/** Почему движение выключено: так просит система или так выбрано на стенде. */
export type TMotionOffReason = 'system' | 'stand'

/** Режим ли это движения — у значения из хранилища и из списка в шапке. */
function isMotionMode(value: unknown): value is TMotionMode {
	return typeof value === 'string' && Object.hasOwn(MOTION_MODES, value)
}

const mode = ref<TMotionMode>('system')

try {
	const saved = localStorage.getItem(STORAGE_KEY)

	if (isMotionMode(saved)) mode.value = saved
} catch {
	// Приватный режим или заблокированное хранилище — не повод падать
}

/**
 * Режим движения библиотеки на стенде: посмотреть компоненты с движением и
 * без, не трогая настройку системы.
 *
 * Режим стенд держит сам и на каждую смену отдаёт библиотеке (`useMotion`).
 * Подписки и геттера режима у библиотеки нет и ради стенда не появляется:
 * смену зовёт сам стенд, значит и знает о ней без посредника — тот же приём,
 * что у пакета иконок (`useIconPack`). Атрибут, который пишет `useMotion`,
 * стенд не читает: это контракт библиотеки с темой.
 *
 * Выключено ли движение, стенд тоже считает сам: режим «без движения» — или
 * режим системы, когда система просит меньше движения. Ответ системы —
 * медиазапрос, на смену которого подписан вызов, пока жив его владелец.
 * Без `matchMedia` (jsdom) система о движении не просит.
 *
 * Режим общий на всё приложение (модульный `ref`), как тема (`useTheme`).
 */
export function useMotionMode() {
	const systemReduces = ref(false)

	if (typeof window.matchMedia === 'function') {
		const query = window.matchMedia(SYSTEM_REDUCE)
		const update = () => {
			systemReduces.value = query.matches
		}

		update()
		query.addEventListener('change', update)
		onScopeDispose(() => query.removeEventListener('change', update))
	}

	watchEffect(() => {
		useMotion(mode.value)

		try {
			localStorage.setItem(STORAGE_KEY, mode.value)
		} catch {
			// см. выше
		}
	})

	/** Почему движение выключено; `undefined` — движение есть. */
	const offReason = computed<TMotionOffReason | undefined>(() => {
		if (mode.value === 'reduce') return 'stand'
		if (mode.value === 'system' && systemReduces.value) return 'system'

		return undefined
	})

	/** Выбрать режим: значение из списка в шапке, другое ничего не меняет. */
	function choose(value: unknown): void {
		if (isMotionMode(value)) mode.value = value
	}

	return { mode, modes: MOTION_MODES, offReason, choose }
}
