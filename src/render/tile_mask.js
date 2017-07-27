const util = require('../util/util');
const TileCoord = require('../source/tile_coord');

// Updates the TileMasks for all renderable tiles. A TileMask describes all regions
// within that tile that are *not* covered by other renderable tiles.
// Example: renderableTiles in our list are 2/1/3, 3/3/6, and 4/5/13. The schematic for creating the
// TileMask for 2/1/3 looks like this:
//
//    ┌────────┬────────┬─────────────────┐
//    │        │        │#################│
//    │ 4/4/12 │ 4/5/12 │#################│
//    │        │        │#################│
//    ├──────3/2/6──────┤#####3/3/6#######│
//    │        │########│#################│
//    │ 4/4/13 │#4/5/13#│#################│
//    │        │########│#################│
//    ├────────┴──────2/1/3───────────────┤
//    │                 │                 │
//    │                 │                 │
//    │                 │                 │
//    │      3/2/7      │      3/3/7      │
//    │                 │                 │
//    │                 │                 │
//    │                 │                 │
//    └─────────────────┴─────────────────┘
//
// The TileMask for 2/1/3 thus consists of the tiles 4/4/12, 4/5/12, 4/4/13, 3/2/7, and 3/3/7,
// but it does *not* include 4/5/13, and 3/3/6, since these are other renderableTiles.
// A TileMask always contains TileIDs *relative* to the tile it is generated for, so 2/1/3 is
// "subtracted" from these TileIDs. The final TileMask for 2/1/3 will thus be:
//
//    ┌────────┬────────┬─────────────────┐
//    │        │        │#################│
//    │ 2/0/0  │ 2/1/0  │#################│
//    │        │        │#################│
//    ├────────┼────────┤#################│
//    │        │########│#################│
//    │ 2/0/1  │########│#################│
//    │        │########│#################│
//    ├────────┴────────┼─────────────────┤
//    │                 │                 │
//    │                 │                 │
//    │                 │                 │
//    │      1/0/1      │      1/1/1      │
//    │                 │                 │
//    │                 │                 │
//    │                 │                 │
//    └─────────────────┴─────────────────┘
//
// Only other renterable tiles that are *children* of the tile we are generating the mask for will
// be considered. For example, adding TileID 4/8/13 to renderableTiles won't affect the TileMask for
// 2/1/3, since it is not a descendant of it.


exports.updateTileMasks = function(renderableTiles) {
    renderableTiles.sort((a, b) => { a.coord.id < b.coord.id });
    const mask = [];
    const end = renderableTiles[renderableTiles.length-1];


    for (let i = 0; i < renderableTiles.length; i++){
        const tile =  renderableTiles[i];
        const childArray = renderableTiles.slice(i+1);
        // Try to add all remaining ids as children. We sorted the tile list
        // by z earlier, so all preceding items cannot be children of the current
        // tile. We also compute the lower bound of the next wrap, because items of the next wrap
        // can never be children of the current wrap.
        const childrenEnd = lowerBound(
            childArray,
            new TileCoord(0, 0, 0, tile.tileCoord.w + 1),
            (a, b)=>{
                return a.coord.id < b.id ? -1 : a.coord.id > b.id ? 1 : 0;
            });
        computeTileMasks(tile.coord, tile.coord.wrapped(), childArray, childrenEnd, mask);
    }
}

function computeTileMasks(rootTile, ref, childArray, end, tileMask){
    // If the reference or any of its children is found in the list, we need to recurse.
    for (let i = 0; childArray[i] <= end; i++) {
        childTile = childArray[i];
        // The current tile is masked out, so we don't need to add them to the mask set.
        if (ref.id === childTile.coord.id){
            return;
        } else if (childTile.coord.isChildOf(ref)) {
            // There's at least one child tile that is masked out, so recursively descend.
            for (const child in ref.children()) {
                computeTileMasks(rootTileId, child, childArray, end, mask);
            }
        }
    }

    // We couldn't find a child, so it's definitely a masked part.
    // Compute the difference between the root tile ID and the reference tile ID, since TileMask
    // elements are always relative (see below for explanation).

    const diffZ = ref.z - rootTile.z;
    mask.push(new TileCoord(diffZ, ref.x - (rootTile.x << diffZ), ref.y - (rootTile.y << diffZ)));
}

function lowerBound(array, value, comparator) {
    const low = 0, high = array.length - 1;
    while (lo < high) {
        const i = high / 2, comp = comparator(array[i], value);
        if ( comp < 0 ) {
            high = i - 1;
        } else if (comp > 0){
            low = m+1;
        } else {
            high = i
        }
    }
    if(comparator(array[low], value) <= 0) {
      return array[low];
    }
    return array[low - 1];
}
