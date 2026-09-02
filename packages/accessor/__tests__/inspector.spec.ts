/**
 * @soldy/accessor — тесты TDescriptorInspector
 */
import { describe, it, expect } from 'vitest'
import { TDescriptorInspector } from '../inspector'
import type { ICompiledProp, ICompiledEvent } from '../contract'

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

describe('TDescriptorInspector', () => {
    // --- getExportName ---

    it('getExportName: без namespace — просто имя', () => {
        const inspector = new TDescriptorInspector({ props: [], events: [] })

        expect(inspector.getExportName({ name: 'tag' })).toBe('tag')
    })

    it('getExportName: с namespace — namespace:name', () => {
        const inspector = new TDescriptorInspector({ props: [], events: [] })

        expect(inspector.getExportName({ name: 'ready', namespace: 'element' })).toBe('element:ready')
    })

    // --- getExportTriggers ---

    it('getExportTriggers: без namespace — триггеры как есть', () => {
        const inspector = new TDescriptorInspector({ props: [], events: [] })
        const prop = makeProp({ triggers: ['change:value'] })

        expect(inspector.getExportTriggers(prop)).toEqual(['change:value'])
    })

    it('getExportTriggers: с namespace — триггеры уже скомпилированы, возвращаются как есть', () => {
        const inspector = new TDescriptorInspector({ props: [], events: [] })
        const prop = makeProp({ namespace: 'element', triggers: ['element:change:visible', 'element:ready'] })

        expect(inspector.getExportTriggers(prop)).toEqual([
            'element:change:visible',
            'element:ready',
        ])
    })

    // --- getExportEvents ---

    it('getExportEvents: объединяет явные события и триггеры', () => {
        const inspector = new TDescriptorInspector({
            props: [
                makeProp({ name: 'rendered', triggers: ['change:rendered'] }),
            ],
            events: [
                makeEvent('show'),
                makeEvent('hide'),
            ],
        })

        const events = inspector.getExportEvents()

        expect(events).toContain('show')
        expect(events).toContain('hide')
        expect(events).toContain('change:rendered')
    })

    it('getExportEvents: события плагинов с namespace', () => {
        const inspector = new TDescriptorInspector({
            props: [
                makeProp({ name: 'element', namespace: 'element', triggers: ['ready', 'removed'] }),
            ],
            events: [
                makeEvent('ready', 'element'),
                makeEvent('removed', 'element'),
            ],
        })

        const events = inspector.getExportEvents()

        expect(events).toContain('element:ready')
        expect(events).toContain('element:removed')
    })

    it('getExportEvents: дедуплицирует повторы', () => {
        const inspector = new TDescriptorInspector({
            props: [
                makeProp({ name: 'x', triggers: ['change:x'] }),
            ],
            events: [
                makeEvent('change:x'),
            ],
        })

        const events = inspector.getExportEvents()
        const count = events.filter((e) => e === 'change:x').length

        expect(count).toBe(1)
    })

    it('getExportEvents: не содержит update:* (это ответственность Vue)', () => {
        const inspector = new TDescriptorInspector({
            props: [makeProp({ name: 'value' })],
            events: [],
        })

        const events = inspector.getExportEvents()

        expect(events.some((e) => e.startsWith('update:'))).toBe(false)
    })

    it('getExportEvents: кэширует результат', () => {
        const inspector = new TDescriptorInspector({
            props: [makeProp({ name: 'x', triggers: ['change:x'] })],
            events: [makeEvent('show')],
        })

        const first = inspector.getExportEvents()
        const second = inspector.getExportEvents()

        expect(first).toBe(second) // тот же объект (кэш)
    })

    // --- getExportProps ---

    it('getExportProps: только публичные свойства', () => {
        const inspector = new TDescriptorInspector({
            props: [
                makeProp({ name: 'public' }),
                makeProp({ name: 'secret', protected: true }),
            ],
            events: [],
        })

        const props = inspector.getExportProps()

        expect(Object.keys(props)).toContain('public')
        expect(Object.keys(props)).not.toContain('secret')
    })

    it('getExportProps: свойства плагинов с namespace', () => {
        const inspector = new TDescriptorInspector({
            props: [
                makeProp({ name: 'element', namespace: 'element' }),
                makeProp({ name: 'tag' }),
            ],
            events: [],
        })

        const props = inspector.getExportProps()

        expect(Object.keys(props)).toContain('element:element')
        expect(Object.keys(props)).toContain('tag')
    })

    it('getExportProps: defaultValues подставляются', () => {
        const inspector = new TDescriptorInspector({
            props: [makeProp({ name: 'rendered' })],
            events: [],
        })

        const props = inspector.getExportProps({ rendered: true })

        expect(props['rendered']).toEqual({ default: true })
    })

    it('getExportProps: default undefined если нет в defaultValues', () => {
        const inspector = new TDescriptorInspector({
            props: [makeProp({ name: 'size' })],
            events: [],
        })

        const props = inspector.getExportProps()

        expect(props['size']).toEqual({ default: undefined })
    })

    it('getExportProps: кэширует результат', () => {
        const inspector = new TDescriptorInspector({
            props: [makeProp({ name: 'x' })],
            events: [],
        })

        const first = inspector.getExportProps()
        const second = inspector.getExportProps()

        expect(first).toBe(second)
    })

    it('getExportProps: не содержит ctrl/plugins', () => {
        const inspector = new TDescriptorInspector({
            props: [makeProp({ name: 'rendered' })],
            events: [],
        })

        const props = inspector.getExportProps()

        expect(Object.keys(props)).not.toContain('ctrl')
        expect(Object.keys(props)).not.toContain('plugins')
    })
})
