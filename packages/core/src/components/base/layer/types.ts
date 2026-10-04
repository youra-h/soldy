import type { IComponentView, IComponentViewProps, TComponentViewEvents } from '../component-view'

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
> extends IComponentView<TProps, TEvents> {
	/** Текущий z-index (readonly): номер слоя в общем стеке */
	readonly zIndex: number
	/** Целевой элемент для Teleport */
	target: string
}

/**
 * Чем пользователь закрывает слой: кнопкой закрытия, нажатием мимо, Escape
 * или жестом — слой смахивают (`ISwipeable`).
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

/**
 * За что слой смахивают, чтобы закрыть: ни за что (по умолчанию), за полосу у
 * края или за любое место, кроме контролов и областей, которые прокручиваются
 * вдоль оси жеста.
 *
 * Не `draggable`: это имя занято HTML-перетаскиванием и `TDragPlugin`. Значение
 * читают плагин жеста и разметка — это union ядра, а не реестр темы.
 */
export type TSwipe = 'none' | 'handle' | 'panel'

/**
 * Куда слой уходит жестом: к началу или концу строки, вверх или вниз. `start`
 * и `end` — логические: в RTL жест зеркалится вместе со слоем.
 */
export type TSwipeSide = 'start' | 'end' | 'top' | 'bottom'

/** События смахиваемого слоя: его карта событий их включает. */
export type TSwipeableEvents = {
	/** change:swipe */
	'change:swipe': (value: TSwipe) => void
	/** change:swipeSide — слой стал уходить жестом к другой стороне */
	'change:swipeSide': (value: TSwipeSide | null) => void
	/** change:swiping — жест начался или кончился */
	'change:swiping': (value: boolean) => void
}

/**
 * Слой, который смахивают, чтобы закрыть: выезжающая панель, поповер.
 *
 * Жест ведёт плагин оверлея, и говорит он только с этим контрактом: сдвиг во
 * время жеста — операция над узлом панели, и через обмен на каждом кадре он не
 * ходит. Ядро держит значения — за что тянуть, куда слой уходит и признак
 * «тянут». Закрывает плагин, как нажатие мимо и Escape: запросом с причиной
 * `swipe` у владельца, который его принимает (`ICloseRequestable`), остальных
 * — записью открытости.
 *
 * Тип-гард — `isSwipeable`: плагин берёт владельца рефлексией и класса ядра не
 * требует.
 */
export interface ISwipeable {
	/** За что слой смахивают: ни за что, за полосу или за любое место */
	swipe: TSwipe
	/**
	 * Куда слой уходит жестом. `null` — сторону решает якорь: панель у триггера
	 * встаёт под ним или над ним, и после flip сторону знает только её узел.
	 * Ось у такого слоя — вертикальная.
	 */
	readonly swipeSide: TSwipeSide | null
	/** Идёт жест: слой тянут, и тема не анимирует его сдвиг */
	readonly swiping: boolean
	/**
	 * Жест начался: слой тянут. Отказ — у закрытого слоя и при выключенном
	 * жесте.
	 *
	 * @returns начался ли жест
	 */
	beginSwipe(): boolean
	/** Жест кончился: слой отпустили или жест отменён. Закрывает его не он, а плагин */
	endSwipe(): void
}
