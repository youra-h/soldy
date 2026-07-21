/**
 * @soldy/setup — тесты дескрипторов
 *
 * Проверяет:
 * - ComponentDescriptor: модель, бандл, провайдер, рантайм
 * - ComponentViewDescriptor: наследование, плагины, цепочка extends
 * - Интеграция: реальный TComponentView + Runtime
 */
import { describe, it, expect, vi } from 'vitest'
import { TComponent, TComponentView } from '@soldy/core'
import { TElementPlugin, TInstancePlugin, TReadyBridgePlugin } from '@soldy/plugins'
import { TAggregateProvider } from '@soldy/provider'
import { ComponentDescriptor } from '../descriptors/components/component.descriptor'
import { ComponentViewDescriptor } from '../descriptors/components/component-view.descriptor'

// ============================================================
// ComponentDescriptor
// ============================================================

describe('ComponentDescriptor', () => {
	it('ctor — TComponent', () => {
		expect(ComponentDescriptor.ctor).toBe(TComponent)
	})

	it('extends — undefined (корневой дескриптор)', () => {
		expect(ComponentDescriptor.extends).toBeUndefined()
	})

	it('model.props — rendered, visible, present', () => {
		expect(ComponentDescriptor.model.props.map(p => p.name)).toEqual([
			'rendered',
			'visible',
			'present',
		])
	})

	it('model.props — state mutable:true, computed default mutable:true', () => {
		const m = ComponentDescriptor.model
		expect(m.props[0].mutable).toBe(true) // rendered
		expect(m.props[1].mutable).toBe(true) // visible
		expect(m.props[2].mutable).toBe(true) // present (computed, no explicit mutable)
	})

	it('model.events — содержит события жизненного цикла', () => {
		const e = ComponentDescriptor.model.events
		expect(e).toContain('created')
		expect(e).toContain('show')
		expect(e).toContain('hide')
		expect(e).toContain('show:before')
		expect(e).toContain('show:after')
		expect(e).toContain('hide:before')
		expect(e).toContain('hide:after')
	})

	it('model — кешируется (тот же объект при повторном обращении)', () => {
		expect(ComponentDescriptor.model).toBe(ComponentDescriptor.model)
	})

	it('contribution — ссылка на ComponentContribution', () => {
		expect(ComponentDescriptor.contribution).toBeDefined()
		expect(ComponentDescriptor.contribution.props.length).toBeGreaterThan(0)
	})

	it('plugins — пустой массив', () => {
		expect(ComponentDescriptor.plugins).toEqual([])
	})

	it('createBundle — возвращает бандл без плагинов', () => {
		const bundle = ComponentDescriptor.createBundle()

		expect(bundle).toBeDefined()
		// У корневого дескриптора нет плагинов
		expect(bundle.get(TElementPlugin)).toBeUndefined()
		expect(bundle.get(TInstancePlugin)).toBeUndefined()
	})

	it('createProvider — возвращает TAggregateProvider', () => {
		const instance = new TComponent()
		const bundle = ComponentDescriptor.createBundle()
		const provider = ComponentDescriptor.createProvider({ instance, bundle })

		expect(provider).toBeInstanceOf(TAggregateProvider)
		expect(typeof provider.getAccessor).toBe('function')
		expect(typeof provider.subscribe).toBe('function')
	})

	it('createRuntime — возвращает TRuntime с правильной моделью', () => {
		const instance = new TComponent()
		const bundle = ComponentDescriptor.createBundle()
		const runtime = ComponentDescriptor.createRuntime({ instance, bundle })

		expect(runtime.model).toBe(ComponentDescriptor.model)
		expect(runtime.getValue('rendered')).toBe(true)
		expect(runtime.getValue('visible')).toBe(true)
		expect(runtime.getValue('present')).toBe(true)

		runtime.dispose()
	})

	it('createRuntime — setValue обновляет свойство компонента', () => {
		const instance = new TComponent()
		const bundle = ComponentDescriptor.createBundle()
		const runtime = ComponentDescriptor.createRuntime({ instance, bundle })

		expect(runtime.setValue('rendered', false)).toBe(true)
		expect(instance.rendered).toBe(false)

		runtime.dispose()
	})

	it('createRuntime — setValue для неизвестного пропа возвращает false', () => {
		const instance = new TComponent()
		const bundle = ComponentDescriptor.createBundle()
		const runtime = ComponentDescriptor.createRuntime({ instance, bundle })

		expect(runtime.setValue('nonexistent', false)).toBe(false)

		runtime.dispose()
	})

	it('createRuntime — уведомляет о событиях', () => {
		const instance = new TComponent()
		const bundle = ComponentDescriptor.createBundle()
		const runtime = ComponentDescriptor.createRuntime({ instance, bundle })

		const events: any[] = []
		runtime.subscribe((p) => {
			if (p.type === 'event') events.push(p)
		})

		instance.events.emit('show')

		expect(events.length).toBeGreaterThanOrEqual(1)
		expect(events.some((e) => e.name === 'show')).toBe(true)

		runtime.dispose()
	})
})

// ============================================================
// ComponentViewDescriptor
// ============================================================

describe('ComponentViewDescriptor', () => {
	it('ctor — TComponentView', () => {
		expect(ComponentViewDescriptor.ctor).toBe(TComponentView)
	})

	it('extends — ComponentDescriptor', () => {
		expect(ComponentViewDescriptor.extends).toBe(ComponentDescriptor)
	})

	it('model.props — включает родительские + свои + плагинов', () => {
		const names = ComponentViewDescriptor.model.props.map(p => p.name)

		// Родительские (ComponentDescriptor)
		expect(names).toContain('rendered')
		expect(names).toContain('visible')
		expect(names).toContain('present')

		// Свои (ComponentViewContribution)
		expect(names).toContain('tag')
		expect(names).toContain('classes')

		// Плагины
		expect(names).toContain('element')

		// Порядок: родитель → свой → плагины
		const renderedIdx = names.indexOf('rendered')
		const tagIdx = names.indexOf('tag')
		const elementIdx = names.indexOf('element')
		expect(renderedIdx).toBeLessThan(tagIdx)
		expect(tagIdx).toBeLessThan(elementIdx)
	})

	it('model.props — mutable нормализован', () => {
		const m = ComponentViewDescriptor.model

		const rendered = m.props.find(p => p.name === 'rendered')!
		expect(rendered.mutable).toBe(true)

		const classes = m.props.find(p => p.name === 'classes')!
		expect(classes.mutable).toBe(true) // computed, no explicit mutable

		const element = m.props.find(p => p.name === 'element')!
		expect(element.mutable).toBe(false) // явно задан в contribution
	})

	it('model.events — объединяет все уровни + дедуплицирует', () => {
		const e = ComponentViewDescriptor.model.events

		// Родительские
		expect(e).toContain('created')
		expect(e).toContain('show')
		expect(e).toContain('hide')

		// Свои
		expect(e).toContain('ready')

		// Плагины
		expect(e).toContain('removed')

		// Дедупликация: 'ready' есть и в ComponentViewContribution, и в ElementContribution
		expect(e.filter(ev => ev === 'ready')).toHaveLength(1)
	})

	it('model — кешируется', () => {
		expect(ComponentViewDescriptor.model).toBe(ComponentViewDescriptor.model)
	})

	it('createBundle — содержит Element и Instance плагины', () => {
		const bundle = ComponentViewDescriptor.createBundle()

		expect(bundle.get(TElementPlugin)).toBeDefined()
		expect(bundle.get(TInstancePlugin)).toBeDefined()
	})

	it('createBundle — плагины установлены (install вызван)', () => {
		const bundle = ComponentViewDescriptor.createBundle()
		const elementPlugin = bundle.get(TElementPlugin)!

		// После install плагин должен быть готов
		expect(elementPlugin).toBeDefined()
	})

	it('createProvider — создаёт агрегатный провайдер с под-провайдерами', () => {
		const bundle = ComponentViewDescriptor.createBundle()
		const instance = new TComponentView({} as any)
		const provider = ComponentViewDescriptor.createProvider({ instance, bundle })

		// Провайдер должен уметь отдавать accessor для element (из плагина)
		const elementProp = ComponentViewDescriptor.model.props.find(p => p.name === 'element')!
		const accessor = provider.getAccessor(elementProp)

		expect(accessor).toBeDefined()
		expect(accessor!.get()).toBeNull() // element ещё не привязан
	})

	it('createRuntime — полный цикл: instance → runtime → setValue → getValue', () => {
		const bundle = ComponentViewDescriptor.createBundle()
		const instance = new TComponentView({} as any) as any
		const runtime = ComponentViewDescriptor.createRuntime({ instance, bundle })

		// Читаем значения
		expect(runtime.getValue('rendered')).toBe(true)
		expect(runtime.getValue('visible')).toBe(true)
		expect(runtime.getValue('tag')).toBe('div')

		// Пишем
		expect(runtime.setValue('tag', 'span')).toBe(true)
		expect(instance.tag).toBe('span')

		runtime.dispose()
	})

	it('createRuntime — уведомляет об изменении свойств', () => {
		const bundle = ComponentViewDescriptor.createBundle()
		const instance = new TComponentView({} as any) as any
		const runtime = ComponentViewDescriptor.createRuntime({ instance, bundle })

		const changes: any[] = []
		runtime.subscribe((p) => {
			if (p.type === 'property') changes.push(p)
		})

		instance.tag = 'section'

		expect(changes.some((c) => c.name === 'tag' && c.value === 'section')).toBe(true)

		runtime.dispose()
	})

	it('createRuntime — уведомляет о событиях из плагинов', () => {
		const bundle = ComponentViewDescriptor.createBundle()
		const instance = new TComponentView({} as any) as any
		const runtime = ComponentViewDescriptor.createRuntime({ instance, bundle })

		const events: any[] = []
		runtime.subscribe((p) => {
			if (p.type === 'event') events.push(p)
		})

		instance.events.emit('ready')

		expect(events.some((e) => e.name === 'ready')).toBe(true)

		runtime.dispose()
	})

	it('createRuntime — subscribe возвращает функцию отписки', () => {
		const bundle = ComponentViewDescriptor.createBundle()
		const instance = new TComponentView({} as any) as any
		const runtime = ComponentViewDescriptor.createRuntime({ instance, bundle })

		const spy = vi.fn()
		const unsub = runtime.subscribe(spy)
		unsub()

		instance.tag = 'article'
		expect(spy).not.toHaveBeenCalled()

		runtime.dispose()
	})

	it('createRuntime — dispose очищает все подписки', () => {
		const bundle = ComponentViewDescriptor.createBundle()
		const instance = new TComponentView({} as any) as any
		const runtime = ComponentViewDescriptor.createRuntime({ instance, bundle })

		const spy = vi.fn()
		runtime.subscribe(spy)
		runtime.dispose()

		instance.tag = 'nav'
		instance.events.emit('ready')

		expect(spy).not.toHaveBeenCalled()
	})
})

// ============================================================
// Интеграция: полная цепочка наследования
// ============================================================

describe('Цепочка наследования дескрипторов', () => {
	it('ComponentDescriptor.model не содержит props от ComponentViewDescriptor', () => {
		const names = ComponentDescriptor.model.props.map(p => p.name)
		expect(names).not.toContain('tag')
		expect(names).not.toContain('classes')
		expect(names).not.toContain('element')
	})

	it('ComponentViewDescriptor.model не содержит props от Icon', () => {
		const names = ComponentViewDescriptor.model.props.map(p => p.name)
		expect(names).not.toContain('size')
		expect(names).not.toContain('width')
		expect(names).not.toContain('height')
	})

	it('ComponentViewDescriptor.model содержит все props родителя', () => {
		const parentNames = ComponentDescriptor.model.props.map(p => p.name)
		const childNames = ComponentViewDescriptor.model.props.map(p => p.name)

		for (const name of parentNames) {
			expect(childNames).toContain(name)
		}
	})

	it('ComponentViewDescriptor.createBundle содержит плагины (родитель без плагинов)', () => {
		const parentBundle = ComponentDescriptor.createBundle()
		const childBundle = ComponentViewDescriptor.createBundle()

		expect(parentBundle.get(TElementPlugin)).toBeUndefined()
		expect(childBundle.get(TElementPlugin)).toBeDefined()
	})

	it('model.props — нет дублирования имён между уровнями', () => {
		const names = ComponentViewDescriptor.model.props.map(p => p.name)
		const unique = new Set(names)
		expect(unique.size).toBe(names.length)
	})
})
