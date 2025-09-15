import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MCQObfuscation, AnswerTimingTracker, ClientMonitor, SubmissionSecurity } from '@/lib/mcq-security';

interface MCQEvaluationResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  questionResults: {
    questionId: string;
    score: number;
    maxScore: number;
    isCorrect: boolean;
    selectedOptions: string[];
    correctOptions: string[];
    timingData?: {
      timeSpent: number;
      changeCount: number;
      averageChangeInterval: number;
    };
  }[];
  securityAnalysis: {
    timingAnalysis: any;
    monitoringReport: any;
    integrityScore: number;
    riskFlags: string[];
  };
}

export const useFrontendMCQEvaluation = () => {
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timingTracker = useRef(new AnswerTimingTracker());
  const clientMonitor = useRef(ClientMonitor.getInstance());

  const evaluateMCQAssessment = useCallback(async (
    assessment: any,
    answers: Record<string, any>,
    instance: any
  ): Promise<MCQEvaluationResult | null> => {
    try {
      setEvaluating(true);
      setError(null);
      
      const evaluationStart = performance.now();

      // Start client monitoring if not already active
      clientMonitor.current.start();

      // Check if all questions are MCQ
      const isMCQOnly = assessment?.questions?.every((q: any) => q.question_type === 'mcq');
      if (!isMCQOnly) {
        throw new Error('This evaluation method is only for MCQ-only assessments');
      }

      let totalScore = 0;
      let maxPossibleScore = 0;
      const questionResults: any[] = [];
      const riskFlags: string[] = [];

      // Evaluate each MCQ question with security checks
      for (const question of assessment.questions) {
        const questionPoints = question.points || 0;
        maxPossibleScore += questionPoints;
        
        const answer = answers[question.id];
        const selectedOptions = answer?.selectedOptions || [];
        
        // Decode correct options (they should be encoded in the question config)
        let correctOptions: string[] = [];
        try {
          if (question.config?.encodedAnswers) {
            correctOptions = MCQObfuscation.decode(question.config.encodedAnswers);
          } else {
            // Fallback: try to get from options (for backwards compatibility)
            correctOptions = question.config?.options
              ?.filter((option: any) => option.isCorrect)
              ?.map((option: any) => option.id) || [];
            
            if (correctOptions.length > 0) {
              riskFlags.push(`Q${question.id}: Answers not properly encoded`);
            }
          }
        } catch {
          riskFlags.push(`Q${question.id}: Failed to decode answers`);
          correctOptions = [];
        }

        // Verify answer integrity
        if (question.config?.answerChecksum) {
          const expectedChecksum = MCQObfuscation.generateChecksum(correctOptions);
          if (expectedChecksum !== question.config.answerChecksum) {
            riskFlags.push(`Q${question.id}: Answer integrity check failed`);
          }
        }

        // Check if answer is correct (exact match for both single and multiple choice)
        const isCorrect = selectedOptions.length === correctOptions.length &&
                         selectedOptions.every((selected: string) => correctOptions.includes(selected)) &&
                         correctOptions.every((correct: string) => selectedOptions.includes(correct));

        const score = isCorrect ? questionPoints : 0;
        totalScore += score;

        // Get timing analysis for this question
        const timingData = timingTracker.current.endQuestion(question.id);

        questionResults.push({
          questionId: question.id,
          score,
          maxScore: questionPoints,
          isCorrect,
          selectedOptions,
          correctOptions,
          timingData
        });
      }

      const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

      // Generate comprehensive security analysis
      const timingAnalysis = timingTracker.current.getAnalysis();
      const monitoringReport = clientMonitor.current.getReport();
      
      // Calculate integrity score
      let integrityScore = 100;
      integrityScore -= riskFlags.length * 10;
      integrityScore -= timingAnalysis.riskScore;
      integrityScore -= monitoringReport.riskLevel === 'high' ? 20 : 
                       monitoringReport.riskLevel === 'medium' ? 10 : 0;
      
      integrityScore = Math.max(0, Math.min(100, integrityScore));

      const allRiskFlags = [
        ...riskFlags,
        ...timingAnalysis.suspiciousPatterns,
        ...monitoringReport.activities.slice(-3) // Last 3 monitoring alerts
      ];

      const evaluationEnd = performance.now();
      console.log(`MCQ Evaluation completed in ${Math.round(evaluationEnd - evaluationStart)}ms`);

      return {
        totalScore,
        maxPossibleScore,
        percentage,
        questionResults,
        securityAnalysis: {
          timingAnalysis,
          monitoringReport,
          integrityScore,
          riskFlags: allRiskFlags
        }
      };

    } catch (err) {
      console.error('Error evaluating MCQ assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to evaluate assessment');
      return null;
    } finally {
      setEvaluating(false);
      clientMonitor.current.stop();
    }
  }, []);

  const saveBatchResults = useCallback(async (
    evaluation: MCQEvaluationResult,
    instance: any,
    answers: Record<string, any>
  ) => {
    try {
      // Encrypt submission data for security
      const submissionSecurity = SubmissionSecurity.encryptSubmission(answers, instance.id);
      
      // 1. Save all submissions first with enhanced security data
      const submissionInserts = Object.entries(answers).map(([questionId, answer]) => ({
        instance_id: instance.id,
        question_id: questionId,
        answer: answer,
        submitted_at: new Date().toISOString(),
        // Add security metadata
        security_metadata: {
          encrypted_checksum: submissionSecurity.checksum,
          browser_fingerprint: submissionSecurity.fingerprint,
          submission_timestamp: submissionSecurity.timestamp
        }
      }));

      // Execute submissions first
      const { data: submissions, error: submissionError } = await supabase
        .from('submissions')
        .upsert(submissionInserts, { 
          onConflict: 'instance_id,question_id',
          ignoreDuplicates: false 
        })
        .select();

      if (submissionError) throw submissionError;

      // 2. Create evaluations for each submission with security analysis
      if (submissions) {
        const evaluationInserts = evaluation.questionResults.map((result) => {
          const submission = submissions.find((s: any) => s.question_id === result.questionId);
          return submission ? {
            submission_id: submission.id,
            score: result.score,
            max_score: result.maxScore,
            integrity_score: evaluation.securityAnalysis.integrityScore,
            evaluator_type: 'frontend_secure',
            ai_feedback: {
              question_type: 'mcq',
              evaluation_method: 'frontend_secure_instant',
              is_correct: result.isCorrect,
              selected_options: result.selectedOptions,
              correct_options: result.correctOptions,
              timing_data: result.timingData,
              security_analysis: evaluation.securityAnalysis,
              timestamp: new Date().toISOString()
            }
          } : null;
        }).filter(Boolean);

        if (evaluationInserts.length > 0) {
          const { error: evaluationError } = await supabase
            .from('evaluations')
            .insert(evaluationInserts);
          
          if (evaluationError) throw evaluationError;
        }
      }

      // 3. Update assessment instance with final results and security analysis
      const { error: instanceError } = await supabase
        .from('assessment_instances')
        .update({
          total_score: evaluation.totalScore,
          max_possible_score: evaluation.maxPossibleScore,
          integrity_score: evaluation.securityAnalysis.integrityScore,
          status: 'evaluated',
          evaluation_status: 'completed',
          submitted_at: new Date().toISOString(),
          time_remaining_seconds: 0,
          duration_taken_seconds: ((instance.time_remaining_seconds || 0) - 0), // This will be set by the calling component
          security_metadata: {
            evaluation_type: 'frontend_secure',
            integrity_score: evaluation.securityAnalysis.integrityScore,
            risk_flags_count: evaluation.securityAnalysis.riskFlags.length,
            monitoring_activities: evaluation.securityAnalysis.monitoringReport.activitiesCount,
            timing_risk_score: evaluation.securityAnalysis.timingAnalysis.riskScore
          }
        })
        .eq('id', instance.id);

      if (instanceError) throw instanceError;

      return true;
    } catch (err) {
      console.error('Error saving batch results:', err);
      throw err;
    }
  }, []);

  // Utility methods for question management
  const startQuestionTiming = useCallback((questionId: string) => {
    timingTracker.current.startQuestion(questionId);
  }, []);

  const recordAnswerChange = useCallback((questionId: string) => {
    timingTracker.current.recordChange(questionId);
  }, []);

  return {
    evaluateMCQAssessment,
    saveBatchResults,
    startQuestionTiming,
    recordAnswerChange,
    evaluating,
    error
  };
};