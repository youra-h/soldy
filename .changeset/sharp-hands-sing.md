---
'@soldy-ui/setup': patch
---

Adapter profile: optional `batch` - the exchange runs each update (state reread, event, its models) inside it, so a framework that renders on a state write renders after the event
