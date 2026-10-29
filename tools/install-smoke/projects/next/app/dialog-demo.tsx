'use client'

import { useState } from 'react'
import { Button, Dialog } from '@soldy-ui/react'

/** The dialog needs state, so it is a client component; the rest of the page is a server one. */
export function DialogDemo() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button text="Open dialog" variant="accent" onClick={() => setOpen(true)} />
			<Dialog visible={open} onChangeVisible={setOpen} title="Settings">
				<p>Dialog content</p>
			</Dialog>
		</>
	)
}
