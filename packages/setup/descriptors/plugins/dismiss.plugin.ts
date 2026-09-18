import { definePlugin } from '../../define'
import { TDismissPlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type {
	IDismissPluginOptions,
	TDismissPluginEvents,
	IDismissPluginProps,
} from '@soldy/plugins'

/**
 * Защищённый проп плагина в разметке — с неймспейсом.
 *
 * Вход `dismiss_enabled` типизирует дескриптор: `IDismissPluginProps` третьим
 * аргументом `definePlugin`. Защищённых пропсов `DescriptorAllProps` не несёт,
 * а шаблон Select раскладывает `dismiss_ownerAttribute` спредом на
 * телепортированную панель — спреду нужен объектный тип. `layout_styles`
 * обходится без типа только потому, что уходит в `:style` динамического
 * `<component :is>`: его атрибуты vue-tsc не проверяет.
 */
export type TDismissPluginProps = {
	dismiss_ownerAttribute?: Record<string, string>
}

/**
 * «Нажали мимо» — общий слой для всего, что открывается поверх страницы:
 * Select, Menu, Popover, Tooltip.
 *
 * Подключается адресно, а не к `ControlDescriptor`: у обычной кнопки или поля
 * закрывать нечего, а глобальный слушатель на документе стоил бы на каждом
 * контроле страницы.
 */
export const DismissPluginDescriptor = (options?: IDismissPluginOptions) =>
	definePlugin<'dismiss', TDismissPluginEvents, IDismissPluginProps>({
		ctor: TDismissPlugin,
		namespace: 'dismiss',
		/**
		 * `enabled` пишется снаружи: пока панель закрыта, глобальный слушатель не
		 * нужен. `ownerAttribute` — вычисляемый: разметка вешает его на
		 * телепортированную панель, чтобы нажатие внутри неё не считалось нажатием
		 * мимо.
		 *
		 * Событие `dismiss` выведено наружу: закрывать или нет — решает потребитель,
		 * плагин только сообщает.
		 */
		contribution: {
			events: [...PLUGIN_EVENTS, 'dismiss'],
			props: {
				enabled: { type: Boolean, triggers: ['change:enabled'] },
				/**
				 * Значение постоянное — строится из `uid` владельца. Триггер всё равно
				 * нужен: проп без триггеров адаптер считает pass-through и наружу не
				 * отдаёт. `create` — момент, когда плагин объявлен готовым.
				 */
				ownerAttribute: { type: Object, protected: true, triggers: ['create'] },
			},
		},
		options,
	})
