/**
 * collectForwardProps — общий для React, Solid и Svelte набор пропсов, которые
 * уходят спредом в атрибуты корня. Слоты контракта туда попадать не должны.
 */

import { describe, it, expect } from 'vitest'
import {
	createAdapterContext,
	createInspectorFactory,
	collectForwardProps,
	underscorePropNaming,
	callbackEventNaming,
	ButtonDescriptor,
} from '@soldy/setup'

const createInspector = createInspectorFactory({
	prop: underscorePropNaming,
	event: callbackEventNaming,
})

function forward(props: object): object {
	const ctx = createAdapterContext(ButtonDescriptor(), { props })

	try {
		return collectForwardProps(props, ctx, createInspector(ctx.accessor), 'children')
	} finally {
		ctx.destroy()
	}
}

describe('collectForwardProps', () => {
	it('слоты дескриптора не уходят в атрибуты', () => {
		expect(forward({ leading: 'L', trailing: 'T', children: 'C' })).toEqual({})
	})

	it('пропы, события и пропы адаптера съедаются', () => {
		expect(forward({ text: 'x', onReady: () => {}, plugins: null, ctrl: undefined })).toEqual(
			{},
		)
	})

	it('всё остальное уходит как есть', () => {
		expect(forward({ id: 'b', title: 'подсказка', leading: 'L' })).toEqual({
			id: 'b',
			title: 'подсказка',
		})
	})
})
