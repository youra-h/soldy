import type { ReactElement } from 'react'
import { Elevate, renderSlot } from '../../adapter'
import { useSetupDragAndDrop } from './setup.component'
import type { DragAndDropProps } from './base.component'

/**
 * DragAndDrop — перестановка элементов коллекций перетаскиванием: элементы
 * Tabs, ListBox и Accordion внутри переставляют жестом, а о перестановке
 * сообщают события обёртки — `onMoveBefore` (отмена — `preventDefault()`) и
 * `onMove`.
 *
 * Своего узла у обёртки нет, как у Vue: разметка — только дети, в слое лифта
 * обёртки (`Elevate`). По нему проводка обёртки опускает коллекциям свой
 * экземпляр, а коллекция подхватывает его своей сборкой. Пересобранная
 * обёртка (StrictMode, `<Activity>`) без `ctrl` опускает новый экземпляр, и
 * коллекция пересобирается вслед за ней: сменилось прочитанное через лифт.
 */
export function DragAndDrop(props: DragAndDropProps): ReactElement {
	const { layer } = useSetupDragAndDrop(props)

	return <Elevate layer={layer}>{renderSlot(props.children)}</Elevate>
}
