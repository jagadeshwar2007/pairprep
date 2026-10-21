import { PracticeQuestion } from '@/types';
import { SUBJECTS } from '@/data/academicData';

/** Subjects that have practice questions (ids come from the subject dataset). */
export const PRACTICE_SUBJECTS = [
  { subjectId: 'cse-sem2-ord4-csn12401', label: 'Data Structures' },
  { subjectId: 'cse-sem4-ord2-csn14401', label: 'Operating Systems' },
  { subjectId: 'cse-sem1-ord2-man11101', label: 'Mathematics I' },
] as const;

type PracticeQuestionSeed = Omit<PracticeQuestion, 'subjectName'>;

function hydrateQuestion(seed: PracticeQuestionSeed): PracticeQuestion {
  const subject = SUBJECTS.find((s) => s.id === seed.subjectId);
  if (!subject) {
    throw new Error(`Practice question "${seed.id}" references unknown subjectId "${seed.subjectId}"`);
  }
  return { ...seed, subjectName: subject.title ?? subject.name };
}

const PRACTICE_QUESTION_SEEDS: PracticeQuestionSeed[] = [
  {
    id: 'pq-ds-01',
    subjectId: 'cse-sem2-ord4-csn12401',
    topic: 'Binary Search Trees & Balancing',
    difficulty: 'Medium',
    question: 'What is the worst-case time complexity of searching an element in an un-balanced Binary Search Tree (BST) with n nodes versus an AVL Tree?',
    options: [
      'O(log n) for BST, O(n) for AVL',
      'O(n) for BST, O(log n) for AVL',
      'O(n) for both BST and AVL',
      'O(log n) for both BST and AVL',
    ],
    correctAnswer: 1,
    explanation:
      'In a degenerate BST (e.g. inserting elements in strictly increasing order), the tree degenerates into a linear chain resulting in O(n) worst-case search time. An AVL tree is strictly self-balancing with height bounded by 1.44 log₂(n), guaranteeing O(log n) worst-case search time.',
    yearReference: 'Sample Concept Question',
  },
  {
    id: 'pq-ds-02',
    subjectId: 'cse-sem2-ord4-csn12401',
    topic: 'Graph Algorithms',
    difficulty: 'Hard',
    question: 'Consider a directed graph with negative edge weights but no negative cycles. Which algorithm is guaranteed to find single-source shortest paths correctly?',
    options: [
      'Dijkstra\'s algorithm with min-heap',
      'Breadth-First Search (BFS)',
      'Bellman-Ford algorithm',
      'Prim\'s algorithm',
    ],
    correctAnswer: 2,
    explanation:
      'Dijkstra\'s algorithm greedily assumes that once a vertex is finalized, its shortest path cannot be improved. With negative weight edges, this greedy property fails. The Bellman-Ford algorithm relaxes all edges V-1 times and correctly computes shortest paths in O(V · E) time even with negative edges (and can detect negative weight cycles).',
    yearReference: 'Sample Algorithm Analysis',
  },
  {
    id: 'pq-ds-03',
    subjectId: 'cse-sem2-ord4-csn12401',
    topic: 'Sorting & Heaps',
    difficulty: 'Easy',
    question: 'What is the time complexity to build a binary max-heap from an unordered array of n elements using the bottom-up Heapify approach?',
    options: [
      'O(n log n)',
      'O(n)',
      'O(log n)',
      'O(n²)',
    ],
    correctAnswer: 1,
    explanation:
      'Although inserting n elements one-by-one takes O(n log n), the bottom-up Floyd\'s build-heap algorithm runs in O(n) time because the majority of nodes are near the leaves where heapify takes few operations. The summation Σ (h / 2^h) converges to 2, yielding O(n).',
    yearReference: 'Sample Fundamentals Sheet',
  },
  {
    id: 'pq-os-01',
    subjectId: 'cse-sem4-ord2-csn14401',
    topic: 'Deadlocks & Resource Allocation',
    difficulty: 'Medium',
    question: 'Which of the following is NOT one of the four Coffman conditions necessary for a deadlock to occur?',
    options: [
      'Mutual Exclusion',
      'Hold and Wait',
      'Preemption allowed by kernel',
      'Circular Wait',
    ],
    correctAnswer: 2,
    explanation:
      'The four Coffman conditions are: 1. Mutual Exclusion, 2. Hold and Wait, 3. NO Preemption (resources cannot be forcibly taken away), and 4. Circular Wait. If preemption is allowed, deadlocks can be broken, so preemption is NOT a necessary condition for deadlock.',
    yearReference: 'Sample Operating Systems Practice',
  },
  {
    id: 'pq-math-01',
    subjectId: 'cse-sem1-ord2-man11101',
    topic: 'Linear Algebra & Matrices',
    difficulty: 'Easy',
    question: 'If A is a 3×3 real symmetric matrix with eigenvalues 2, 3, and 5, what is the determinant of matrix A?',
    options: [
      '10',
      '30',
      '0',
      '25',
    ],
    correctAnswer: 1,
    explanation:
      'The determinant of any square matrix is equal to the product of its eigenvalues. Here, det(A) = 2 × 3 × 5 = 30. (Additionally, the trace equals 2 + 3 + 5 = 10).',
    yearReference: 'Sample Calculus & Algebra Practice',
  },
];

export const DEMO_PRACTICE_QUESTIONS: PracticeQuestion[] = PRACTICE_QUESTION_SEEDS.map(hydrateQuestion);
