import type { HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
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

/** Событийные пропсы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	DescriptorCallbackEvents<TDescriptorFn>

/** Слоты из дескриптора: `default` — `children`; слот со scope принимает и функцию. */
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
 * HTML-атрибуты DOM-компонента без входов, событий, слотов и защищённых
 * пропсов дескриптора, без `children`; `ref` — к корню. AGENTS.md (React),
 * «Типы пропсов».
 */
export type TDomAttributes<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TAttributes extends object = HTMLAttributes<HTMLElement>,
	TEvents extends object = EventProps<TDescriptorFn>,
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

/** Атрибуты `<input>` полей без того, что поле ведёт само. */
export type TFieldAttributes = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	'checked' | 'defaultChecked' | 'defaultValue' | 'readOnly'
>

/** Атрибуты `<textarea>` без того, что поле ведёт само. */
export type TTextareaAttributes = Omit<
	TextareaHTMLAttributes<HTMLTextAreaElement>,
	'defaultValue' | 'dangerouslySetInnerHTML' | 'readOnly' | 'maxLength'
>

/** Props DOM-компонента: `UseProps` и атрибуты корня (`TDomAttributes`). */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
	TAttributes extends object = HTMLAttributes<HTMLElement>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	TDomAttributes<TDescriptorFn, TAttributes, TEvents>
