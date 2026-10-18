import { Student } from '../types';

export interface ParsedGradeInfo {
  cleanGrade: string;     // e.g. 'Grade 10', 'Grade 1', 'LKG', 'Pre-KG', 'Nursery'
  cleanSection: string;   // e.g. 'A', 'B', 'C', or ''
  displayString: string;  // e.g. 'Grade 10 — Section A' or 'Grade 10'
  rawGrade: string;
}

const CANONICAL_GRADE_ORDER = [
  'Nursery',
  'Pre-KG',
  'LKG',
  'UKG',
  'KG 1',
  'KG 2',
  'KG 3',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12'
];

/**
 * Robustly parses and normalizes any raw grade / section combination.
 * Strips the 'Grade' word and keeps clean compact representation:
 * Examples: 'Grade 1A' -> '1A', 'Grade 1' -> '1', '10 A' -> '10A', 'UKG C' -> 'UKG C', 'LKG' -> 'LKG'.
 */
export function parseGradeAndSection(rawGrade?: string | null, rawDept?: string | null): ParsedGradeInfo {
  const raw = (rawGrade || '').trim();
  const dept = (rawDept || '').trim();

  let extractedSec = '';
  if (/^[A-Za-z]$/.test(dept)) {
    extractedSec = dept.toUpperCase();
  }

  // Strip leading 'Grade ' or 'grade '
  let g = raw.replace(/^Grade\s+/i, '').trim();

  let cleanGrade = '';
  let cleanSec = extractedSec;

  // 1. Nursery
  if (/^nursery/i.test(g)) {
    cleanGrade = 'Nursery';
    const m = g.match(/\b([A-Za-z])\b$/);
    if (m && !cleanSec) cleanSec = m[1].toUpperCase();
  }
  // 2. Pre-KG / Per KG / Pre Kg
  else if (/^(pre[\s-_]*kg|per[\s-_]*kg|per[\s-_]*gk)/i.test(g)) {
    cleanGrade = 'Pre-KG';
    const m = g.match(/\b([A-Za-z])\b$/);
    if (m && !cleanSec) cleanSec = m[1].toUpperCase();
  }
  // 3. LKG
  else if (/^1?lkg/i.test(g)) {
    cleanGrade = 'LKG';
    const m = g.match(/\b([A-Za-z])\b$/) || g.match(/lkg\s*([A-Za-z])/i);
    if (m && !cleanSec) cleanSec = m[1].toUpperCase();
  }
  // 4. UKG
  else if (/^ukg/i.test(g)) {
    cleanGrade = 'UKG';
    const m = g.match(/\b([A-Za-z])\b$/) || g.match(/ukg\s*([A-Za-z])/i);
    if (m && !cleanSec) cleanSec = m[1].toUpperCase();
  }
  // 5. KG 1 / KG 2 / KG 3
  else if (/^kg\s*(\d)/i.test(g)) {
    const mKg = g.match(/^kg\s*(\d)/i);
    cleanGrade = mKg ? `KG ${mKg[1]}` : 'KG';
    const m = g.match(/\b([A-Za-z])\b$/) || g.match(/^kg\s*\d\s*([A-Za-z])/i);
    if (m && !cleanSec) cleanSec = m[1].toUpperCase();
  }
  // 6. Numeric Grades: 1 to 12 (Strip 'Grade ' word completely)
  else {
    const numMatch = g.match(/^(\d{1,2})/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num >= 1 && num <= 12) {
        cleanGrade = `${num}`;
        const rest = g.substring(numMatch[1].length).trim().replace(/^[-_\s]+/, '');
        const secMatch = rest.match(/^([A-Za-z])/);
        if (secMatch && !cleanSec) {
          cleanSec = secMatch[1].toUpperCase();
        }
      }
    }
  }

  // Fallback if unrecognized
  if (!cleanGrade) {
    cleanGrade = raw ? raw.replace(/^Grade\s+/i, '').trim() : '10';
  }

  // Display string: e.g. '1A' or '1' or 'LKG C' or 'Nursery'
  let displayString = cleanGrade;
  if (cleanSec) {
    if (/^\d+$/.test(cleanGrade)) {
      displayString = `${cleanGrade}${cleanSec}`;
    } else {
      displayString = `${cleanGrade} ${cleanSec}`;
    }
  }

  return {
    cleanGrade,
    cleanSection: cleanSec,
    displayString,
    rawGrade: raw
  };
}

/**
 * Returns the normalized clean grade for a student (e.g. '10', '1', 'LKG')
 */
export function getCleanGrade(student: Partial<Student>): string {
  return parseGradeAndSection(student.grade, student.department).cleanGrade;
}

/**
 * Returns the normalized clean section for a student (e.g. 'A', 'B', or '')
 */
export function getCleanSection(student: Partial<Student>): string {
  return parseGradeAndSection(student.grade, student.department).cleanSection;
}

/**
 * Returns human-readable display string without 'Grade' word: e.g. '1A' or '1' or 'UKG C'
 */
export function getGradeDisplay(student: Partial<Student>): string {
  return parseGradeAndSection(student.grade, student.department).displayString;
}

/**
 * Checks if a student matches a selected grade filter.
 * Supports filters like 'ALL', '10', '1', '1A', 'LKG', etc.
 */
export function matchesGradeFilter(student: Partial<Student>, filterValue: string): boolean {
  if (!filterValue || filterValue === 'ALL') return true;

  const targetClean = filterValue.replace(/^Grade\s+/i, '').trim();
  const studentInfo = parseGradeAndSection(student.grade, student.department);

  // Match full display string (e.g. '1A') or base grade (e.g. '1')
  if (studentInfo.displayString.toLowerCase() === targetClean.toLowerCase()) return true;
  if (studentInfo.cleanGrade.toLowerCase() === targetClean.toLowerCase()) return true;

  return false;
}

/**
 * Checks if a student matches a selected section filter.
 * Supports filters like 'ALL', 'A', 'Section A', etc.
 */
export function matchesSectionFilter(student: Partial<Student>, filterValue: string): boolean {
  if (!filterValue || filterValue === 'ALL') return true;

  const cleanFilterSec = filterValue.replace(/^Section\s+/i, '').trim().toUpperCase();
  const studentSec = getCleanSection(student);

  return studentSec === cleanFilterSec;
}

/**
 * Extracts and sorts distinct grade options present in the dataset.
 */
export function getDistinctGradeOptions(students: Student[]): string[] {
  const set = new Set<string>();
  students.forEach(s => {
    const cg = getCleanGrade(s);
    if (cg) set.add(cg);
  });

  return Array.from(set).sort((a, b) => {
    const idxA = CANONICAL_GRADE_ORDER.indexOf(a);
    const idxB = CANONICAL_GRADE_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Extracts and sorts distinct section options present in the dataset.
 * If gradeFilter is provided and not 'ALL', returns sections available in that grade.
 */
export function getDistinctSectionOptions(students: Student[], gradeFilter?: string): string[] {
  const set = new Set<string>();
  students.forEach(s => {
    if (gradeFilter && gradeFilter !== 'ALL' && !matchesGradeFilter(s, gradeFilter)) {
      return;
    }
    const sec = getCleanSection(s);
    if (sec) set.add(sec);
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
