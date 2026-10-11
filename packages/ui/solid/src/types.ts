/**
 * Общие типы Solid-адаптера @soldy-ui/solid.
 */

import type { JSX } from 'solid-js'
import type { IEntity } from '@soldy-ui/core'
import type {
	IComponentDescriptor,
	DescriptorAllProps,
	DescriptorCallbackEvents,
	DescriptorComponentProps,
	DescriptorSlots,
	TContractOf,
	TSlotProps,
} from '@soldy-ui/setup'

/** Событийные пропы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	DescriptorCallbackEvents<TDescriptorFn>

/**
 * Слоты компонента из дескриптора: `default` становится `children`,
 * остальные сохраняют имена. Слот со scope принимает и функцию.
 */
export type SlotProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> = TSlotProps<
	DescriptorSlots<TDescriptorFn>,
	JSX.Element
>

/** Props headless-слоя: core props + события + слоты + служебные поля. */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = DescriptorComponentProps<TDescriptorFn, TInstance> & TEvents & SlotProps<TDescriptorFn>

/**
 * HTML-атрибуты DOM-компонента без пропсов, событий и слотов дескриптора —
 * как `TDomAttributes` у React и Svelte.
 *
 * Вход дескриптора важнее одноимённого атрибута: пересечение сузило бы его до
 * типа атрибута. Слот `title` окна свёлся бы к строке атрибута `title`, а
 * колбэк события `input` у полей — к обработчику `onInput` DOM. В рантайме
 * этих имён в атрибутах и нет: `forward` связки съедает пропсы, события и
 * слоты дескриптора.
 *
 * `children` вычитается всегда, а не только у компонента со слотом `default`:
 * содержимое — это только слот `default`. `DOMAttributes.children` вернул бы
 * его компоненту, чья разметка содержимого не рисует, и содержимое молча
 * пропало бы. Компоненту со слотом `children` даёт `SlotProps`.
 *
 * Защищённые пропсы — тоже: `forward` съедает и их, хотя входа у разметки нет
 * (`DescriptorAllProps` их вычитает). Без вычета атрибут с тем же именем
 * вернул бы вход в тип.
 *
 * События — те, что компонент принимает (`TEvents`): у коллекции это ещё и
 * события фасада.
 */
export type TDomAttributes<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TEvents extends object = EventProps<TDescriptorFn>,
> = Omit<
	JSX.HTMLAttributes<HTMLElement>,
	| 'children'
	| keyof DescriptorAllProps<TDescriptorFn>
	| TContractOf<TDescriptorFn>['protectedName']
	| keyof SlotProps<TDescriptorFn>
	| keyof TEvents
>

/**
 * Props DOM-компонента: UseProps + HTML-атрибуты без конфликтов с пропсами,
 * событиями и слотами дескриптора (см. `TDomAttributes`).
 */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = UseProps<TDescriptorFn, TInstance, TEvents> & TDomAttributes<TDescriptorFn, TEvents>
