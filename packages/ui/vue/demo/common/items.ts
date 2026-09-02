/**
 * Общие списки для селекторов в демо-компонентах
 */
import type { TComponentSize, TComponentVariant, TButtonView } from '@soldy/core'

/** Размеры компонентов */
export const SIZES: TComponentSize[] = ['sm', 'normal', 'lg', 'xl', '2xl']

/** Варианты компонентов */
export const VARIANTS: TComponentVariant[] = ['normal', 'accent', 'negative', 'caution', 'positive']

/** HTML теги для ComponentView */
export const HTML_TAGS = ['div', 'span', 'section', 'article', 'header', 'footer', 'main', 'aside']

/** Внешний вид кнопок */
export const BUTTON_APPEARANCES: TButtonView[] = ['filled', 'plain', 'outlined', 'none']

/** Иконки из @soldy/icons (можно расширить) */
export const ICON_PATHS = [
	'home',
	'checkIndeterminate',
	'check',
	'close',
]
