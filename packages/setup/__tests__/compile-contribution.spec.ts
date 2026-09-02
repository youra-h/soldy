/**
 * @soldy/setup — тесты compileContribution
 */
import { describe, it, expect } from 'vitest'
import { compileContribution } from '../descriptors/base'
import { ContribA, PluginContrib } from './_fixtures'

describe('compileContribution', () => {
    it('undefined → пустые массивы', () => {
        const result = compileContribution(undefined)
        expect(result.props).toEqual([])
        expect(result.events).toEqual([])
    })

    it('без namespace — триггеры как есть', () => {
        const result = compileContribution(ContribA)

        expect(result.props[0].name).toBe('a')
        expect(result.props[0].triggers).toEqual(['change:a'])
        expect(result.props[0].namespace).toBeUndefined()
    })

    it('с namespace — префикс к триггерам', () => {
        const result = compileContribution(PluginContrib, 'element')

        expect(result.props[0].triggers).toEqual(['element:ready', 'element:removed'])
        expect(result.props[0].namespace).toBe('element')
    })

    it('protected нормализуется', () => {
        const result = compileContribution({
            props: [{ name: 'secret', protected: true }],
        })

        expect(result.props[0].protected).toBe(true)
    })

    it('protected по умолчанию false', () => {
        const result = compileContribution({
            props: [{ name: 'public' }],
        })

        expect(result.props[0].protected).toBe(false)
    })

    it('события с namespace', () => {
        const result = compileContribution(PluginContrib, 'element')

        expect(result.events).toEqual([
            { name: 'ready', namespace: 'element' },
            { name: 'removed', namespace: 'element' },
        ])
    })
})
