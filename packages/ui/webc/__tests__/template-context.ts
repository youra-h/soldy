/**
 * Контекст шаблона без элемента — для сверки точек слотов с дескриптором.
 *
 * `create()` шаблона получает живой вид элемента (`ITemplateContext`), и
 * обработчики, которые шаблон заводит на узлах, берут из него связку в момент
 * события. Сверке точек связка не нужна: шаблон строит структуру в пустом
 * корне, где ни один слот не задан, и до сборки у него нет ни состояния, ни
 * инстанса, ни фасада.
 */

import type { ITemplateContext } from '@soldy-ui/webc'

export function bareContext<TInstance, TFacade>(
	root: HTMLElement,
): ITemplateContext<TInstance, TFacade> {
	return {
		root,
		content: root,
		state: {},
		ctrl: undefined,
		facade: undefined,
		hasSlot: () => false,
		showSlot: () => {},
		sample: () => null,
	}
}
