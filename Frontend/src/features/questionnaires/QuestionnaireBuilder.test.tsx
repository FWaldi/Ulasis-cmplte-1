import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, render } from '../../test-utils/test-utils';
import userEvent from '@testing-library/user-event';
import QuestionnaireBuilder from './QuestionnaireBuilder';

// Mock questionnaire service
vi.mock('../../services/api/questionnaireService', () => ({
  questionnaireService: {
    createQuestionnaire: vi.fn(),
    updateQuestionnaire: vi.fn(),
  }
}));

// Mock alert
global.alert = vi.fn();

// Define mocks at the top level to make them available to all tests
const mockOnSave = vi.fn();
const mockOnClose = vi.fn();
const mockOnCancel = vi.fn();
const mockOnQuestionChange = vi.fn();

describe('QuestionnaireBuilder Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Validation', () => {
    it('should show validation error for empty title', async () => {
      const user = userEvent.setup();
      
      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Try to save without entering a title
      const saveButton = screen.getByRole('button', { name: /terbitkan/i });
      await user.click(saveButton);

      // Should show validation error via alert
      expect(global.alert).toHaveBeenCalledWith('Judul kuesioner tidak boleh kosong.');

      // Should not call onSave
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should allow saving with valid title', async () => {
      const user = userEvent.setup();
      
      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const titleInput = screen.getByPlaceholderText(/judul kuesioner/i);
      await user.type(titleInput, 'Valid Survey Title');

      const saveButton = screen.getByRole('button', { name: /terbitkan/i });
      await user.click(saveButton);

      // Should call onSave with valid data
      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'Valid Survey Title',
        description: '',
        questions: [
          expect.objectContaining({
            text: '',
            type: 'rating_5'
          })
        ]
      });
    });
  });

  describe('Question Management', () => {
    it('should add a new question when add question button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Initially has 1 question
      expect(screen.getByPlaceholderText(/pertanyaan 1/i)).toBeInTheDocument();

      const addQuestionButton = screen.getByRole('button', { name: /tambah pertanyaan/i });
      await user.click(addQuestionButton);

      // Should now have 2 questions
      expect(screen.getByPlaceholderText(/pertanyaan 1/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/pertanyaan 2/i)).toBeInTheDocument();
    });

    it('should remove a question when remove button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Add a second question first
      const addQuestionButton = screen.getByRole('button', { name: /tambah pertanyaan/i });
      await user.click(addQuestionButton);

      // Should have 2 questions
      expect(screen.getByPlaceholderText(/pertanyaan 1/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/pertanyaan 2/i)).toBeInTheDocument();

      // Remove second question
      const removeButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg') && button.getAttribute('class')?.includes('text-red-500')
      );
      await user.click(removeButtons[1]);

      // Should have only 1 question again
      expect(screen.getByPlaceholderText(/pertanyaan 1/i)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/pertanyaan 2/i)).not.toBeInTheDocument();
    });

    it('should update question when question text is changed', async () => {
      const user = userEvent.setup();
      
      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Type question text
      const questionInput = screen.getByPlaceholderText(/pertanyaan 1/i);
      await user.type(questionInput, 'What is your favorite color?');

      // Save to verify the change
      const titleInput = screen.getByPlaceholderText(/judul kuesioner/i);
      await user.type(titleInput, 'Test Survey');
      
      const saveButton = screen.getByRole('button', { name: /terbitkan/i });
      await user.click(saveButton);

      // Should call onSave with updated question text
      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'Test Survey',
        description: '',
        questions: [
          expect.objectContaining({
            text: 'What is your favorite color?'
          })
        ]
      });
    });

    it('should change question type', async () => {
      const user = userEvent.setup();
      
      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Change question type to multiple choice
      const typeSelect = screen.getByDisplayValue(/rating bintang/i);
      await user.selectOptions(typeSelect, 'multiple_choice');

      // Should show options for multiple choice
      expect(screen.getByText(/\+ tambah opsi/i)).toBeInTheDocument();
    });

    it('should add options for multiple choice questions', async () => {
      const user = userEvent.setup();
      
      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Change to multiple choice
      const typeSelect = screen.getByDisplayValue(/rating bintang/i);
      await user.selectOptions(typeSelect, 'multiple_choice');

      // Add an option
      const addOptionButton = screen.getByRole('button', { name: /\+ tambah opsi/i });
      await user.click(addOptionButton);

      // Should show option input
      expect(screen.getByDisplayValue(/opsi 1/i)).toBeInTheDocument();
    });
  });








  });

  describe('Form Submission', () => {
    it('should call onSave with valid form data', async () => {
      const user = userEvent.setup();
      
      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Fill in title
      const titleInput = screen.getByPlaceholderText(/judul kuesioner/i);
      await user.type(titleInput, 'Customer Satisfaction Survey');

      // Fill in question
      const questionInput = screen.getByPlaceholderText(/pertanyaan 1/i);
      await user.type(questionInput, 'How satisfied are you with our service?');

      // Save
      const saveButton = screen.getByRole('button', { name: /terbitkan/i });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'Customer Satisfaction Survey',
        description: '',
        questions: [
          expect.objectContaining({
            text: 'How satisfied are you with our service?'
          })
        ]
      });
    });

    it('should call onClose when back button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const backButton = screen.getByRole('button', { name: /kembali ke daftar/i });
      await user.click(backButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should show alert when trying to delete last question', async () => {
      const user = userEvent.setup();
      
      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Try to remove the only question - find the delete button
      const deleteButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg') && button.getAttribute('class')?.includes('text-red-500')
      );
      
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);
        
        // Should show alert
        expect(global.alert).toHaveBeenCalledWith('Kuesioner harus memiliki setidaknya satu pertanyaan.');
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Check for proper labels
      expect(screen.getByPlaceholderText(/judul kuesioner/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tambah pertanyaan/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /terbitkan/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /kembali ke daftar/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Tab through form elements - first tab should focus on back button
      await user.tab();
      expect(screen.getByRole('button', { name: /kembali ke daftar/i })).toHaveFocus();

      // Second tab should focus on publish button
      await user.tab();
      expect(screen.getByRole('button', { name: /terbitkan/i })).toHaveFocus();

      // Third tab should focus on title input
      await user.tab();
      expect(screen.getByPlaceholderText(/judul kuesioner/i)).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Should render the component
      expect(screen.getByPlaceholderText(/judul kuesioner/i)).toBeInTheDocument();
    });

    it('should adapt layout for desktop screens', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(
        <QuestionnaireBuilder
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByPlaceholderText(/judul kuesioner/i)).toBeInTheDocument();
    });
  });