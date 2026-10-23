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
import type { TConsumerRef } from './adapter'

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
 * HTML-атрибуты DOM-компонента без входов, слотов и событий дескриптора — то, что
 * компонент не съел (`forwardProps`). `children` и защищённые имена вычитаются всегда
 * (docs/agents/setup.md); `ref` — всегда корень компонента (`TConsumerRef`).
 */
export type TDomAttributes<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TEvents extends object = EventProps<TDescriptorFn>,
	TAttributes extends object = JSX.HTMLAttributes<HTMLElement>,
> = Omit<
	TAttributes,
	| 'children'
	| 'ref'
	| keyof DescriptorAllProps<TDescriptorFn>
	| TContractOf<TDescriptorFn>['protectedName']
	| keyof SlotProps<TDescriptorFn>
	| keyof TEvents
> & {
	/** Корень компонента — узел, на который ложатся класс и атрибуты потребителя. */
	ref?: TConsumerRef
}

/**
 * Атрибуты `<input>` полей без того, что поле ведёт само: отметки (из ядра),
 * `readOnly` (вход `readonly`) и `ref` (`fieldText`; `ref` потребителя — корню).
 */
export type TFieldAttributes = Omit<
	JSX.InputHTMLAttributes<HTMLInputElement>,
	'checked' | 'prop:indeterminate' | 'readonly' | 'readOnly' | 'ref'
>

/**
 * Атрибуты `<textarea>` без того, что поле ведёт само: имён DOM входов `readonly` и
 * `maxlength`, содержимого (текст — вход `value`) и `ref` (`textareaText`).
 */
export type TTextareaAttributes = Omit<
	JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
	'readonly' | 'readOnly' | 'maxlength' | 'maxLength' | 'textContent' | 'innerHTML' | 'ref'
>

/** Props DOM-компонента: `UseProps` + атрибуты (`TDomAttributes`). */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
	TAttributes extends object = JSX.HTMLAttributes<HTMLElement>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	TDomAttributes<TDescriptorFn, TEvents, TAttributes>

/** `prop:indeterminate` флажка: свойства узла нет в типах атрибутов `<input>` JSX Solid. */
declare module 'solid-js' {
	namespace JSX {
		interface ExplicitProperties {
			indeterminate: boolean
		}
	}
}
