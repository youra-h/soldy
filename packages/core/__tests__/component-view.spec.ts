import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TComponentView, TVisibilityState, TStateUnit } from '@soldy/core'
import type { IComponentViewProps, IVisibilityState } from '@soldy/core'

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
		const beforeShow = vi.spyOn(p as any, 'beforeShow').mockReturnValue(true)
		const beforeHide = vi.spyOn(p as any, 'beforeHide').mockReturnValue(true)

		const showHandler = vi.fn()
		const hideHandler = vi.fn()
		const visibleHandler = vi.fn()
		p.events.on('show' as any, showHandler)
		p.events.on('hide' as any, hideHandler)
		p.events.on('change:visible', visibleHandler)

		p.show()
		expect(beforeShow).toHaveBeenCalled()
		expect(p.visible).toBe(true)
		expect(showHandler).toHaveBeenCalled()
		expect(visibleHandler).toHaveBeenCalledWith(true)

		p.hide()
		expect(beforeHide).toHaveBeenCalled()
		expect(p.visible).toBe(false)
		expect(hideHandler).toHaveBeenCalled()
		expect(visibleHandler).toHaveBeenCalledWith(false)
	})

	it('visible=true вызывает show, visible=false вызывает hide', () => {
		const p = new TComponentView({ visible: false })
		const show = vi.spyOn(p as any, 'show')
		const hide = vi.spyOn(p as any, 'hide')

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
		;(p.classes as any).add('x', false)
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

	it('dir: вычисляется из direction, inherit → null (атрибут не ставится)', () => {
		const p = new TComponentView()
		expect(p.dir).toBeNull()

		p.direction = 'rtl'
		expect(p.dir).toBe('rtl')

		p.direction = 'ltr'
		expect(p.dir).toBe('ltr')

		p.direction = 'inherit'
		expect(p.dir).toBeNull()
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

	it('states позволяет передавать инстансы или конструкторы для visibility-state', () => {
		const log: string[] = []

		class TLoggedVisibilityState
			extends TStateUnit<boolean>
			implements IVisibilityState
		{
			constructor({ initial }: { initial: boolean }) {
				super({ initial })
				this.events.on('change', (payload: any) => {
					if (payload.newValue) {
						log.push('state:value=true')
					}
				})
			}

			show(): void {
				this.value = true
			}

			hide(): void {
				this.value = false
			}
		}

		// 1) Передаём готовые инстансы
		const instanceVisible = new TLoggedVisibilityState({ initial: false })
		const instanceRendered = new TVisibilityState({ initial: true })

		const p1 = new TComponentView(
			{ visible: false },
			{ states: { rendered: instanceRendered, visible: instanceVisible } },
		)
		p1.events.on('change:visible', (value) => {
			log.push(`component-view:change:visible=${value}`)
		})
		p1.visible = true

		expect(log).toContain('state:value=true')
		expect(log).toContain('component-view:change:visible=true')

	})

	it('states.rendered доступен через instance.states и setResolver меняет возвращаемое значение', () => {
		const c = new TComponentView({ rendered: true })

		expect(c.states.rendered).toBeDefined()
		expect(c.rendered).toBe(true)

		// Резольвер всегда возвращает false, игнорируя реальное значение
		c.states.rendered.setResolver(() => false)

		expect(c.rendered).toBe(false) // резольвер переопределил
		expect(c.states.rendered.rawValue).toBe(true) // сырое значение не изменилось
	})

	it('states.visible доступен через instance.states и setResolver меняет возвращаемое значение', () => {
		const c = new TComponentView({ visible: true })

		expect(c.states.visible).toBeDefined()
		expect(c.visible).toBe(true)

		c.states.visible.setResolver(() => false)

		expect(c.visible).toBe(false)
		expect(c.states.visible.rawValue).toBe(true)
	})
})
