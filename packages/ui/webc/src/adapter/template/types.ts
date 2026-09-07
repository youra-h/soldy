/**
 * Контракт шаблона Web Components.
 *
 * Фреймворка нет, поэтому шаблон — это не разметка, а описание структуры плюс
 * привязки «проп → DOM-операция». Такое описание даёт то же, что даёт шаблон в
 * остальных адаптерах: вынесено в отдельный файл и не смешано с классом.
 *
 * Точечность обновлений берётся отсюда: `useSyncProps` уже сообщает, КАКОЙ
 * проп изменился, а привязка знает, за какие пропы она отвечает. Значит при
 * смене `text` не нужно трогать `className`.
 *
 * Структурные props (`rendered`, `tag`, `classes`, `visible`) применяет сам
 * базовый класс: они одинаковы у всех визуальных компонентов soldy.
 */

import type { TWebcState } from '../runtime/useSyncProps'

export interface ITemplateContext {
	/** Корневой элемент внутри хоста */
	root: HTMLElement
	/** Узел, в который перенесено пользовательское содержимое */
	content: HTMLElement
	state: TWebcState
	/** Пользователь задал содержимое внутри тега */
	hasLight: boolean
}

export interface ITemplateBinding {
	/** Пропы, при изменении которых привязку надо применить */
	props: readonly string[]
	apply(ctx: ITemplateContext): void
}

export interface ITemplate {
	/** Имя тега корня из состояния */
	tag(state: TWebcState): string

	/**
	 * Строит внутреннюю структуру корня.
	 * Возвращает узел, в который базовый класс положит пользовательское
	 * содержимое (для простых компонентов — сам корень).
	 */
	create(root: HTMLElement): HTMLElement

	bindings: readonly ITemplateBinding[]
}

/** Объявление привязки: bind('text', ctx => ...) или bind(['a','b'], ...) */
export function bind(
	props: string | readonly string[],
	apply: (ctx: ITemplateContext) => void,
): ITemplateBinding {
	return {
		props: typeof props === 'string' ? [props] : props,
		apply,
	}
}
