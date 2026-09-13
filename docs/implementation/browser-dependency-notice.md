# Browser storage dependency notice

ADR-0013 selects `@noble/hashes` 2.4.0 (MIT) for synchronous UTF-8 SHA-256 in `modules/browser-store/src/browser-services.ts`. The core and Node store do not import it. This is an integrity/receipt digest, not source authentication or encryption. The pinned package has no runtime dependencies; its exact archive integrity is in pnpm-lock.yaml. Retain the following MIT notice with distributions of the browser modules/dependency.

The upstream [API and audit history](https://github.com/paulmillr/noble-hashes) is reference material. It does not establish an independent audit of this selected release. Known-answer and native-digest comparisons are repository evidence.

```text
The MIT License (MIT)

Copyright (c) 2022 Paul Miller (https://paulmillr.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

`fake-indexeddb` 6.2.5 is Apache-2.0 and is used only by Node tests. Its [license](https://github.com/dumbmatter/fakeIndexedDB/blob/v6.2.5/LICENSE) and upstream package notice remain distributed with that development dependency. It is an in-memory emulator and supplies no evidence of filesystem durability, real quota behavior or browser eviction. No emulator code is included in the product browser import map.
