/**
 * Общие типы для React-адаптера @soldy-ui/react.
 */

import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import type { IEntity } from '@soldy-ui/core'
import type {
	IComponentDescriptor,
	DescriptorAllProps,
	DescriptorCallbackEvents,
	DescriptorComponentProps,
	DescriptorSlots,
	TSlotProps,
} from '@soldy-ui/setup'

/** Событийные пропсы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	DescriptorCallbackEvents<TDescriptorFn>

/**
 * Слоты компонента из дескриптора: `default` становится `children`,
 * остальные сохраняют имена. Слот со scope принимает и функцию.
 */
export type SlotProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> = TSlotProps<
	DescriptorSlots<TDescriptorFn>,
	ReactNode
>

/** Props headless-компонента: core props + события + слоты + служебные поля. */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = DescriptorComponentProps<TDescriptorFn, TInstance> & TEvents & SlotProps<TDescriptorFn>

/**
 * HTML-атрибуты DOM-компонента без пропсов, событий и слотов дескриптора.
 *
 * Вход дескриптора важнее одноимённого атрибута: пересечение сузило бы его до
 * типа атрибута. `children` из HTMLAttributes объявлен `ReactNode` и убил бы
 * форму-функцию scoped-слота (`ReactNode | ((scope) => ReactNode)`),
 * `content` — атрибут RDFa со строкой — не пустил бы разметку в слот
 * `content` у Label, а `onInput` DOM свёл бы колбэк события `input` у полей с
 * обработчиком `FormEvent` в функцию, которой не написать. В рантайме этих
 * имён в атрибутах и нет: `forward` связки съедает пропсы, события и слоты
 * дескриптора.
 *
 * Это ровно то, что компонент не съел: его `forwardProps` без входов
 * дескриптора. Поле раздаёт их двум элементам — класс и стиль корню,
 * остальное `<input>` (`toControlAttrs`).
 */
export type TDomAttributes<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TAttributes extends object = HTMLAttributes<HTMLElement>,
> = Omit<
	TAttributes,
	| keyof DescriptorAllProps<TDescriptorFn>
	| keyof SlotProps<TDescriptorFn>
	| keyof EventProps<TDescriptorFn>
>

/**
 * Атрибуты `<input>` полей (Input, CheckBox, Switch): всё, кроме того, что
 * поле ведёт само. Текст, отметку и её умолчание проводит поле адаптера
 * (`NativeInput`) из состояния ядра, а `readonly` — вход дескриптора: атрибут
 * `readOnly` рядом с ним был бы вторым путём к тому же состоянию, а `checked`
 * сделал бы поле контролируемым полем React.
 */
export type TFieldAttributes = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	'checked' | 'defaultChecked' | 'defaultValue' | 'readOnly'
>

/**
 * Props DOM-компонента: UseProps + HTML-атрибуты без конфликтов с пропсами,
 * событиями и слотами дескриптора (см. `TDomAttributes`).
 *
 * Атрибуты по умолчанию — `HTMLAttributes` корня; поля берут `TFieldAttributes`:
 * всё, кроме класса и стиля, у них уходит на `<input>`.
 */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
	TAttributes extends object = HTMLAttributes<HTMLElement>,
> = UseProps<TDescriptorFn, TInstance, TEvents> & TDomAttributes<TDescriptorFn, TAttributes>
