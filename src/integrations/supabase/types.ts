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
      assessment_instances: {
        Row: {
          assessment_id: string
          current_question_index: number | null
          id: string
          max_possible_score: number | null
          participant_id: string
          started_at: string
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string | null
          time_remaining_seconds: number | null
          total_score: number | null
        }
        Insert: {
          assessment_id: string
          current_question_index?: number | null
          id?: string
          max_possible_score?: number | null
          participant_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          time_remaining_seconds?: number | null
          total_score?: number | null
        }
        Update: {
          assessment_id?: string
          current_question_index?: number | null
          id?: string
          max_possible_score?: number | null
          participant_id?: string
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
        ]
      }
      assessments: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          duration_minutes: number
          id: string
          instructions: string | null
          max_attempts: number | null
          status: Database["public"]["Enums"]["assessment_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string | null
          max_attempts?: number | null
          status?: Database["public"]["Enums"]["assessment_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string | null
          max_attempts?: number | null
          status?: Database["public"]["Enums"]["assessment_status"]
          title?: string
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
          max_score: number
          score: number
          submission_id: string
        }
        Insert: {
          ai_feedback?: Json | null
          evaluated_at?: string
          evaluator_type?: string | null
          feedback?: string | null
          id?: string
          max_score: number
          score: number
          submission_id: string
        }
        Update: {
          ai_feedback?: Json | null
          evaluated_at?: string
          evaluator_type?: string | null
          feedback?: string | null
          id?: string
          max_score?: number
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
      questions: {
        Row: {
          assessment_id: string
          config: Json | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          id: string
          order_index: number
          points: number
          question_type: Database["public"]["Enums"]["question_type"]
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          config?: Json | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          id?: string
          order_index: number
          points?: number
          question_type: Database["public"]["Enums"]["question_type"]
          title: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          id?: string
          order_index?: number
          points?: number
          question_type?: Database["public"]["Enums"]["question_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
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
            foreignKeyName: "rubrics_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      assessment_status: "draft" | "published" | "archived"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      question_type: "coding" | "mcq" | "subjective" | "file_upload" | "audio"
      submission_status: "in_progress" | "submitted" | "evaluated"
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
      question_type: ["coding", "mcq", "subjective", "file_upload", "audio"],
      submission_status: ["in_progress", "submitted", "evaluated"],
    },
  },
} as const
