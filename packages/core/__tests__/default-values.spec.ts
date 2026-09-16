import { describe, it, expect } from 'vitest'
import { TComponentView, TFrame, TTabsItem } from '@soldy/core'
import type { TDefaultValues } from '@soldy/core'

interface ISampleProps {
	size?: 'small' | 'large'
	closable?: boolean
	label?: string
}

/**
 * Сторож контракта `static defaultValues` (см. AGENTS.md, «Умолчание пропа —
 * в декларации»).
 *
 * Пока умолчания были `Partial<IXProps>`, объявленный ключ читался как
 * необязательный, и конструкторы добирали значение через `!`. Проверки здесь —
 * типовые: файл проверяет шаг CI «Типы — Core», и неиспользованный
 * `@ts-expect-error` роняет его так же, как настоящая ошибка.
 */
describe('TDefaultValues', () => {
	it('объявленное умолчание читается без undefined', () => {
		const defaults: TDefaultValues<ISampleProps, 'size'> = { size: 'small' }
		const size: 'small' | 'large' = defaults.size

		expect(size).toBe('small')
	})

	it('ключ из списка нельзя забыть', () => {
		// @ts-expect-error — `size` объявлен умолчанием, а в литерале его нет
		const defaults: TDefaultValues<ISampleProps, 'size'> = {}

		expect(defaults).toEqual({})
	})

	it('ключ со значением undefined тоже обязателен: значим сам ключ', () => {
		const declared: TDefaultValues<ISampleProps, never, 'closable'> = { closable: undefined }

		// @ts-expect-error — `closable` объявлен ключом без значения, но ключ обязан быть
		const missing: TDefaultValues<ISampleProps, never, 'closable'> = {}

		expect('closable' in declared).toBe(true)
		expect(missing).toEqual({})
	})

	it('ключ литерала вне списка и вне умолчаний родителя не компилируется', () => {
		const parent: TDefaultValues<ISampleProps, 'size'> = { size: 'small' }
		const child: typeof parent & TDefaultValues<ISampleProps, 'closable'> = {
			...parent,
			size: 'large',
			closable: false,
			// @ts-expect-error — `label` не объявлен ни в списке наследника, ни у родителя
			label: 'x',
		}

		expect(child.size).toBe('large')
	})

	it('в список нельзя внести ключ, которого нет в props-интерфейсе', () => {
		// @ts-expect-error — `color` нет в ISampleProps
		const defaults: TDefaultValues<ISampleProps, 'color'> | undefined = undefined

		expect(defaults).toBeUndefined()
	})
})

describe('static defaultValues классов ядра', () => {
	it('наследник переопределяет умолчание родителя, не ломая статическую сторону', () => {
		const visible: boolean = TComponentView.defaultValues.visible

		expect(visible).toBe(true)
		expect(TFrame.defaultValues.visible).toBe(false)
	})

	it('ключ со значением undefined остаётся ключом', () => {
		expect('closable' in TTabsItem.defaultValues).toBe(true)
		expect(TTabsItem.defaultValues.closable).toBeUndefined()
	})
})
