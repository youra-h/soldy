---
'@soldy-ui/react': minor
---

React adapter: the peer floor of react and react-dom is now ^19.3.0. React 19.2 kept a stale useEffectEvent closure in a memo component redrawn by context, and collection items under StrictMode or <Activity> did not enter the live collection. Upgrade react and react-dom to 19.3 or newer.
