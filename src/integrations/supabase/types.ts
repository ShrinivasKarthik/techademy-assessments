export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      assessment_auto_build: {
        Row: {
          ai_criteria: string | null
          assessment_id: string
          build_status: string | null
          created_at: string
          created_by: string
          difficulty_distribution: Json
          id: string
          question_types: Json
          selected_questions: Json | null
          target_skills: Json
          time_limit_minutes: number | null
          total_points: number | null
          updated_at: string
        }
        Insert: {
          ai_criteria?: string | null
          assessment_id: string
          build_status?: string | null
          created_at?: string
          created_by: string
          difficulty_distribution?: Json
          id?: string
          question_types?: Json
          selected_questions?: Json | null
          target_skills?: Json
          time_limit_minutes?: number | null
          total_points?: number | null
          updated_at?: string
        }
        Update: {
          ai_criteria?: string | null
          assessment_id?: string
          build_status?: string | null
          created_at?: string
          created_by?: string
          difficulty_distribution?: Json
          id?: string
          question_types?: Json
          selected_questions?: Json | null
          target_skills?: Json
          time_limit_minutes?: number | null
          total_points?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_auto_build_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_auto_build_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      assessment_files: {
        Row: {
          assessment_id: string | null
          content_type: string
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          question_id: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          assessment_id?: string | null
          content_type: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          question_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          assessment_id?: string | null
          content_type?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          question_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_files_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_files_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      assessment_instances: {
        Row: {
          assessment_id: string
          current_question_index: number | null
          duration_taken_seconds: number | null
          evaluated_at: string | null
          evaluation_retry_count: number | null
          evaluation_status: string | null
          evaluation_timeout_at: string | null
          id: string
          integrity_score: number | null
          is_anonymous: boolean
          max_possible_score: number | null
          participant_email: string | null
          participant_id: string | null
          participant_name: string | null
          proctoring_started_at: string | null
          proctoring_summary: Json | null
          proctoring_violations: Json | null
          questions_answered: number | null
          session_state: string | null
          share_token: string | null
          started_at: string
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string | null
          time_remaining_seconds: number | null
          total_score: number | null
        }
        Insert: {
          assessment_id: string
          current_question_index?: number | null
          duration_taken_seconds?: number | null
          evaluated_at?: string | null
          evaluation_retry_count?: number | null
          evaluation_status?: string | null
          evaluation_timeout_at?: string | null
          id?: string
          integrity_score?: number | null
          is_anonymous?: boolean
          max_possible_score?: number | null
          participant_email?: string | null
          participant_id?: string | null
          participant_name?: string | null
          proctoring_started_at?: string | null
          proctoring_summary?: Json | null
          proctoring_violations?: Json | null
          questions_answered?: number | null
          session_state?: string | null
          share_token?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          time_remaining_seconds?: number | null
          total_score?: number | null
        }
        Update: {
          assessment_id?: string
          current_question_index?: number | null
          duration_taken_seconds?: number | null
          evaluated_at?: string | null
          evaluation_retry_count?: number | null
          evaluation_status?: string | null
          evaluation_timeout_at?: string | null
          id?: string
          integrity_score?: number | null
          is_anonymous?: boolean
          max_possible_score?: number | null
          participant_email?: string | null
          participant_id?: string | null
          participant_name?: string | null
          proctoring_started_at?: string | null
          proctoring_summary?: Json | null
          proctoring_violations?: Json | null
          questions_answered?: number | null
          session_state?: string | null
          share_token?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          time_remaining_seconds?: number | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_instances_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_instances_assessment"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_shares: {
        Row: {
          access_count: number
          allow_anonymous: boolean
          assessment_id: string
          completion_count: number
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_attempts: number | null
          require_email: boolean
          require_name: boolean
          settings: Json | null
          share_token: string
        }
        Insert: {
          access_count?: number
          allow_anonymous?: boolean
          assessment_id: string
          completion_count?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_attempts?: number | null
          require_email?: boolean
          require_name?: boolean
          settings?: Json | null
          share_token: string
        }
        Update: {
          access_count?: number
          allow_anonymous?: boolean
          assessment_id?: string
          completion_count?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_attempts?: number | null
          require_email?: boolean
          require_name?: boolean
          settings?: Json | null
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_shares_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          creator_id: string | null
          description: string | null
          duration_minutes: number
          id: string
          instructions: string | null
          live_monitoring_enabled: boolean
          max_attempts: number | null
          proctoring_config: Json | null
          proctoring_enabled: boolean | null
          status: Database["public"]["Enums"]["assessment_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string | null
          live_monitoring_enabled?: boolean
          max_attempts?: number | null
          proctoring_config?: Json | null
          proctoring_enabled?: boolean | null
          status?: Database["public"]["Enums"]["assessment_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string | null
          live_monitoring_enabled?: boolean
          max_attempts?: number | null
          proctoring_config?: Json | null
          proctoring_enabled?: boolean | null
          status?: Database["public"]["Enums"]["assessment_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      collaborative_comments: {
        Row: {
          author_id: string | null
          author_name: string
          content: string
          created_at: string
          id: string
          parent_id: string | null
          question_id: string | null
          resolved: boolean
          session_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          question_id?: string | null
          resolved?: boolean
          session_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          question_id?: string | null
          resolved?: boolean
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "collaborative_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_sessions: {
        Row: {
          assessment_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          session_data: Json | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          session_data?: Json | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          session_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      collaborators: {
        Row: {
          created_at: string
          email: string | null
          id: string
          joined_at: string
          last_active: string | null
          name: string | null
          role: string
          session_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          joined_at?: string
          last_active?: string | null
          name?: string | null
          role?: string
          session_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          joined_at?: string
          last_active?: string | null
          name?: string | null
          role?: string
          session_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_questions: {
        Row: {
          added_at: string | null
          collection_id: string
          question_id: string
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          question_id: string
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_questions_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "question_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_intelligence: {
        Row: {
          ai_insights: Json | null
          communication_patterns: Json | null
          competency_analysis: Json | null
          conversation_flow_score: number | null
          conversation_quality_score: number | null
          created_at: string
          engagement_metrics: Json | null
          id: string
          personality_insights: Json | null
          recommendations: Json | null
          session_id: string
          skills_demonstrated: Json | null
          updated_at: string
        }
        Insert: {
          ai_insights?: Json | null
          communication_patterns?: Json | null
          competency_analysis?: Json | null
          conversation_flow_score?: number | null
          conversation_quality_score?: number | null
          created_at?: string
          engagement_metrics?: Json | null
          id?: string
          personality_insights?: Json | null
          recommendations?: Json | null
          session_id: string
          skills_demonstrated?: Json | null
          updated_at?: string
        }
        Update: {
          ai_insights?: Json | null
          communication_patterns?: Json | null
          competency_analysis?: Json | null
          conversation_flow_score?: number | null
          conversation_quality_score?: number | null
          created_at?: string
          engagement_metrics?: Json | null
          id?: string
          personality_insights?: Json | null
          recommendations?: Json | null
          session_id?: string
          skills_demonstrated?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          ai_feedback: Json | null
          evaluated_at: string
          evaluator_type: string | null
          feedback: string | null
          id: string
          integrity_score: number | null
          max_score: number
          proctoring_notes: string | null
          score: number
          submission_id: string
        }
        Insert: {
          ai_feedback?: Json | null
          evaluated_at?: string
          evaluator_type?: string | null
          feedback?: string | null
          id?: string
          integrity_score?: number | null
          max_score: number
          proctoring_notes?: string | null
          score: number
          submission_id: string
        }
        Update: {
          ai_feedback?: Json | null
          evaluated_at?: string
          evaluator_type?: string | null
          feedback?: string | null
          id?: string
          integrity_score?: number | null
          max_score?: number
          proctoring_notes?: string | null
          score?: number
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_evaluations_submission"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      external_integrations: {
        Row: {
          api_key_encrypted: string | null
          configuration: Json | null
          created_at: string
          created_by: string | null
          endpoint_url: string
          id: string
          integration_type: string
          last_sync_at: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          configuration?: Json | null
          created_at?: string
          created_by?: string | null
          endpoint_url: string
          id?: string
          integration_type: string
          last_sync_at?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          configuration?: Json | null
          created_at?: string
          created_by?: string | null
          endpoint_url?: string
          id?: string
          integration_type?: string
          last_sync_at?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      interview_benchmarks: {
        Row: {
          benchmark_data: Json
          created_at: string
          experience_level: string | null
          id: string
          industry: string | null
          performance_thresholds: Json
          role_type: string
          updated_at: string
        }
        Insert: {
          benchmark_data?: Json
          created_at?: string
          experience_level?: string | null
          id?: string
          industry?: string | null
          performance_thresholds?: Json
          role_type: string
          updated_at?: string
        }
        Update: {
          benchmark_data?: Json
          created_at?: string
          experience_level?: string | null
          id?: string
          industry?: string | null
          performance_thresholds?: Json
          role_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      interview_performance_metrics: {
        Row: {
          behavioral_score: number | null
          communication_score: number | null
          created_at: string
          engagement_score: number | null
          id: string
          improvement_areas: Json | null
          overall_score: number | null
          performance_data: Json | null
          response_relevance_score: number | null
          session_id: string
          strengths: Json | null
          structure_score: number | null
          technical_score: number | null
          time_management_score: number | null
          updated_at: string
        }
        Insert: {
          behavioral_score?: number | null
          communication_score?: number | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          improvement_areas?: Json | null
          overall_score?: number | null
          performance_data?: Json | null
          response_relevance_score?: number | null
          session_id: string
          strengths?: Json | null
          structure_score?: number | null
          technical_score?: number | null
          time_management_score?: number | null
          updated_at?: string
        }
        Update: {
          behavioral_score?: number | null
          communication_score?: number | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          improvement_areas?: Json | null
          overall_score?: number | null
          performance_data?: Json | null
          response_relevance_score?: number | null
          session_id?: string
          strengths?: Json | null
          structure_score?: number | null
          technical_score?: number | null
          time_management_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      interview_responses: {
        Row: {
          content: string
          id: string
          message_type: string | null
          metadata: Json | null
          session_id: string | null
          speaker: string
          timestamp: string | null
        }
        Insert: {
          content: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          session_id?: string | null
          speaker: string
          timestamp?: string | null
        }
        Update: {
          content?: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          session_id?: string | null
          speaker?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sentiment_analysis: {
        Row: {
          confidence_level: number | null
          created_at: string
          emotion_detected: string | null
          emotional_progression: Json | null
          id: string
          response_id: string | null
          sentiment_score: number
          session_id: string
          tone_analysis: Json | null
          updated_at: string
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string
          emotion_detected?: string | null
          emotional_progression?: Json | null
          id?: string
          response_id?: string | null
          sentiment_score: number
          session_id: string
          tone_analysis?: Json | null
          updated_at?: string
        }
        Update: {
          confidence_level?: number | null
          created_at?: string
          emotion_detected?: string | null
          emotional_progression?: Json | null
          id?: string
          response_id?: string | null
          sentiment_score?: number
          session_id?: string
          tone_analysis?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          conversation_log: Json | null
          created_at: string | null
          current_state: string | null
          evaluation_criteria: Json | null
          final_score: number | null
          id: string
          instance_id: string | null
          question_id: string | null
          updated_at: string | null
        }
        Insert: {
          conversation_log?: Json | null
          created_at?: string | null
          current_state?: string | null
          evaluation_criteria?: Json | null
          final_score?: number | null
          id?: string
          instance_id?: string | null
          question_id?: string | null
          updated_at?: string | null
        }
        Update: {
          conversation_log?: Json | null
          created_at?: string | null
          current_state?: string | null
          evaluation_criteria?: Json | null
          final_score?: number | null
          id?: string
          instance_id?: string | null
          question_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "assessment_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_voice_metrics: {
        Row: {
          clarity_score: number | null
          confidence_score: number | null
          created_at: string
          filler_word_count: number | null
          id: string
          metadata: Json | null
          pause_duration_avg: number | null
          pause_frequency: number | null
          response_id: string | null
          session_id: string
          speech_rate: number | null
          voice_quality_score: number | null
          volume_consistency: number | null
        }
        Insert: {
          clarity_score?: number | null
          confidence_score?: number | null
          created_at?: string
          filler_word_count?: number | null
          id?: string
          metadata?: Json | null
          pause_duration_avg?: number | null
          pause_frequency?: number | null
          response_id?: string | null
          session_id: string
          speech_rate?: number | null
          voice_quality_score?: number | null
          volume_consistency?: number | null
        }
        Update: {
          clarity_score?: number | null
          confidence_score?: number | null
          created_at?: string
          filler_word_count?: number | null
          id?: string
          metadata?: Json | null
          pause_duration_avg?: number | null
          pause_frequency?: number | null
          response_id?: string | null
          session_id?: string
          speech_rate?: number | null
          voice_quality_score?: number | null
          volume_consistency?: number | null
        }
        Relationships: []
      }
      proctoring_reports: {
        Row: {
          assessment_id: string
          assessment_instance_id: string
          created_at: string | null
          id: string
          integrity_score: number | null
          participant_id: string | null
          recommendations: string | null
          report_data: Json
          status: string | null
          updated_at: string | null
          violations_summary: Json | null
        }
        Insert: {
          assessment_id: string
          assessment_instance_id: string
          created_at?: string | null
          id?: string
          integrity_score?: number | null
          participant_id?: string | null
          recommendations?: string | null
          report_data?: Json
          status?: string | null
          updated_at?: string | null
          violations_summary?: Json | null
        }
        Update: {
          assessment_id?: string
          assessment_instance_id?: string
          created_at?: string | null
          id?: string
          integrity_score?: number | null
          participant_id?: string | null
          recommendations?: string | null
          report_data?: Json
          status?: string | null
          updated_at?: string | null
          violations_summary?: Json | null
        }
        Relationships: []
      }
      proctoring_sessions: {
        Row: {
          assessment_instance_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          monitoring_data: Json | null
          participant_id: string | null
          permissions: Json | null
          security_events: Json | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assessment_instance_id: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          monitoring_data?: Json | null
          participant_id?: string | null
          permissions?: Json | null
          security_events?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assessment_instance_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          monitoring_data?: Json | null
          participant_id?: string | null
          permissions?: Json | null
          security_events?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_proctoring_instance"
            columns: ["assessment_instance_id"]
            isOneToOne: false
            referencedRelation: "assessment_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_proctoring_participant"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_collections: {
        Row: {
          collection_type: string | null
          color: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_favorite: boolean | null
          name: string
          parent_collection_id: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          collection_type?: string | null
          color?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          parent_collection_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          collection_type?: string | null
          color?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          parent_collection_id?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_collections_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "question_collections_parent_collection_id_fkey"
            columns: ["parent_collection_id"]
            isOneToOne: false
            referencedRelation: "question_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      question_skills: {
        Row: {
          question_id: string
          skill_id: string
        }
        Insert: {
          question_id: string
          skill_id: string
        }
        Update: {
          question_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_question_skills_question"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_question_skills_skill"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_skills_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      question_templates: {
        Row: {
          category: string
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          question_type: Database["public"]["Enums"]["question_type"]
          template_config: Json
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          question_type: Database["public"]["Enums"]["question_type"]
          template_config?: Json
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          template_config?: Json
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_templates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      question_versions: {
        Row: {
          change_summary: string | null
          config: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          id: string
          points: number | null
          question_id: string
          tags: string[] | null
          title: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          id?: string
          points?: number | null
          question_id: string
          tags?: string[] | null
          title: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          id?: string
          points?: number | null
          question_id?: string
          tags?: string[] | null
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "question_versions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          archived_at: string | null
          assessment_id: string | null
          change_summary: string | null
          config: Json | null
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          difficulty_score: number | null
          id: string
          is_active: boolean | null
          is_template: boolean | null
          last_used_at: string | null
          order_index: number
          parent_question_id: string | null
          points: number
          quality_rating: number | null
          question_text: string | null
          question_type: Database["public"]["Enums"]["question_type"]
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number | null
          version: number | null
        }
        Insert: {
          archived_at?: string | null
          assessment_id?: string | null
          change_summary?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          difficulty_score?: number | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          last_used_at?: string | null
          order_index: number
          parent_question_id?: string | null
          points?: number
          quality_rating?: number | null
          question_text?: string | null
          question_type: Database["public"]["Enums"]["question_type"]
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number | null
          version?: number | null
        }
        Update: {
          archived_at?: string | null
          assessment_id?: string | null
          change_summary?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          difficulty_score?: number | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          last_used_at?: string | null
          order_index?: number
          parent_question_id?: string | null
          points?: number
          quality_rating?: number | null
          question_text?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_questions_assessment"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "questions_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrics: {
        Row: {
          created_at: string
          criteria: string
          description: string | null
          id: string
          question_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          criteria: string
          description?: string | null
          id?: string
          question_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          criteria?: string
          description?: string | null
          id?: string
          question_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_rubrics_question"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubrics_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_activity: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string
          id: string
          session_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string
          id?: string
          session_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_activity_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_analytics: {
        Row: {
          analytics_data: Json | null
          avg_difficulty_score: number | null
          created_at: string
          id: string
          last_analyzed_at: string | null
          performance_score: number | null
          skill_name: string
          total_questions: number | null
          updated_at: string
          usage_frequency: number | null
        }
        Insert: {
          analytics_data?: Json | null
          avg_difficulty_score?: number | null
          created_at?: string
          id?: string
          last_analyzed_at?: string | null
          performance_score?: number | null
          skill_name: string
          total_questions?: number | null
          updated_at?: string
          usage_frequency?: number | null
        }
        Update: {
          analytics_data?: Json | null
          avg_difficulty_score?: number | null
          created_at?: string
          id?: string
          last_analyzed_at?: string | null
          performance_score?: number | null
          skill_name?: string
          total_questions?: number | null
          updated_at?: string
          usage_frequency?: number | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          answer: Json | null
          id: string
          instance_id: string
          question_id: string
          submitted_at: string
        }
        Insert: {
          answer?: Json | null
          id?: string
          instance_id: string
          question_id: string
          submitted_at?: string
        }
        Update: {
          answer?: Json | null
          id?: string
          instance_id?: string
          question_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_submissions_instance"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "assessment_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_submissions_question"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "assessment_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configurations: {
        Row: {
          created_at: string
          created_by: string | null
          events: string[]
          id: string
          is_active: boolean
          name: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          name: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_stuck_assessment_instances: {
        Args: { p_share_token: string }
        Returns: {
          cleaned_count: number
          message: string
        }[]
      }
      find_or_create_anonymous_instance: {
        Args: {
          p_assessment_id: string
          p_duration_minutes?: number
          p_participant_email?: string
          p_participant_name?: string
          p_share_token: string
        }
        Returns: {
          attempts_remaining: number
          instance_data: Json
          message: string
          should_redirect_to_results: boolean
        }[]
      }
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_session_collaborator: {
        Args: { session_id_param: string }
        Returns: boolean
      }
      update_proctoring_session_events: {
        Args: { new_event: Json; session_id: string }
        Returns: undefined
      }
    }
    Enums: {
      assessment_status: "draft" | "published" | "archived"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      question_type:
        | "coding"
        | "mcq"
        | "subjective"
        | "file_upload"
        | "audio"
        | "interview"
      submission_status: "in_progress" | "submitted" | "evaluated"
      user_role: "admin" | "instructor" | "student" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      assessment_status: ["draft", "published", "archived"],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      question_type: [
        "coding",
        "mcq",
        "subjective",
        "file_upload",
        "audio",
        "interview",
      ],
      submission_status: ["in_progress", "submitted", "evaluated"],
      user_role: ["admin", "instructor", "student", "user"],
    },
  },
} as const
