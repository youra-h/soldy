/**
 * Контракт шаблона: фреймворка нет, и шаблон — описание структуры плюс
 * привязки «проп → DOM-операция». Привязка знает свои пропы, и на флаше
 * применяются только те, чьи пропы сменились. То, что ядро пишет на корень,
 * раскладывает база, шаблону остаётся своё. AGENTS.md (Web Components),
 * «Шаблон».
 */

import type { TBindingState } from '../runtime/useAdapter'

/**
 * Куда содержимое слота: внутрь узла, перед ним (слоты-соседи без обёрток,
 * которых нет у остальных адаптеров) или образцом — копию отдаёт `sample`.
 * `slot` — точка ведёт в слот детали шаблона: узлы назначаются ему.
 */
export type TSlotTarget =
	| { mode: 'append'; node: HTMLElement; slot?: string }
	| { mode: 'before'; node: Node; slot?: string }
	| { mode: 'sample' }

/** Порядок ключей значим: в одну точку `append` раньше встаёт слот, объявленный раньше. */
export type TSlotTargets = Record<string, TSlotTarget>

export type TTemplateParts = {
	readonly slots: TSlotTargets
	/** Поле корня (`control` в описании корня): на него едет статика разметки элемента. */
	readonly control?: HTMLElement
	/** Корень внутри элемента-обёртки: `table` в окне, регион тостов. */
	readonly root?: HTMLElement
	/** Спутник корня слоя — подложка: стоит перед корнем, ездит и прячется с ним. */
	readonly companion?: HTMLElement
}

/**
 * Живой вид элемента: `state`, `ctrl` и `facade` читаются в момент обращения,
 * и обработчик, заведённый при построении, после перестановки зовёт новую
 * связку.
 */
export interface ITemplateContext<
	TInstance = object,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
> {
	/** Сам элемент; у обёртки — узел вокруг корня. */
	readonly root: HTMLElement
	/** Узел слота по умолчанию. */
	readonly content: HTMLElement
	readonly state: TBindingState<TInstance, TFacade, TOutputs, TOwnerFacade>
	readonly ctrl: TInstance | undefined
	readonly facade: TFacade | undefined
	hasSlot(name: string): boolean
	/** Узлы слота потребителя, а не копии: набор триггера ложится на них на месте. */
	slotted(name: string): readonly ChildNode[]
	sample(name: string): DocumentFragment | null
	/** Слот, который выводит привязка: снятое уходит из документа. */
	showSlot(name: string, shown: boolean): void
}

export interface ITemplateBinding<
	TInstance = object,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
> {
	props: readonly string[]
	apply(ctx: ITemplateContext<TInstance, TFacade, TOutputs, TOwnerFacade>): void
}

export interface ITemplate<
	TInstance = object,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
> {
	/**
	 * Структура в корне — один раз, при первом подключении. Заданные слоты уже
	 * известны (`ctx.hasSlot`): обёртку слота шаблон строит, только когда в неё
	 * есть что положить.
	 */
	create(
		root: HTMLElement,
		ctx: ITemplateContext<TInstance, TFacade, TOutputs, TOwnerFacade>,
	): TTemplateParts

	bindings: readonly ITemplateBinding<TInstance, TFacade, TOutputs, TOwnerFacade>[]
}

export function bind<TInstance, TFacade = unknown, TOutputs = unknown, TOwnerFacade = unknown>(
	props: string | readonly string[],
	apply: (ctx: ITemplateContext<TInstance, TFacade, TOutputs, TOwnerFacade>) => void,
): ITemplateBinding<TInstance, TFacade, TOutputs, TOwnerFacade> {
	return {
		props: typeof props === 'string' ? [props] : props,
		apply,
	}
}
