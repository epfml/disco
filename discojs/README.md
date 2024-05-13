# @epfml/discojs

Decentralized & federated privacy-preserving ML training in TypeScript.

This is the core library of the Disco.js project.

It is platform-agnostic, and has two companions library:
 - [`discojs-node`](../discojs-node) for Node.js
 - [`discojs-web`](../discojs-web) for web browsers

The easiest way to start using it is through the `Disco` object.
Create your own `Task` or load one from our `default_tasks`,
setup the `Dataset` you want, and train with it.

```ts
import { Disco } from '@epfml/discojs'

const url = ...; // url to a Disco.js server
const dataset = ...;
const task = ...;

const disco = new Disco(task, { url })
for await (const _ of disco.fit(dataset));
```
