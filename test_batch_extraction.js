// Test batch extraction patterns
const testHTML = `
Registration Number:	RA2311003012246	Name:	HARSH AGARWAL
Batch:	2	Mobile:	8709964141
Program:	B.Tech	Department:	Computer Science and Engineering(CS)-(P2 Section)
`;

const batchPattern = /(?i)Batch\s*:\s*(\d+)/;
const matches = batchPattern.exec(testHTML);
console.log('Test HTML:', testHTML);
console.log('Pattern:', batchPattern);
console.log('Matches:', matches);
if (matches && matches.length >= 2) {
  console.log('✓ Extracted batch:', matches[1]);
} else {
  console.log('✗ No match found');
}
