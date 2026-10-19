import type { Component } from 'svelte'
import AccordionPreview from './AccordionPreview.svelte'
import ButtonPreview from './ButtonPreview.svelte'
import CheckBoxPreview from './CheckBoxPreview.svelte'
import FieldPreview from './FieldPreview.svelte'
import IconPreview from './IconPreview.svelte'
import InputPreview from './InputPreview.svelte'
import LabelPreview from './LabelPreview.svelte'
import ListBoxPreview from './ListBoxPreview.svelte'
import ProgressSpinnerPreview from './ProgressSpinnerPreview.svelte'
import RadioGroupPreview from './RadioGroupPreview.svelte'
import SkeletonPreview from './SkeletonPreview.svelte'
import SwitchPreview from './SwitchPreview.svelte'
import TablePreview from './TablePreview.svelte'
import TabsPreview from './TabsPreview.svelte'
import VirtualPreview from './VirtualPreview.svelte'

/** Пропсы превью: пропы строки, `ctrl` с экземпляром ядра и колбэки событий хоста. */
export type TPreviewProps = Record<string, unknown>

/**
 * Как рисовать компонент на стенде — в Svelte: компонент превью, который
 * раскладывает готовые пропсы (`bind`) на компонент адаптера.
 *
 * Та же карта, что у хостов Vue и React, и с теми же ключами —
 * идентификаторами реестра: содержимое не свойство, из метаданных его не
 * достать, а разметка у каждого фреймворка своя. Превью то же самое, что у
 * Vue, чтобы колонки фреймворков можно было сравнивать глазами. Разметка
 * Svelte живёт только в `.svelte`, поэтому превью — файлы, а карта — ссылки
 * на них. Содержимое коллекций — из общего манифеста (`COLLECTION_ITEMS`), как
 * у Vue и React. Значения пропов самого компонента — подпись кнопки,
 * плейсхолдер поля — данные, одни на все хосты (`PREVIEW_PROPS` в общем
 * пакете), и в `bind` их кладёт оболочка. Превью — обёртка и содержимое.
 *
 * Слоёв и `frame` здесь нет: во Vue это ComponentView с чужими пропами, а в
 * Svelte чужой проп ушёл бы атрибутом в корень.
 */
export type TPreview = Component<TPreviewProps>

export const PREVIEWS: Record<string, TPreview> = {
	button: ButtonPreview,
	input: InputPreview,
	'check-box': CheckBoxPreview,
	switch: SwitchPreview,
	label: LabelPreview,
	field: FieldPreview,
	'radio-group': RadioGroupPreview,
	'list-box': ListBoxPreview,
	table: TablePreview,
	tabs: TabsPreview,
	accordion: AccordionPreview,
	icon: IconPreview,
	'progress-spinner': ProgressSpinnerPreview,
	skeleton: SkeletonPreview,
	virtual: VirtualPreview,
}
