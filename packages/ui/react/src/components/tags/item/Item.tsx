import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../../adapter'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { useSetupTagsItem } from './setup.component'
import type { TagsItemAttributes, TagsItemProps } from './base.component'

/** Глиф крестика без слота — компонент на роль: `tag` у Icon — корень, а не роль. */
const CloseIcon = roleIcon('close')

/**
 * TagsItem — тег: корень по `tag` (по умолчанию `div`), внутри строка —
 * `Button` на `div` — и кнопка закрытия рядом с ней, как у Vue.
 *
 * Наборы ядра стоят там же, где у Vue. Корень — пилюля тега: на нём `dataset`
 * (тема красит выбранный тег по `data-selected`), `attrs` и место в коллекции
 * (`order`). Вид набора рисует корень, а не строка: фон, рамка, наведение и
 * выбор обязаны покрывать и крестик, а он стоит рядом со строкой. Строке и
 * крестику вид не передаётся — части тега тема красит по контексту
 * (`.so-tags-item`).
 *
 * Строка несёт `aria` — роль по режиму набора (`listitem` без выбора, `option`
 * с выбором), `aria-selected` и `tabindex` от коллекции: с выбором весь набор
 * — одна остановка Tab, без выбора у строк `-1`. Набор перекрывает остановку,
 * которую `Button` на `div` ставит себе сам. Атрибуты потребителя делятся, как
 * у ListBox.Item: класс и стиль — корню, остальное — строке, поверх её `aria`.
 * `direction` — явно: строка — свой узел, и направление письма ей передаётся,
 * а не только наследуется. Тег строки фиксирован (`div`): `tag` — тег корня,
 * под фиксированный тег строки написан `TTagsItem._ariaTag`.
 *
 * Выбор — по `action:press` строки, а не по клику: строка — `div`, фокус
 * держит она сама, и клик из Enter и пробела на ней делает её
 * `TActionPlugin`. `press` не приходит на выключенный тег, а
 * `TSelectionExtension.toggle` выключенность не проверяет — на клик
 * выключенный тег выбирался бы.
 *
 * Кнопка закрытия — сосед строки, а не её часть: потомки опции для
 * скринридера презентационны, и подпись крестика приклеилась бы к названию
 * тега. Имя кнопке ядро собирает вместе с текстом тега (`closeAria`), в том же
 * наборе — `tabindex="-1"` с выбором. Рисуется она по итогу закрываемости
 * фасада (`tag_closable`), размер и `disabled` — явно: от строки она их не
 * наследует.
 *
 * Закрывает кнопка по `onActionClick` — нативному клику её `TActionPlugin` — и
 * гасит всплытие у нативного события, как крестик таба. Синтетический
 * `stopPropagation` React этого не сделал бы: к нему событие уже прошло корни
 * тега и набора, их `TActionPlugin` отдал бы `action:press` на клик по
 * крестику, а поле Select, в котором стоят теги, открыло бы по нему панель.
 * Vue гасит то же `@click.stop`.
 */
export function TagsItem(props: TagsItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupTagsItem(props)

	const {
		rendered,
		tag,
		text,
		direction,
		disabled,
		size,
		variant,
		selected,
		tag_closable,
		closeAria,
		aria,
		dataset,
		attrs,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<Button
				embedded="tags.row"
				tag="div"
				direction={direction}
				disabled={disabled}
				size={size}
				variant={variant}
				{...toAriaProps(aria)}
				{...toControlAttrs<TagsItemAttributes>(forwardProps)}
				onActionPress={() => context?.adapters.selection.toggle()}
				leading={renderSlot(props.leading)}
				trailing={renderSlot(props.trailing)}
			>
				{renderSlot(props.children, { text: text ?? '', selected: selected ?? false }) ??
					text}
			</Button>
			<Button
				embedded="tags.close"
				type="button"
				rendered={tag_closable === true}
				className="so-tags-item__close"
				disabled={disabled}
				size={size}
				{...toAriaProps(closeAria)}
				onActionClick={(event) => {
					event.stopPropagation()
					context?.adapters.tags.close()
				}}
			>
				{renderSlot(props['close-icon']) ?? (
					<Icon embedded="tags.close-icon" tag={CloseIcon} size={size} />
				)}
			</Button>
		</Tag>
	)
}
