import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { technology, problemDescription, questionId } = await req.json();
    
    if (!technology || !questionId) {
      return new Response(
        JSON.stringify({ error: 'Technology and questionId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Generating project structure for:', technology);

    const systemPrompt = `You are a project structure expert. Generate a realistic project structure for the given technology and problem.

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanations, just the JSON object.

Required format:
{
  "projectFiles": [
    {
      "fileName": "exact filename with extension",
      "filePath": "relative/path/from/root",
      "fileContent": "starter code content for this file",
      "fileLanguage": "language identifier (js, py, java, html, css, json, etc.)",
      "isFolder": false,
      "isMainFile": true/false,
      "orderIndex": number
    }
  ],
  "projectFolders": [
    {
      "folderName": "folder name",
      "folderPath": "relative/path/from/root",
      "isFolder": true,
      "orderIndex": number
    }
  ]
}

Guidelines:
- Create a realistic project structure for the technology
- Include configuration files (package.json, requirements.txt, etc.)
- Add starter code that matches the problem description
- Use proper file extensions and language identifiers
- Order files logically (config files first, then source files)
- Keep content concise but functional`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Technology: "${technology}"\nProblem: "${problemDescription || 'Create a basic project structure'}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const structureText = data.choices[0].message.content;

    let structure;
    try {
      structure = JSON.parse(structureText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', structureText);
      
      // Fallback structure
      const lang = technology.toLowerCase().includes('python') ? 'py' : 
                   technology.toLowerCase().includes('java') ? 'java' : 'js';
      
      structure = {
        projectFiles: [
          {
            fileName: `main.${lang}`,
            filePath: `src/main.${lang}`,
            fileContent: '// TODO: Implement your solution here\n',
            fileLanguage: lang,
            isFolder: false,
            isMainFile: true,
            orderIndex: 1
          },
          {
            fileName: 'README.md',
            filePath: 'README.md',
            fileContent: `# ${technology} Project\n\n## Description\n${problemDescription || 'Project description'}\n`,
            fileLanguage: 'md',
            isFolder: false,
            isMainFile: false,
            orderIndex: 0
          }
        ],
        projectFolders: [
          {
            folderName: 'src',
            folderPath: 'src',
            isFolder: true,
            orderIndex: 0
          }
        ]
      };
    }

    // Insert folders first
    const folderInserts = [];
    for (const folder of structure.projectFolders || []) {
      folderInserts.push({
        question_id: questionId,
        file_name: folder.folderName,
        file_path: folder.folderPath,
        file_content: '',
        file_language: '',
        is_folder: true,
        is_main_file: false,
        order_index: folder.orderIndex || 0
      });
    }

    if (folderInserts.length > 0) {
      const { error: folderError } = await supabase
        .from('project_files')
        .insert(folderInserts);

      if (folderError) {
        console.error('Error inserting folders:', folderError);
      }
    }

    // Insert files
    const fileInserts = [];
    for (const file of structure.projectFiles || []) {
      fileInserts.push({
        question_id: questionId,
        file_name: file.fileName,
        file_path: file.filePath,
        file_content: file.fileContent || '',
        file_language: file.fileLanguage || 'javascript',
        is_folder: false,
        is_main_file: file.isMainFile || false,
        order_index: file.orderIndex || 0
      });
    }

    if (fileInserts.length > 0) {
      const { error: fileError } = await supabase
        .from('project_files')
        .insert(fileInserts);

      if (fileError) {
        console.error('Error inserting files:', fileError);
        throw fileError;
      }
    }

    console.log('Project structure generated successfully');

    return new Response(JSON.stringify({ 
      success: true,
      filesCreated: fileInserts.length,
      foldersCreated: folderInserts.length,
      structure 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-project-structure function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});