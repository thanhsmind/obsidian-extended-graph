<h1 align="center">Extended Graph</h1>

<p align="center">Enhance the core graph plugin of <a href="https://obsidian.md/">Obsidian</a> with new features.</p>

This plugin enables you to:
- Add images to graph nodes.
- Change the shapes of the nodes.
- Easily filter by tags and properties.
- Remove links based on relationship types.
- Configure multiple views and switch between them.
- Export the graph view to SVG.
- Increase the size on the currently active node.
- Focus on a specific node.
- Pin nodes.
- Change the size of nodes and links based on statistical functions.

Have a look at the [wiki](https://github.com/ElsaTam/obsidian-extended-graph/wiki) for more info.

![](doc/images/overview.webp)

# Installation

You can install this plugin as any other plugin on desktop via the plugin gallery. it is not supported on mobile.

The plugin is also available in beta through BRAT:
1. Install and enable the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) in your vault.
2. Navigate to `Settings > BRAT > Beta Plugin List > Add Beta Plugin`.
3. Enter `https://github.com/ElsaTam/obsidian-extended-graph` into the input field and select `Add Plugin`.

# Disclosures

- **Network use**: only if you allow the loading of external images from the web (disabled by default).
- **Files outside of the vault**: only if you allow the loading of external images from your computer (disabled by default).

# Issues

Since the core graph plugin lacks an API and documentation, many features are experimental, and feedback is critical to identify and resolve bugs.

**Expected risks**:
- **Graph settings loss**: If the app does not close properly, graph settings could be lost. It *should* not happened, I haven't seen this bug in a long time, but I'm waiting for more testing before removing it from this list. If you want to be extra careful, make a copy of the file `.obsidian/graph.json` before enabling the plugin.

**Expected bugs**:
- **Files modification issues**: The plugin might not synchronize correctly with changes made in your vault even if the core plugin handles them properly (such as renaming, deleting or moving a file).
- **Asynchronous errors**: Rapid interactions (e.g., toggling features, switching views, modifying filters) can result in data inconsistencies due to asynchronous processing. Resetting the plugin usually resolves the issue. If not, close and reopen the tab.

Please, if you encounter any bug, even if it is in the list above, report [an issue](https://github.com/ElsaTam/obsidian-extended-graph/issues).

# Supporting

The plugin is completely free and will always stay that way, and open source. If you'd like to support its development, you can make a donation via this link: https://github.com/sponsors/ElsaTam

# Credits

- [obsidian-typings](https://github.com/Fevol/obsidian-typings) (MIT License)
- [graph-analysis](https://github.com/SkepticMystic/graph-analysis) (GNU General Public License v3.0)
- [js-colormaps](https://github.com/timothygebhard/js-colormaps) (MIT License)

# Features ideas

- Pin nodes [by ribbit12](https://forum.obsidian.md/t/save-node-positions-in-graph-view-edit-and-preview-toggle/1423/89)
- Node shapes [by danitrusca](https://forum.obsidian.md/t/option-to-change-the-shape-of-graph-nodes/13692)
- Tag node colors [by dardan](https://forum.obsidian.md/t/provide-tags-as-graph-css-classes-attributes-to-allow-coloring-of-graph-nodes/6300/17)
- Folders (kind of) [by feva](https://forum.obsidian.md/t/show-folders-as-areas-in-the-graph/8208)
- Nodes stats functions [by akaalias and ryanjamurphy](https://forum.obsidian.md/t/graph-view-allow-to-configure-how-node-size-is-calculated/4247)
- Links stats functions [by SkepticMystic and Emile](https://github.com/SkepticMystic/graph-analysis)
- SVG Export [by Anthea](https://forum.obsidian.md/t/export-of-graph-view-to-svg/25406)
- Interface font [by luisitoalvarz](https://forum.obsidian.md/t/graph-view-should-follow-global-interface-font/47913)
- Zoom on a node [by Docintar](https://forum.obsidian.md/t/find-a-note-in-the-graph/94336)

# Related plugins

If you don't need every features from this plugin and are looking for something simpler, have a look at those, you might find exactly what you are looking for. They are all the plugins related to the graph view that I could find.
- [3D Graph View](http://github.com/AlexW00/obsidian-3d-graph) by _AlexW00_ and its fork [3d Graph View New](https://github.com/HananoshikaYomaru/obsidian-3d-graph) by HananoshikaYomaru: a 3D Graph for Obsidian.
- [Custom Node Size](https://github.com/jackvonhouse/custom-node-size) by _jackvonhouse_: customize nodes size for improved graph understanding.
- [Folders to Graph](https://github.com/Ratibus11/folders2graph) by _Ratibus11_: display your vault folder structure into your graphs.
- [Export Graph View](https://github.com/seantiz/obsidian_egv_plugin) by _seantiz_: export your vault's graph view to mermaid and dot format.
- [Graph Banner](https://github.com/ras0q/obsidian-graph-banner) by _ras0q_, for displaying a relation graph view on the note header.
- [Graph Link Types](https://github.com/natefrisch01/Graph-Link-Types) by _natefrisch01_: link types for graph view.
- [Juggl](https://github.com/HEmile/juggl) by _HEmile_: adds a completely interactive, stylable and expandable graph view to Obsidian.
- [Living Graph](https://github.com/geoffreysflaminglasersword/obsidian-living-graph) by _geoffreysflaminglasersword_: a for-fun graph plugin.
- [Nested Tags](https://github.com/drPilman/obsidian-graph-nested-tags) by _drPilman_: links nested tags in graph view.
- [Node Factor](https://github.com/CalfMoon/node-factor) by _CalfMoon_ (not yet released): customize factors effecting node size in graph.
- [Persistent Graph](https://github.com/Sanqui/obsidian-persistent-graph) by _Sanqui_: adds commands to save and restore the positions of nodes on the global graph view. (seems abandonned)
- [Sync Graph Settings](https://github.com/Xallt/sync-graph-settings) by _Xallt_: for syncing various graph settings to Local Graphs.

(if you know more, let me know)

# License

GNU General Public License version 3 (GPLv3) License
