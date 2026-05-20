const CELL_HEIGHT = 56;
const symbols_length = 7;
const stripLen = symbols_length * CELL_HEIGHT;

function getVisualOffsetFromCenter(index, latestY, visibleRows) {
  const windowHeight = CELL_HEIGHT * visibleRows;
  const viewportCenter = visibleRows === 3 ? CELL_HEIGHT : 0;
  
  // New unified visual coordinate formula
  const visualY = index * CELL_HEIGHT + latestY - (2 * stripLen - windowHeight);
  let diff = visualY - viewportCenter;
  diff = ((diff + stripLen / 2) % stripLen + stripLen) % stripLen - stripLen / 2;
  return { visualY, diff };
}

function getOpacity(offsetFromCenter) {
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

const testCases = [
  { name: 'Reel 1 (3 Rows)', stoppedIndex: 3, visibleRows: 3 },
  { name: 'Reel 2 (3 Rows)', stoppedIndex: 2, visibleRows: 3 },
  { name: 'Reel 3 (3 Rows)', stoppedIndex: 6, visibleRows: 3 },
  { name: 'Reel 1 (1 Row)', stoppedIndex: 3, visibleRows: 1 }
];

testCases.forEach(tc => {
  const rows = tc.visibleRows;
  const offset = rows === 3
    ? ((tc.stoppedIndex - 1 + symbols_length) % symbols_length) * CELL_HEIGHT
    : tc.stoppedIndex * CELL_HEIGHT;
  const latestY = offset === 0 ? 0 : stripLen - offset;
  
  console.log(`=== ${tc.name} (stoppedIndex: ${tc.stoppedIndex}, latestY: ${latestY}) ===`);
  for (let index = 0; index < 14; index++) {
    const { visualY, diff } = getVisualOffsetFromCenter(index, latestY, rows);
    const op = getOpacity(diff);
    const symbolVal = (index % symbols_length) + 1;
    
    let rowName = 'out-of-bounds';
    if (rows === 3) {
      if (visualY === 0) rowName = 'Row 0 (Top)';
      else if (visualY === 56) rowName = 'Row 1 (Center)';
      else if (visualY === 112) rowName = 'Row 2 (Bottom)';
    } else {
      if (visualY === 0) rowName = 'Row 0 (Center)';
    }
    
    if (rowName !== 'out-of-bounds' || op > 0) {
      console.log(`  Index ${String(index).padStart(2)} (symbol: ${symbolVal}) -> visualY: ${String(visualY).padStart(4)} (${rowName.padEnd(14)}), offsetFromCenter: ${String(diff).padStart(4)}, opacity: ${op.toFixed(2)}`);
    }
  }
});
