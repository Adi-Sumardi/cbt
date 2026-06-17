# Bug Report — CBT App

Generated: 2026-06-15

## Bug Summary

| ID | Severity | Component | Description | Status |
|----|----------|-----------|-------------|--------|
| BUG-01 | Critical | Backend API | Missing `resume` endpoint called by frontend | Fixed |
| BUG-02 | High | Backend | Duplicate `ExamGateway` provider in 3 modules | Fixed |
| BUG-03 | High | Backend WebSocket | Students join wrong room — broadcast never reaches them | Fixed |
| BUG-04 | Medium | Frontend | `questions` variable used before declaration in `doAutoSave` | Fixed |
| BUG-05 | Medium | Frontend | Stale closure in countdown timer — `handleSubmit` captured at mount | Fixed |
| BUG-06 | Medium | Backend | `ImportController` crashes with 500 if no file uploaded | Fixed |
| BUG-07 | Low | Backend | Options re-shuffled on every resume (non-deterministic UX) | Documented |

---

## Detailed Bug Descriptions

### BUG-01 — Missing `resume` Endpoint (Critical) ✅ Fixed

**File:** `apps/web/src/app/exam/[sessionId]/page.tsx` line 46
**Description:** Frontend calls `POST /api/sessions/exam-session/${sessionId}/resume` to reload an in-progress session when the page is refreshed. This endpoint did not exist in `SessionsController`.
**Impact:** Students who refresh the exam page get a network error and lose their place.
**Fix:** Added `resume(sessionId, studentId)` method to `SessionsService` and `POST exam-session/:sessionId/resume` route to `SessionsController`. The method fetches the session, verifies ownership, restores question order from `session.questionOrder`, fetches saved answers from Redis, and returns `{ session, exam, savedAnswers }`.

---

### BUG-02 — Duplicate `ExamGateway` Provider (High) ✅ Fixed

**Files:**
- `apps/api/src/exams/exams.module.ts`
- `apps/api/src/questions/questions.module.ts`
- `apps/api/src/app.module.ts`

**Description:** `ExamGateway` was registered as a provider in all three NestJS modules. Since `RedisModule` is global, each gateway instance would have its own Redis injection but NestJS would create multiple instances of the gateway, leading to unpredictable behavior (only one instance serves WebSocket connections, others are orphaned but still hold Redis connections).
**Impact:** Memory leak (multiple Redis connections), potential state inconsistencies in gateway.
**Fix:** Created `WebsocketModule` that provides and exports `ExamGateway`. `ExamsModule` and `QuestionsModule` import `WebsocketModule` to get the gateway. `AppModule` also imports `WebsocketModule` and no longer declares `ExamGateway` in providers.

---

### BUG-03 — Wrong WebSocket Room Name (High) ✅ Fixed

**File:** `apps/api/src/websocket/exam.gateway.ts` lines 47-53
**Description:** When a teacher edits or nullifies a question, `broadcastQuestionUpdate()` and `broadcastQuestionNullified()` emitted to room `exam:${examId}`. However, students only joined `session:${sessionId}` rooms (and teachers joined `exam:${examId}:teacher`). The room `exam:${examId}` had no members.
**Impact:** Real-time question updates from teachers never reached students.
**Fix:** Students now also join `exam:${examId}:students` room when connecting. Broadcast methods now emit to `exam:${examId}:students`.

---

### BUG-04 — `questions` Variable Used Before Declaration (Medium) ✅ Fixed

**File:** `apps/web/src/app/exam/[sessionId]/page.tsx` lines ~111, ~149
**Description:** The `doAutoSave` callback (defined ~line 111) references the `questions` variable, which is only declared on line ~149 (after early return guards). While JavaScript hoisting wouldn't crash here (the function body only runs when called, by which time `questions` would be in scope at component level), it is a logic error because `questions` is defined via `const questions = data?.exam?.questions ?? []` inside the render return section — the callback should not rely on closure over a variable that depends on render-time data being available.
**Fix:** `doAutoSave` now reads questions directly from `data?.exam?.questions ?? []` inside the callback.

---

### BUG-05 — Stale Closure in Countdown Timer (Medium) ✅ Fixed

**File:** `apps/web/src/app/exam/[sessionId]/page.tsx` lines ~70-83
**Description:** The countdown `useEffect` captured `handleSubmit` at the time the effect ran. `handleSubmit` is defined after the effect and closes over `submitMutation`. The dependency array `[timeLeft !== null]` means the effect runs once when timer becomes non-null. If the component re-renders, `handleSubmit` might be a stale reference, especially since `submitMutation` state changes after successful/failed submit.
**Fix:** Added `handleSubmitRef` (`useRef`) that is synced to the latest `handleSubmit` on every render. The countdown interval now calls `handleSubmitRef.current()`.

---

### BUG-06 — Missing File Null Check in ImportController (Medium) ✅ Fixed

**File:** `apps/api/src/import/import.controller.ts`
**Description:** When `POST /api/import/parse` is called without a file, `@UploadedFile()` returns `undefined`. The next line `this.importService.parseExcel(file.buffer)` throws `TypeError: Cannot read properties of undefined (reading 'buffer')`, which becomes an unhandled 500 error.
**Impact:** Any request without a file crashes with a generic 500 instead of a meaningful 400 error.
**Fix:** Added `if (!file) throw new BadRequestException('File tidak ditemukan')` before accessing `file.buffer`.

---

### BUG-07 — Non-Deterministic Option Shuffle on Resume (Low) — Documented Only

**File:** `apps/api/src/sessions/sessions.service.ts` line 68
**Description:** When `shuffleOptions` is true, options are re-shuffled on every call to `start()` (including resumes of `IN_PROGRESS` sessions). If a student refreshes the page, the option order changes, potentially confusing them (e.g., they remembered "B is correct" but now B is a different option).
**Recommendation:** Store the shuffled option order per question in the session (similar to how `questionOrder` stores the shuffled question order), then restore it on resume.
**Status:** Not fixed in this pass — requires a schema migration to store option order per session question.

---

## Test Coverage Added

### Backend (apps/api)

| File | Tests |
|------|-------|
| `src/auth/auth.service.spec.ts` | Login success/fail, register success/duplicate |
| `src/sessions/sessions.service.spec.ts` | Start (active/inactive/submitted), submit (score calc, nullified, ownership), getRemainingTime |
| `src/questions/questions.service.spec.ts` | Create (ordering), update (with/without options), nullify, importBulk |
| `src/import/import.service.spec.ts` | parseExcel (MC/T-F/Essay/invalid/empty), generateTemplate |

### Frontend (apps/web)

| File | Tests |
|------|-------|
| `src/store/examStore.test.ts` | setAnswer, toggleDoubtful, loadSavedAnswers |
| `src/components/ui/Button.test.tsx` | All variants, loading, disabled, click |
| `src/components/ui/Badge.test.tsx` | All colors, base classes |
| `src/__tests__/parseTextQuestions.test.ts` | MC/T-F/Essay parse, multiple questions, Arabic/Chinese, invalid format, custom points |

## Running Tests

```bash
# Backend
cd apps/api
pnpm test

# Frontend
cd apps/web
pnpm test
```
