/**
 * @soldy/setup — тесты TabsDescriptor
 */
import { describe, it, expect } from 'vitest'
import { TabsDescriptor } from '../descriptors/components/tabs'

describe('TabsDescriptor', () => {
    it('содержит props от ControlDescriptor (extends)', () => {
        const names = TabsDescriptor.props.map(p => p.name)
        expect(names).toContain('disabled')
        expect(names).toContain('focused')
        expect(names).toContain('rendered')
        expect(names).toContain('visible')
        expect(names).toContain('tag')
    })

    it('rendered: унаследован от ComponentDescriptor через цепочку extends', () => {
        const rendered = TabsDescriptor.props.find(p => p.name === 'rendered')!

        expect(rendered).toBeDefined()
        expect(rendered.protected).toBe(false)
        expect(rendered.triggers).toContain('change:rendered')
        expect(rendered.namespace).toBeUndefined()
    })

    it('visible: унаследован через цепочку extends', () => {
        const visible = TabsDescriptor.props.find(p => p.name === 'visible')!

        expect(visible).toBeDefined()
        expect(visible.protected).toBe(false)
        expect(visible.triggers).toContain('change:visible')
    })

    it('present: protected, унаследован через цепочку extends', () => {
        const present = TabsDescriptor.props.find(p => p.name === 'present')!

        expect(present).toBeDefined()
        expect(present.protected).toBe(true)
    })

    it('содержит props от TabsContribution (свои)', () => {
        const names = TabsDescriptor.props.map(p => p.name)
        expect(names).toContain('orientation')
        expect(names).toContain('alignment')
        expect(names).toContain('view')
        expect(names).toContain('closable')
    })
})
