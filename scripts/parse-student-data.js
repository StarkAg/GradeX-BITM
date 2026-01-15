/**
 * Helper script to parse tab-separated or space-separated student data
 * 
 * Usage:
 *   node scripts/parse-student-data.js
 * 
 * Paste your student data below in the STUDENT_DATA_TEXT variable
 * Format: Registration Number<TAB>Name (one per line)
 * Example:
 *   RA2311003012184	UPASANA SINGH
 *   RA2311003012246	HARSH AGARWAL
 */

// ============================================================================
// PASTE YOUR STUDENT DATA HERE (tab-separated: Registration Number<TAB>Name)
// ============================================================================
const STUDENT_DATA_TEXT = `
RA2311003012184	UPASANA SINGH
RA2311003012185	ARPIT SINGH BAIS
RA2311003012186	MRINAL YASH
RA2311003012187	DEINOL MASCARENHAS
RA2311003012188	BALAJI G
RA2311003012189	DWARAMPUDI KANAKA SATYA PRIYANKKA
RA2311003012190	AKSHAT SRIVASTAVA
RA2311003012191	SHAKSHI TIWARY
RA2311003012192	DIVYANSHU KUMAR
RA2311003012193	BABY AFSHEEN
RA2311003012194	SIDDHARTH MALIK
RA2311003012195	ASHISH KUMAR
RA2311003012196	ADITYA NIKHORIA
RA2311003012197	SHAIK MOHAMMED SAIF
RA2311003012198	DEBOSMITA PAUL
RA2311003012199	HARI KRISHNAN
RA2311003012200	RISHU KUMAR DASOUNDHI
RA2311003012201	RISHAB SRIPATHY
RA2311003012202	PALLANTLA SAISAHITH
RA2311003012203	ARPITA MISHRA
RA2311003012204	ABHI KHAREL
RA2311003012205	AAYUSHA BHATTARAI
RA2311003012206	GAUTAM PRASAD UPADHYAY
RA2311003012208	HEMANG DUBEY
RA2311003012209	TELAPROLU RADHA KRISHNA MURTHY
RA2311003012210	HEET JAIN
RA2311003012211	VISHVA SHAH
RA2311003012212	SRIANSU PATRA
RA2311003012213	NAVYA ASTHANA
RA2311003012214	VATSAL BISHT
RA2311003012215	ARK SARAF
RA2311003012216	KARTIK GAWADE
RA2311003012217	N V S S RISHI BODA
RA2311003012219	SIDDHESH SUDHIR BIJWE
RA2311003012220	MARNI ABHI SAI
RA2311003012221	JANVI
RA2311003012222	ADITI AJITKUMAR CHOUGALE
RA2311003012223	GAUTAM SONI
RA2311003012224	B TEJASHWIN
RA2311003012225	ARIIN DATTATRAYA PATIL
RA2311003012226	VENKATA SAI HARISH DHARMAVARAPU
RA2311003012227	JOVINSHA MARY FILA J
RA2311003012228	MOHAMMED AZHAN AABDIN
RA2311003012229	VISHAL M
RA2311003012230	ANANYA SINGH
RA2311003012231	REDDI VARUN KUMAR
RA2311003012232	AVIRAL PAL
RA2311003012233	USHIKA LUNAWAT
RA2311003012234	SURADA VAISHNAVI
RA2311003012235	PRAKHAR GOYAL
RA2311003012236	SRIVISHWAK R
RA2311003012237	DHARSHAN S
RA2311003012238	LINGESHWARAN RAMACHANDRAN
RA2311003012240	SANJAI KUMAR R
RA2311003012242	BHUVANESH K R
RA2311003012243	LAGADAPATI DHATHRI CHOWDARY
RA2311003012244	WADIWALA RIMSHA ALTAF
RA2311003012245	MALA PRAJEETH
RA2311003012246	HARSH AGARWAL
`;

// ============================================================================
// PARSER FUNCTION
// ============================================================================
function parseStudentData(text) {
  const lines = text.trim().split('\n');
  const students = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue; // Skip empty lines

    // Try tab-separated first
    let parts = trimmed.split('\t');
    
    // If no tab, try multiple spaces
    if (parts.length < 2) {
      parts = trimmed.split(/\s{2,}/); // Split on 2+ spaces
    }
    
    // If still no match, try single space (last name might be multiple words)
    if (parts.length < 2) {
      // Find first space and split there
      const firstSpaceIndex = trimmed.indexOf(' ');
      if (firstSpaceIndex > 0) {
        parts = [
          trimmed.substring(0, firstSpaceIndex),
          trimmed.substring(firstSpaceIndex + 1)
        ];
      }
    }

    if (parts.length >= 2) {
      const registration_number = parts[0].trim();
      const name = parts.slice(1).join(' ').trim(); // Join remaining parts as name

      if (registration_number && name) {
        students.push({
          registration_number,
          name
        });
      }
    }
  }

  return students;
}

// ============================================================================
// MAIN
// ============================================================================
const students = parseStudentData(STUDENT_DATA_TEXT);

console.log('📋 Parsed Students:\n');
console.log('const STUDENTS_DATA = [');
students.forEach((student, index) => {
  const comma = index < students.length - 1 ? ',' : '';
  console.log(`  { registration_number: '${student.registration_number}', name: '${student.name}' }${comma}`);
});
console.log('];\n');

console.log(`✅ Parsed ${students.length} students`);
console.log('\n💡 Copy the STUDENTS_DATA array above and paste it into scripts/save-p2-students.js\n');

