import { act } from '@testing-library/react';
import { useExamStore } from './examStore';

// Reset store between tests
beforeEach(() => {
  useExamStore.setState({
    sessionId: null,
    currentQuestionIndex: 0,
    answers: {},
    lastSaved: null,
    isConnected: false,
  });
});

describe('examStore', () => {
  describe('setAnswer', () => {
    it('should set answer for a question', () => {
      act(() => {
        useExamStore.getState().setAnswer('q-1', 'opt-a');
      });
      const { answers } = useExamStore.getState();
      expect(answers['q-1']).toBeDefined();
      expect(answers['q-1'].answer).toBe('opt-a');
    });

    it('should preserve isDoubtful when setting answer', () => {
      // First set doubtful
      act(() => {
        useExamStore.getState().toggleDoubtful('q-1');
      });
      // Then set answer
      act(() => {
        useExamStore.getState().setAnswer('q-1', 'opt-b');
      });
      const { answers } = useExamStore.getState();
      expect(answers['q-1'].answer).toBe('opt-b');
      expect(answers['q-1'].isDoubtful).toBe(true);
    });

    it('should set isDoubtful to false by default when no previous state', () => {
      act(() => {
        useExamStore.getState().setAnswer('q-new', 'opt-x');
      });
      expect(useExamStore.getState().answers['q-new'].isDoubtful).toBe(false);
    });
  });

  describe('toggleDoubtful', () => {
    it('should toggle doubtful state from false to true', () => {
      act(() => {
        useExamStore.getState().setAnswer('q-1', 'opt-a');
        useExamStore.getState().toggleDoubtful('q-1');
      });
      expect(useExamStore.getState().answers['q-1'].isDoubtful).toBe(true);
    });

    it('should toggle doubtful state from true to false', () => {
      act(() => {
        useExamStore.getState().toggleDoubtful('q-1');
        useExamStore.getState().toggleDoubtful('q-1');
      });
      expect(useExamStore.getState().answers['q-1'].isDoubtful).toBe(false);
    });

    it('should preserve answer when toggling doubtful', () => {
      act(() => {
        useExamStore.getState().setAnswer('q-1', 'opt-c');
        useExamStore.getState().toggleDoubtful('q-1');
      });
      expect(useExamStore.getState().answers['q-1'].answer).toBe('opt-c');
    });

    it('should work on question with no previous answer', () => {
      act(() => {
        useExamStore.getState().toggleDoubtful('q-fresh');
      });
      expect(useExamStore.getState().answers['q-fresh'].isDoubtful).toBe(true);
      expect(useExamStore.getState().answers['q-fresh'].answer).toBe('');
    });
  });

  describe('loadSavedAnswers', () => {
    it('should load and parse saved answers from Redis format', () => {
      const redisAnswers = {
        'q-1': JSON.stringify({ answer: 'opt-a', isDoubtful: false, savedAt: 12345 }),
        'q-2': JSON.stringify({ answer: 'opt-c', isDoubtful: true, savedAt: 12346 }),
      };

      act(() => {
        useExamStore.getState().loadSavedAnswers(redisAnswers);
      });

      const { answers } = useExamStore.getState();
      expect(answers['q-1'].answer).toBe('opt-a');
      expect(answers['q-1'].isDoubtful).toBe(false);
      expect(answers['q-2'].answer).toBe('opt-c');
      expect(answers['q-2'].isDoubtful).toBe(true);
    });

    it('should handle empty savedAnswers', () => {
      act(() => {
        useExamStore.getState().loadSavedAnswers({});
      });
      expect(useExamStore.getState().answers).toEqual({});
    });

    it('should replace existing answers', () => {
      act(() => {
        useExamStore.getState().setAnswer('q-1', 'opt-old');
        useExamStore.getState().loadSavedAnswers({
          'q-1': JSON.stringify({ answer: 'opt-new', isDoubtful: false }),
        });
      });
      expect(useExamStore.getState().answers['q-1'].answer).toBe('opt-new');
    });
  });
});
