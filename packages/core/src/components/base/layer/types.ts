import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
	TComponentViewStates,
} from '../component-view'

/**
 * Атрибут слоя: показанный слой пишет в `dataset` тот же номер, что в
 * `zIndex`. Больше номер — выше слой, открытый позже.
 *
 * По нему плагины оверлея узнают вложенность в DOM, где её нет: панели
 * телепортированы в `body` и лежат там соседями. Нажатие и фокус в панели
 * слоя выше своей `TDismissPlugin` считает нажатием внутри — так список
 * Select в поповере или в модальном окне и поповер в поповере не закрывают
 * внешний слой.
 *
 * Имя с префиксом `data-`: по нему ищут в DOM, а `dataset` принимает имя с
 * префиксом как есть. Имя константы осталось от Frame, первого слоя: номер
 * пишет любой слой (`TLayer`) — Frame, окно и выезжающая панель.
 */
export const FRAME_LAYER_ATTRIBUTE = 'data-layer'

export interface ILayerProps extends IComponentViewProps {
	/** CSS-селектор для Teleport (по умолчанию body) */
	target?: string
}

export type TLayerEvents = TComponentViewEvents & {
	/** change:zIndex — слой показан и поднят над всеми, кого показали раньше */
	'change:zIndex': (value: number) => void
	/** change:target */
	'change:target': (value: string) => void
}

export interface ILayer<
	TProps extends ILayerProps = ILayerProps,
	TEvents extends Record<string, (...args: any) => any> = TLayerEvents,
	TStates extends TComponentViewStates = TComponentViewStates,
> extends IComponentView<TProps, TEvents, TStates> {
	/** Текущий z-index (readonly): номер слоя в общем стеке */
	readonly zIndex: number
	/** Целевой элемент для Teleport */
	target: string
}

/**
 * Чем пользователь закрывает слой: кнопкой закрытия, нажатием мимо, Escape
 * или жестом — выезжающую панель смахивают к её краю.
 *
 * Причина — только у закрытия, которое решил пользователь. Запись
 * открытости (`visible = false` из кода, `v-model`) — решение того, кто её
 * пишет, и запросом не считается.
 */
export type TCloseReason = 'button' | 'outside' | 'escape' | 'swipe'

/**
 * Владелец, который закрывается запросом, а не записью открытости.
 *
 * Плагины слоя — нажатие мимо, Escape — узнают его тип-гардом
 * `isCloseRequestable` и закрывают запросом с причиной; владельца без
 * запроса (Popover, Select) закрывают записью, как раньше. Решает запрос
 * владелец: пропустить закрытие, отклонить его или отдать подписчику
 * отменяемое событие.
 */
export interface ICloseRequestable {
	/** Пользователь закрывает слой — закрыть, если владелец не против. */
	requestClose(reason: TCloseReason): void
}
