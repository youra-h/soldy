import type { TPluginEvents } from '../../base'

/**
 * Настройки TAriaPlugin.
 */
export interface IAriaPluginOptions {
	/**
	 * Роль, которую элемент принимает, как только у него появилось имя.
	 *
	 * Нужна там, где без имени элемент декоративен: `TIcon` по умолчанию
	 * отдаёт `aria-hidden="true"`, а с именем обязан стать `role="img"`.
	 * Компонентам, у которых роль не зависит от наличия имени, не нужна.
	 */
	role?: string
}

export type TAriaPluginEvents = TPluginEvents & {
	/** change:label */
	'change:label': (value: string | undefined) => void
	/** change:labelledBy */
	'change:labelledBy': (value: string | undefined) => void
	/** change:describedBy */
	'change:describedBy': (value: string | undefined) => void
}
