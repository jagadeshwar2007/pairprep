# Pairprep — MNNIT Academic Platform

> **Your Branch. Your Semester. Your Preparation.**

Pairprep is a centralized academic platform designed for all 4 years and B.Tech branches at **Motilal Nehru National Institute of Technology (MNNIT Allahabad)**. It integrates lecture notes, previous-year question papers (PYQs), midsem/endsem exams, laboratory manuals, question practice sessions, academic calculators, and the official MNNIT Academic Calendar.

---

## 🚀 Tech Stack

* **Framework**: Next.js 16 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS & custom shadcn-style component architecture
* **Icons**: Lucide React

---

## 🛠️ Getting Started

First, install dependencies (if not already installed):

```bash
npm install
```

Run the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

---

## 📦 Project Structure

```text
src/
├── app/                  # Next.js App Router pages and layouts
│   ├── calendar/         # Official MNNIT Academic Calendar (2026-27)
│   ├── resources/        # 5-tier academic hierarchy (Year > Branch > Sem > Subject > Material)
│   ├── practice/         # Question practice and assessment
│   ├── tools/            # Attendance (75% rule), Scientific Calc, Timer, SGPA, CGPA
│   ├── submit/           # Student resource contribution portal
│   └── admin/            # Administrative review and moderation
├── components/           # Reusable UI, layout, academic, and calendar components
├── data/                 # Data catalogs (Academic curricula, resources, official calendar)
├── lib/                  # Utility helpers and calendar-attendance bridge
└── types/                # Strongly-typed TypeScript domain definitions
```

---

## 📜 Build & Verification

```bash
# Run lint check
npm run lint

# Build production bundle
npm run build
```
