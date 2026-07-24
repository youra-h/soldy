/**
 * @soldy/accessor — тесты TComponentAccessor
 */
import { describe, it, expect, vi } from 'vitest'
import { TComponentAccessor } from '../accessor'
import type { ICompiledProp, ICompiledEvent } from '../contract'
import { TEvented } from '@soldy/core'

function makeProp(overrides: Partial<ICompiledProp> = {}): ICompiledProp {
    return {
        name: 'testProp',
        protected: false,
        triggers: ['change:testProp'],
        ...overrides,
    }
}

function makeEvent(name: string, namespace?: string): ICompiledEvent {
    return { name, namespace }
}

function makeAccessor(instance?: any, pluginsMap?: Map<string, any>) {
    return new TComponentAccessor(
        [
            makeProp({ name: 'rendered', triggers: ['change:rendered'] }),
            makeProp({ name: 'visible', triggers: ['change:visible'] }),
            makeProp({ name: 'present', protected: true, triggers: ['change:rendered', 'change:visible'] }),
        ],
        [
            makeEvent('show'),
            makeEvent('hide'),
        ],
        instance ?? { rendered: true, visible: false, events: new TEvented() },
        pluginsMap ?? new Map(),
    )
}

describe('TComponentAccessor', () => {
    // --- getProps ---

    it('getProps(false) — только публичные', () => {
        const accessor = makeAccessor()
        const props = accessor.getProps(false)

        expect(props.map(p => p.name)).toEqual(['rendered', 'visible'])
    })

    it('getProps(true) — все включая protected', () => {
        const accessor = makeAccessor()
        const props = accessor.getProps(true)

        expect(props.map(p => p.name)).toEqual(['rendered', 'visible', 'present'])
    })

    // --- getEvents ---

    it('getEvents — возвращает все события', () => {
        const accessor = makeAccessor()
        const events = accessor.getEvents()

        expect(events.map(e => e.name)).toEqual(['show', 'hide'])
    })

    // --- getExportName ---

    it('getExportName — делегирует TDescriptorInspector', () => {
        const accessor = makeAccessor()

        expect(accessor.getExportName({ name: 'tag' })).toBe('tag')
        expect(accessor.getExportName({ name: 'ready', namespace: 'element' })).toBe('element:ready')
    })

    // --- getTriggers ---

    it('getTriggers — делегирует TDescriptorInspector (триггеры уже скомпилированы)', () => {
        const accessor = makeAccessor()
        const prop = makeProp({ name: 'visible', namespace: 'element', triggers: ['element:change:visible'] })

        expect(accessor.getTriggers(prop)).toEqual(['element:change:visible'])
    })

    // --- getValue ---

    it('getValue — читает из instance (без namespace)', () => {
        const instance = { rendered: true, visible: false }
        const accessor = makeAccessor(instance)

        expect(accessor.getValue(makeProp({ name: 'rendered' }))).toBe(true)
        expect(accessor.getValue(makeProp({ name: 'visible' }))).toBe(false)
    })

    it('getValue — читает из плагина (с namespace)', () => {
        const plugin = { element: {} as HTMLElement }
        const pluginsMap = new Map([['element', plugin]])
        const accessor = makeAccessor({}, pluginsMap)

        const value = accessor.getValue(makeProp({ name: 'element', namespace: 'element' }))

        expect(value).toBe(plugin.element)
    })

    it('getValue — возвращает undefined для неизвестного namespace', () => {
        const accessor = makeAccessor()

        expect(accessor.getValue(makeProp({ name: 'x', namespace: 'unknown' }))).toBeUndefined()
    })

    // --- setValue ---

    it('setValue — записывает в instance', () => {
        const instance = { rendered: true }
        const accessor = makeAccessor(instance)

        accessor.setValue(makeProp({ name: 'rendered' }), false)

        expect(instance.rendered).toBe(false)
    })

    it('setValue — записывает в плагин', () => {
        const plugin = { element: null as HTMLElement | null }
        const pluginsMap = new Map([['element', plugin]])
        const accessor = makeAccessor({}, pluginsMap)
        const div = {} as HTMLElement

        accessor.setValue(makeProp({ name: 'element', namespace: 'element' }), div)

        expect(plugin.element).toBe(div)
    })

    it('setValue — не пишет protected свойства', () => {
        const instance = { present: true }
        const accessor = makeAccessor(instance)

        accessor.setValue(makeProp({ name: 'present', protected: true }), false)

        expect(instance.present).toBe(true) // не изменилось
    })

    // --- getEventSource ---

    it('getEventSource — возвращает events instance (без namespace)', () => {
        const events = new TEvented()
        const instance = { events }
        const accessor = makeAccessor(instance)

        expect(accessor.getEventSource({ name: 'show' })).toBe(events)
    })

    it('getEventSource — возвращает events плагина (с namespace)', () => {
        const pluginEvents = new TEvented()
        const plugin = { events: pluginEvents }
        const pluginsMap = new Map([['element', plugin]])
        const accessor = makeAccessor({}, pluginsMap)

        expect(accessor.getEventSource({ name: 'ready', namespace: 'element' })).toBe(pluginEvents)
    })

    it('getEventSource — возвращает сам объект если нет events', () => {
        const plugin = { element: 'some-value' }
        const pluginsMap = new Map([['element', plugin]])
        const accessor = makeAccessor({}, pluginsMap)

        expect(accessor.getEventSource({ name: 'element', namespace: 'element' })).toBe(plugin)
    })
})
