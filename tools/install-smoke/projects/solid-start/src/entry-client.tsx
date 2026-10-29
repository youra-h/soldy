// @refresh reload
import { mount, StartClient } from '@solidjs/start/client'

const app = document.getElementById('app')

if (app === null) {
	throw new Error('#app is missing from the document')
}

mount(() => <StartClient />, app)
