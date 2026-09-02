/**
 * Общие списки для селекторов и событий в демо-компонентах.
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

/**
 * Raw-имена событий компонентов (совпадает с emits из Vue-демо).
 * React-адаптер пробрасывает их наружу как колбэки onXxx.
 */
export const COMPONENT_VIEW_EVENTS = [
	'show',
	'hide',
	'show:before',
	'show:after',
	'hide:before',
	'hide:after',
	'ready',
	'element:ready',
	'element:removed',
	'change:rendered',
	'change:visible',
	'change:tag',
	'change:classes',
] as const

export const BUTTON_EVENTS = [
	...COMPONENT_VIEW_EVENTS,
	'change:size',
	'change:variant',
	'change:disabled',
	'change:focused',
	'change:text',
	'change:view',
] as const
