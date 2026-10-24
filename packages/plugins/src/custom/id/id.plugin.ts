import { TBasePlugin } from '../../base'
import type { TIdPluginEvents } from './types'

/**
 * TIdPlugin — `id`, который приложение задаёт узлу компонента, на который
 * ссылаются по `id`.
 *
 * Такой узел — поле формы (на него ведут `<label for>` и `aria-labelledby`
 * разметки приложения и `for` подписи `Field`) и строка элемента, на которую
 * ссылается сама библиотека: элемент списка и опция (`aria-activedescendant`),
 * таб, заголовок секции, строка пункта меню со своей панелью (`aria-controls`
 * и `aria-labelledby` панели). У остальных компонентов `id` приложения — просто
 * атрибут корня, и знать его библиотеке незачем.
 *
 * `id` — понятие документа, поэтому его держит плагин, а не ядро (a11y.md,
 * «`id` в разметке — от монтирования, в плагинах»), и держит в одном месте на
 * все такие компоненты. Сам плагин в разметку ничего не пишет: на узел `id`
 * кладёт тот, кто этот узел рисует, — поле шаблон из состояния, строку
 * элемента плагин связок, который без `id` приложения берёт `id` от
 * монтирования (`ctx.createId`) и на `change:id` переписывает обе стороны
 * ссылки.
 *
 * Не задан — `undefined`.
 */
export class TIdPlugin extends TBasePlugin<any, TIdPluginEvents> {
	/** Умолчания опций, объявленных пропами, — см. `TDismissPlugin.defaultValues`. */
	static defaultValues: { id: string | undefined } = {
		id: undefined,
	}

	private _id = TIdPlugin.defaultValues.id

	get id(): string | undefined {
		return this._id
	}

	set id(value: string | undefined) {
		if (this._id === value) return

		this._id = value
		this.events.emit('change:id', value)
	}
}
