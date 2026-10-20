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

/**
 * Пропсы плагина такими, какими их объявляет contribution — без неймспейса.
 *
 * Неймспейс (`aria_label`) навешивает `DescriptorAllProps` в `@soldy-ui/setup`
 * по `namespace` из `definePlugin`; здесь только собственные имена пропсов.
 */
export interface IAriaPluginProps {
	label?: string
	labelledBy?: string
	describedBy?: string
}

/**
 * Ссылки от разметки вокруг компонента — второй вход плагина рядом с
 * пропсами: подпись и пояснение поля формы (`Field`). Пишет их связка поля с
 * контролом, а не разметка компонента, поэтому в контракт они не входят.
 */
export interface IAriaLinks {
	/**
	 * `id` подписи — имя, пока своего нет: своё имя (`label`, `labelledBy`)
	 * главнее
	 */
	readonly labelledBy?: string
	/** `id` пояснения — встаёт в `aria-describedby` перед своим */
	readonly describedBy?: string
}

/**
 * Ссылки на части своей разметки — третий вход плагина: часть компонента без
 * своего экземпляра, которая его поясняет (счётчик символов Textarea). Пишет
 * их плагин связок компонента, а не разметка, поэтому в контракт они не
 * входят, как и `IAriaLinks`. Только пояснение: имя компоненту его часть не
 * даёт.
 */
export interface IAriaParts {
	/**
	 * `id` части-пояснения — встаёт в `aria-describedby` после пояснения поля
	 * формы и перед своим `describedBy`
	 */
	readonly describedBy?: string
}
