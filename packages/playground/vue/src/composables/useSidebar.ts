import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

/**
 * Узкое окно — меню прячется в выезжающую панель: на смартфоне колонка в 260px
 * съедала весь экран, и до превью было не добраться.
 */
const NARROW = '(max-width: 768px)'

const query =
	typeof window !== 'undefined' && typeof window.matchMedia === 'function'
		? window.matchMedia(NARROW)
		: null

/** Окно узкое — меню в выезжающей панели, а не колонкой. */
const narrow = ref(query?.matches ?? false)
/** Открыта ли выезжающая панель меню. В широком окне не действует. */
const open = ref(false)

query?.addEventListener('change', (event) => {
	narrow.value = event.matches
	if (!event.matches) open.value = false
})

/**
 * Левая панель оболочки: одна на шапку (кнопка меню) и каркас (панель).
 * Переход по меню закрывает панель — выбранная страница видна сразу.
 */
export function useSidebar() {
	const route = useRoute()

	watch(
		() => route.fullPath,
		() => {
			open.value = false
		},
	)

	return { narrow, open }
}
