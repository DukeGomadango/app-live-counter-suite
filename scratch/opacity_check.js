const CELL_HEIGHT = 56;
const symbols_length = 7;
const stripLen = symbols_length * CELL_HEIGHT;
const visibleRows = 3;
const center = CELL_HEIGHT;

function getOffsetFromCenter(index, latestY) {
  const d = index * CELL_HEIGHT - latestY;
  let diff = d - center;
  diff = ((diff + stripLen / 2) % stripLen + stripLen) % stripLen - stripLen / 2;
  return diff;
}

function getOpacity(offsetFromCenter) {
  // opacity: [-112, -84, -56, 0, 56, 84, 112] -> [0, 0.4, 0.8, 1, 0.8, 0.4, 0]
  const input = [-112, -84, -56, 0, 56, 84, 112];
  const output = [0, 0.4, 0.8, 1, 0.8, 0.4, 0];
  
  if (offsetFromCenter <= input[0]) return output[0];
  if (offsetFromCenter >= input[input.length - 1]) return output[output.length - 1];
  
  for (let i = 0; i < input.length - 1; i++) {
    if (offsetFromCenter >= input[i] && offsetFromCenter <= input[i+1]) {
      const t = (offsetFromCenter - input[i]) / (input[i+1] - input[i]);
      return output[i] + t * (output[i+1] - output[i]);
    }
  }
  return 0;
}

const reels = [
  { name: 'Reel 1', stoppedIndex: 3 },
  { name: 'Reel 2', stoppedIndex: 2 },
  { name: 'Reel 3', stoppedIndex: 6 }
];

reels.forEach(r => {
  const offset = ((r.stoppedIndex - 1 + symbols_length) % symbols_length) * CELL_HEIGHT;
  const latestY = offset === 0 ? 0 : stripLen - offset;
  console.log(`=== ${r.name} (stoppedIndex: ${r.stoppedIndex}, latestY: ${latestY}) ===`);
  for (let index = 0; index < 14; index++) {
    const off = getOffsetFromCenter(index, latestY);
    const op = getOpacity(off);
    const symbolVal = (index % symbols_length) + 1;
    // Calculate visual position (V)
    // V = i * 56 + latestY - 616
    const visualY = index * CELL_HEIGHT + latestY - 616;
    let rowName = 'out-of-bounds';
    if (visualY === 0) rowName = 'Row 0 (Top)';
    else if (visualY === 56) rowName = 'Row 1 (Center)';
    else if (visualY === 112) rowName = 'Row 2 (Bottom)';
    
    if (rowName !== 'out-of-bounds' || op > 0) {
      console.log(`  Index ${String(index).padStart(2)} (symbol: ${symbolVal}) -> visualY: ${String(visualY).padStart(4)} (${rowName.padEnd(14)}), offsetFromCenter: ${String(off).padStart(4)}, opacity: ${op.toFixed(2)}`);
    }
  }
});
