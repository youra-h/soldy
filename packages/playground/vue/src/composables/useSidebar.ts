import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

/**
 * Узкое окно — меню и контролы шапки прячутся в выезжающие панели: на
 * смартфоне колонка меню в 260px съедала весь экран, а контролы шапки —
 * половину, и до превью было не добраться.
 */
const NARROW = '(max-width: 768px)'

const query =
	typeof window !== 'undefined' && typeof window.matchMedia === 'function'
		? window.matchMedia(NARROW)
		: null

/** Окно узкое — меню и настройки в выезжающих панелях, а не колонкой и в шапке. */
const narrow = ref(query?.matches ?? false)
/** Открыта ли панель меню. В широком окне не действует. */
const menuOpen = ref(false)
/** Открыта ли панель настроек. В широком окне не действует. */
const settingsOpen = ref(false)

// Панелей у широкого окна нет: окно, снова ставшее узким, открывается без них
query?.addEventListener('change', (event) => {
	narrow.value = event.matches

	if (!event.matches) {
		menuOpen.value = false
		settingsOpen.value = false
	}
})

/**
 * Панели узкого окна: меню и настройки. Одни на шапку (кнопки, которые их
 * открывают) и каркас (сами панели).
 *
 * Смена адреса закрывает меню — выбранная страница видна сразу. Настройки
 * она не закрывает: выбор фреймворка меняет адрес, а настроек обычно меняют
 * несколько подряд.
 */
export function useSidebar() {
	const route = useRoute()

	watch(
		() => route.fullPath,
		() => {
			menuOpen.value = false
		},
	)

	return { narrow, menuOpen, settingsOpen }
}
