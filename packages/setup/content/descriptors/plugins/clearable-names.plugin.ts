/**
 * Определение TClearableNamesPlugin (namespace `names`) — имя кнопки очистки
 * поля от локали, вместе с именем поля.
 *
 * Пропсов нет: плагин пишет в набор поля (`clearAria`), а его разметка уже
 * раскладывает. Ставят его формы поля — Input и DateInput; у DatePicker имя
 * кнопки пишет его наследник `TDatePickerNamesPlugin`.
 */

import { definePlugin } from '../../../protected/define'
import { TClearableNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ClearableNamesPluginDescriptor = definePlugin({
	ctor: TClearableNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
