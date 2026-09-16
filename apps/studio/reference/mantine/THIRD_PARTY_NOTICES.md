# Mantine reference assets

Mantine demo source, theme, CSS, fixtures and repository images are from
`mantinedev/mantine` commit `61049ecd950f6fb9ddc631decfec2edbdffe58e1` (9.6.1),
under the MIT license in `LICENSE-Mantine`. `upstream-manifest.json` records the
original URL and SHA-256 of each file. Original source files are unchanged;
the build rewrites demo image URLs to their pinned local copies. Three utility
examples are extracted from the original documentation with an added export.

## Photograph in the Spoiler example

`assets/rock-in-caputh.jpg` is **Rock in Caputh – WBTBWB** by **Henry Laurisch**,
licensed under [Creative Commons Attribution–ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
[Original file and attribution](https://commons.wikimedia.org/wiki/File:Rock_in_caputh-WBTBWB-47.jpg).
Mantine's 600px thumbnail URL returned HTTP 400 during verification, so this
package uses the same original Wikimedia photograph with no content edits;
the unchanged component CSS controls its displayed size. The photograph and its appearance in the
generated Spoiler preview retain this attribution and license. The Mantine MIT
license does not replace the photograph's license.

Other dependencies are installed from the exact versions and integrity hashes
in this private package's `package-lock.json`. Their package license notices
are retained in installed packages and bundled legal comments.
