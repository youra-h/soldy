/**
 * Определение TListScrollPlugin (namespace `scroll`) — прокрутка списка к
 * элементу за двумя фактами: элементу задали значение и на нём встала видимая
 * подсветка. Одна у ListBox, Select, меню и подменю.
 *
 * Чью подсветку слушать, дескриптор называет опцией — классом навигации своего
 * списка, которая стоит в наборе раньше:
 * `ListScrollPluginDescriptor.with({ navigation: TListKeyboardPlugin })`. Набор
 * находит плагин по точному классу, а наследников у базы навигации несколько.
 * Без опции прокрутка идёт только за значением.
 *
 * Пропсов нет: как прокручивать, плагин читает у владельца (`scrollBehavior`),
 * у меню — умолчание списков.
 */

import { definePlugin } from '../../../protected/define'
import { TListScrollPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ListScrollPluginDescriptor = definePlugin({
	ctor: TListScrollPlugin,
	namespace: 'scroll',
	contribution: { events: [...PLUGIN_EVENTS] },
})
