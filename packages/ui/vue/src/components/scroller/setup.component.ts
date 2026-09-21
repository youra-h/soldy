import { ScrollerDescriptor } from '@soldy/setup'
import { useAdapter, useIcon, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseScroller, { type ScrollerProps } from './base.component'

/**
 * Логики здесь нет: края ленты и её листание — `TScrollerViewportPlugin`,
 * выключенность кнопок и `tabindex` вьюпорта — ядро. Разметка раскладывает
 * то, что они отдали.
 *
 * Инстанс наружу не отдаётся: нажатия ловит плагин на корне, и обработчику в
 * разметке взяться неоткуда.
 */
export default {
	name: '_Scroller',
	extends: BaseScroller,
	setup(props: ScrollerProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ScrollerDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return {
			...useAdapter(adapter, props, emit),
			/**
			 * Одна иконка на обе кнопки: роли «влево» в контракте иконок нет, и
			 * ту стрелку, что смотрит в начало строки, зеркалит тема.
			 */
			arrowIconTag: useIcon('arrowRight'),
		}
	},
}
