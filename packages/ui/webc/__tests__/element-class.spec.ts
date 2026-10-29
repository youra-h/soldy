/**
 * The class of an element is the check of a node: `el instanceof
 * TButtonElement` narrows the node to the element with its props, as the
 * README writes it. The base sets the prop properties on the prototype at run
 * time, and the instance type of the class doesn't know them, so the narrowing
 * comes from the predicate of the class's `[Symbol.hasInstance]` (TypeScript
 * 5.3+), while `prototype` and the constructor stay native. There is no
 * second check (`is`) next to it.
 *
 * The run checks the answer, which is the prototype chain as before: an
 * element is an instance of its class and of the tag's native class, a plain
 * tag and an element of another class on the same tag are not, and a subclass
 * answers for itself. The types are checked by the CI step «Типы — Web
 * Components» (`__tests__` is in the package's `tsconfig.json`): at run time
 * `expectTypeOf` and `@ts-expect-error` do nothing. Through the built
 * declarations the same narrowing reaches the webc project of the install run
 * (`tools/install-smoke/projects/webc`).
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { TButton, type IButton } from '@soldy-ui/core'
import {
	TButtonElement,
	TDialogElement,
	TFrameElement,
	defineElement,
	type TButtonElementProps,
	type TDialogElementProps,
	type TElementType,
} from '@soldy-ui/webc'

/** A subclass of an element class: `instanceof` answers for the class on its right. */
class TSubmitButtonElement extends TButtonElement {}

defineElement('so-element-class-submit', TSubmitButtonElement, 'button')

describe('класс элемента · instanceof', () => {
	it('элемент — экземпляр своего класса и нативного класса тега', () => {
		const button = document.createElement('button', { is: 'so-button' })
		const dialog = document.createElement('div', { is: 'so-dialog' })

		expect(button instanceof TButtonElement).toBe(true)
		expect(button instanceof HTMLButtonElement).toBe(true)
		expect(dialog instanceof TDialogElement).toBe(true)
		expect(dialog instanceof HTMLDivElement).toBe(true)
	})

	it('обычный тег и элемент другого класса на том же теге — нет', () => {
		const plain = document.createElement('button')
		const dialog = document.createElement('div', { is: 'so-dialog' })

		expect(plain instanceof TButtonElement).toBe(false)
		expect(dialog instanceof TFrameElement).toBe(false)
		expect(dialog instanceof TButtonElement).toBe(false)
	})

	it('не узел — нет', () => {
		const values: unknown[] = [null, undefined, 'so-button', {}, TButtonElement]

		for (const value of values) expect(value instanceof TButtonElement).toBe(false)
	})

	it('наследник класса отвечает за себя', () => {
		const submit = document.createElement('button', { is: 'so-element-class-submit' })
		const button = document.createElement('button', { is: 'so-button' })

		expect(submit instanceof TSubmitButtonElement).toBe(true)
		expect(submit instanceof TButtonElement).toBe(true)
		expect(button instanceof TSubmitButtonElement).toBe(false)
	})
})

describe('класс элемента · типы', () => {
	it('instanceof сужает узел до элемента с пропсами и ctrl', () => {
		// As in the README: a node of the native type, then the check
		const el = document.createElement('button', { is: 'so-button' })

		if (!(el instanceof TButtonElement)) throw new Error('<button is="so-button"> нет')

		expectTypeOf(el).toEqualTypeOf<TButtonElementProps>()
		expectTypeOf(el.ctrl).toEqualTypeOf<IButton | undefined>()
		expectTypeOf(el.text).toEqualTypeOf<string | undefined>()

		el.ctrl = new TButton({ text: 'Save' })
		el.text = 'Save'

		expect(el.ctrl.text).toBe('Save')
		expect(el.text).toBe('Save')

		// @ts-expect-error `text` is a string: the narrowed node has the prop types
		el.text = 1
	})

	it('узел из поиска по документу сужается так же', () => {
		const host = document.createElement('div')

		host.innerHTML = '<div is="so-dialog"></div>'

		const node = host.querySelector('div')

		if (!(node instanceof TDialogElement)) throw new Error('<div is="so-dialog"> нет')

		expectTypeOf(node).toEqualTypeOf<TDialogElementProps>()

		node.visible = true

		expect(node.visible).toBe(true)

		// @ts-expect-error `visible` is a boolean
		node.visible = 'yes'
	})

	it('тип элемента класса — тип из его проверки', () => {
		expectTypeOf<TElementType<typeof TButtonElement>>().toEqualTypeOf<TButtonElementProps>()
		expectTypeOf<TElementType<typeof TDialogElement>>().toEqualTypeOf<TDialogElementProps>()
	})

	it('у класса нет is: проверка одна — instanceof', () => {
		// @ts-expect-error the class has no `is`: `instanceof` is the check
		expect(TButtonElement.is).toBeUndefined()
	})
})
