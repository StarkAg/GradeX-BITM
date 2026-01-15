# Batch 2 Slot Mapping - Visual Table

## Complete Timetable Grid

| Period | Day 1 (Mon) | Day 2 (Tue) | Day 3 (Wed) | Day 4 (Thu) | Day 5 (Fri) |
|--------|-------------|-------------|-------------|-------------|-------------|
| **1** (08:00-08:50) | **P1** | **B** | **P21** | **D** | **P41** |
| **2** (08:50-09:40) | **P2** | **B** | **P22** | **D** | **P42** |
| **3** (09:45-10:35) | **P3** | **G** | **P23** | **B** | **P43** |
| **4** (10:40-11:30) | **P4** | **G** | **P24** | **E** | **P44** |
| **5** (11:35-12:25) | **P5** | **A** | **P25** | **C** | **P45** |
| **6** (12:30-01:20) | **A** | **P16** | **C** | **P36** | **E** |
| **7** (01:25-02:15) | **A** | **P17** | **C** | **P37** | **E** |
| **8** (02:20-03:10) | **F** | **P18** | **A** | **P38** | **C** |
| **9** (03:10-04:00) | **F** | **P19** | **D** | **P39** | **F** |
| **10** (04:00-04:50) | **G** | **P20** | **B** | **P40** | **D** |
| **11** (04:50-05:30) | **L11** | **L21** | **L31** | **L41** | **L51** |
| **12** (05:30-06:10) | **L12** | **L22** | **L32** | **L42** | **L52** |

---

## Slot Mappings Extracted

### Individual P Slots (Day 1)
| Slot | Day | Period | Time |
|------|-----|--------|------|
| P1 | 1 | 1 | 08:00-08:50 |
| P2 | 1 | 2 | 08:50-09:40 |
| P3 | 1 | 3 | 09:45-10:35 |
| P4 | 1 | 4 | 10:40-11:30 |
| P5 | 1 | 5 | 11:35-12:25 |

### Hyphenated P Slots (Day 1)
| Slot | Day | Periods | Times |
|------|-----|----------|-------|
| P1-P2 | 1 | 1, 2 | 08:00-09:40 |
| P3-P4 | 1 | 3, 4 | 09:45-11:30 |

### P Slots (Day 2)
| Slot | Day | Periods | Times |
|------|-----|----------|-------|
| P16-P17 | 2 | 6, 7 | 12:30-02:15 |
| P18-P19 | 2 | 8, 9 | 02:20-04:00 |
| P20 | 2 | 10 | 04:00-04:50 |

### P Slots (Day 3)
| Slot | Day | Periods | Times |
|------|-----|----------|-------|
| P21-P22 | 3 | 1, 2 | 08:00-09:40 |
| P23-P24 | 3 | 3, 4 | 09:45-11:30 |
| P25 | 3 | 5 | 11:35-12:25 |

### P Slots (Day 4)
| Slot | Day | Periods | Times |
|------|-----|----------|-------|
| P36-P37 | 4 | 6, 7 | 12:30-02:15 |
| P38 | 4 | 8 | 02:20-03:10 |
| P39 | 4 | 9 | 03:10-04:00 |
| P40 | 4 | 10 | 04:00-04:50 |

### P Slots (Day 5)
| Slot | Day | Periods | Times |
|------|-----|----------|-------|
| P41-P42 | 5 | 1, 2 | 08:00-09:40 |
| P43-P44 | 5 | 3, 4 | 09:45-11:30 |
| P45 | 5 | 5 | 11:35-12:25 |

### Letter Slots
| Slot | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 |
|------|-------|-------|-------|-------|-------|
| **A** | Periods 6, 7 | Period 5 | Period 8 | - | - |
| **B** | - | Periods 1, 2 | Period 10 | Period 3 | - |
| **C** | - | - | Periods 6, 7 | Period 5 | Period 8 |
| **D** | - | - | Period 9 | Periods 1, 2 | Period 10 |
| **E** | - | - | - | Period 4 | Periods 6, 7 |
| **F** | Periods 8, 9 | - | - | - | Period 9 |
| **G** | Period 10 | Periods 3, 4 | - | - | - |

### Lab Slots (L)
| Slot | Day | Periods | Times |
|------|-----|----------|-------|
| L11-L12 | 1 | 11, 12 | 04:50-06:10 |
| L21-L22 | 2 | 11, 12 | 04:50-06:10 |
| L31-L32 | 3 | 11, 12 | 04:50-06:10 |
| L41-L42 | 4 | 11, 12 | 04:50-06:10 |
| L51-L52 | 5 | 11, 12 | 04:50-06:10 |

---

## Summary Statistics

- **Total Slots**: 32
- **P Slots**: 20 (individual + hyphenated)
- **Letter Slots**: 7 (A, B, C, D, E, F, G)
- **Lab Slots**: 5 (L11-L12, L21-L22, L31-L32, L41-L42, L51-L52)

---

## Notes

- **P37-P38** was removed (not in your table - only P36-P37, P38, P39, P40 exist)
- **P38-P39** and **P39-P40** were removed (not in your table)
- Individual P slots (P1, P2, P3, P4) were added for Day 1
- All unused slots (H, I, J, K, L, M, N, O, P, and unused L slots) were removed
- Only slots present in your provided timetable are included

