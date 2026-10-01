import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TComponentView } from '@soldy-ui/core'
import type { IComponentViewProps } from '@soldy-ui/core'

describe('TComponentView', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('принимает { props } корректно', () => {
		const p = new TComponentView({ tag: 'span', visible: false })
		expect(p.tag).toBe('span')
		expect(p.visible).toBe(false)
		expect(p.classes.toArray()).toContain(TComponentView.baseClass)
	})

	it('принимает "голые" props без ключа props', () => {
		const p = new TComponentView({ tag: 'section' })
		expect(p.tag).toBe('section')
		expect(p.classes.toArray()).toContain(TComponentView.baseClass)
	})

	it('getProps возвращает бизнес-свойства (без baseClass/classes)', () => {
		const p = new TComponentView<IComponentViewProps>({
			tag: 'div',
			visible: true,
		})
		const props = p.getProps() as IComponentViewProps
		expect(props.tag).toBe('div')
		expect(props.visible).toBe(true)
		// baseClass, classes больше не сериализуются
		expect(props).not.toHaveProperty('baseClass')
		expect(props).not.toHaveProperty('classes')
	})

	it('show/hide эмитят события и меняют visible', () => {
		const p = new TComponentView({ visible: false })

		const showBeforeHandler = vi.fn()
		const hideBeforeHandler = vi.fn()
		const showHandler = vi.fn()
		const hideHandler = vi.fn()
		const visibleHandler = vi.fn()
		p.events.on('show:before', showBeforeHandler)
		p.events.on('hide:before', hideBeforeHandler)
		p.events.on('show', showHandler)
		p.events.on('hide', hideHandler)
		p.events.on('change:visible', visibleHandler)

		p.show()
		expect(showBeforeHandler).toHaveBeenCalled()
		expect(p.visible).toBe(true)
		expect(showHandler).toHaveBeenCalled()
		expect(visibleHandler).toHaveBeenCalledWith(true)

		p.hide()
		expect(hideBeforeHandler).toHaveBeenCalled()
		expect(p.visible).toBe(false)
		expect(hideHandler).toHaveBeenCalled()
		expect(visibleHandler).toHaveBeenCalledWith(false)
	})

	it('visible=true вызывает show, visible=false вызывает hide', () => {
		const p = new TComponentView({ visible: false })
		const show = vi.spyOn(p, 'show')
		const hide = vi.spyOn(p, 'hide')

		p.visible = true
		expect(show).toHaveBeenCalled()
		p.visible = false
		expect(hide).toHaveBeenCalled()
	})

	it('tag/classes эмитят change:*', () => {
		const p = new TComponentView()
		const tagHandler = vi.fn()
		const classesHandler = vi.fn()
		p.events.on('change:tag', tagHandler)
		p.events.on('change:classes', classesHandler)

		p.tag = 'section'
		expect(tagHandler).toHaveBeenCalledWith('section')
		p.classes.add('x', false)
		expect(classesHandler).toHaveBeenCalled()
	})

	it('direction: по умолчанию inherit, сеттер эмитит change:direction', () => {
		const p = new TComponentView()
		expect(p.direction).toBe('inherit')
		expect(p.getProps()).toHaveProperty('direction', 'inherit')

		const handler = vi.fn()
		p.events.on('change:direction', handler)

		p.direction = 'rtl'
		expect(p.direction).toBe('rtl')
		expect(handler).toHaveBeenCalledWith('rtl')

		// повторная установка того же значения не эмитит
		p.direction = 'rtl'
		expect(handler).toHaveBeenCalledTimes(1)

		// возврат в исходное состояние — обычная установка значения
		p.direction = 'inherit'
		expect(handler).toHaveBeenLastCalledWith('inherit')
	})

	it('dir пишется в attrs по direction, inherit — ключа нет', () => {
		const p = new TComponentView()
		expect(p.attrs.get('dir')).toBeUndefined()

		const handler = vi.fn()
		p.events.on('change:attrs', handler)

		p.direction = 'rtl'
		expect(p.attrs.get('dir')).toBe('rtl')
		expect(handler).toHaveBeenCalledWith(expect.objectContaining({ dir: 'rtl' }))

		p.direction = 'ltr'
		expect(p.attrs.get('dir')).toBe('ltr')

		p.direction = 'inherit'
		expect(p.attrs.get('dir')).toBeUndefined()
		expect(p.attrs.has('dir')).toBe(false)

		// без изменения набор не эмитит
		handler.mockClear()
		p.direction = 'inherit'
		expect(handler).not.toHaveBeenCalled()
	})

	it('direction: принимается через props и сериализуется', () => {
		const p = new TComponentView({ direction: 'rtl' })
		expect(p.direction).toBe('rtl')
		expect((p.getProps() as IComponentViewProps).direction).toBe('rtl')
	})

	it('toJSON сериализует getProps()', () => {
		const p = new TComponentView({ tag: 'span' })
		expect(p.toJSON()).toEqual(p.getProps())
	})

	it('change:rendered:before подправляет и отменяет запись rendered', () => {
		const c = new TComponentView({ rendered: true })
		const changes = vi.fn()

		c.events.on('change:rendered', changes)
		c.events.on('change:rendered:before', (e) => {
			if (e.oldValue) e.preventDefault()
		})

		c.rendered = false

		expect(c.rendered).toBe(true)
		expect(changes).not.toHaveBeenCalled()
	})

	it('видимость расширяют show:before и hide:before: своего change:visible:before нет', () => {
		const c = new TComponentView({ visible: true })
		const changes = vi.fn()

		c.events.on('change:visible', changes)
		c.events.on('hide:before', (e) => e.preventDefault())

		c.visible = false

		expect(c.visible).toBe(true)
		expect(changes).not.toHaveBeenCalled()
	})

	it('свою логику свойства задаёт наследник — она ловит и запись изнутри', () => {
		class TAlwaysRendered extends TComponentView {
			override get rendered(): boolean {
				return super.rendered
			}
			override set rendered(value: boolean) {
				super.rendered = value || this.visible
			}
		}

		const c = new TAlwaysRendered({ rendered: true })

		c.rendered = false

		expect(c.rendered).toBe(true)
	})
})
