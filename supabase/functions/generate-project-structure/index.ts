import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate and normalize the AI-generated structure
function validateAndNormalizeStructure(structure: any, technology: string): any {
  if (!structure || typeof structure !== 'object') {
    throw new Error('Invalid structure format');
  }
  
  // Ensure required arrays exist
  structure.projectFiles = Array.isArray(structure.projectFiles) ? structure.projectFiles : [];
  structure.projectFolders = Array.isArray(structure.projectFolders) ? structure.projectFolders : [];
  
  // Normalize and validate files
  structure.projectFiles = structure.projectFiles.map((file: any, index: number) => ({
    fileName: String(file.fileName || `file${index}`),
    filePath: String(file.filePath || file.fileName || `file${index}`),
    fileContent: String(file.fileContent || ''),
    fileLanguage: String(file.fileLanguage || detectLanguageFromTechnology(technology)),
    isFolder: Boolean(file.isFolder),
    isMainFile: Boolean(file.isMainFile),
    orderIndex: typeof file.orderIndex === 'number' ? file.orderIndex : index
  }));
  
  // Normalize and validate folders
  structure.projectFolders = structure.projectFolders.map((folder: any, index: number) => ({
    folderName: String(folder.folderName || `folder${index}`),
    folderPath: String(folder.folderPath || folder.folderName || `folder${index}`),
    isFolder: true,
    orderIndex: typeof folder.orderIndex === 'number' ? folder.orderIndex : index
  }));
  
  return structure;
}

// Create technology-aware fallback structure
function createTechnologyAwareFallback(technology: string, problemDescription?: string): any {
  const tech = technology.toLowerCase();
  const description = problemDescription || 'Project description';
  
  if (tech.includes('javascript') || tech.includes('node')) {
    return {
      projectFiles: [
        {
          fileName: 'package.json',
          filePath: 'package.json',
          fileContent: `{
  "name": "project",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  }
}`,
          fileLanguage: 'json',
          isFolder: false,
          isMainFile: false,
          orderIndex: 0
        },
        {
          fileName: 'index.js',
          filePath: 'src/index.js',
          fileContent: `// ${description}\nconsole.log('Hello World!');\n\n// TODO: Implement your solution here`,
          fileLanguage: 'js',
          isFolder: false,
          isMainFile: true,
          orderIndex: 2
        },
        {
          fileName: 'README.md',
          filePath: 'README.md',
          fileContent: `# ${technology} Project\n\n## Description\n${description}\n\n## Getting Started\n\`\`\`bash\nnpm install\nnpm start\n\`\`\``,
          fileLanguage: 'md',
          isFolder: false,
          isMainFile: false,
          orderIndex: 1
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
  
  if (tech.includes('python')) {
    return {
      projectFiles: [
        {
          fileName: 'requirements.txt',
          filePath: 'requirements.txt',
          fileContent: '# Add your dependencies here\n',
          fileLanguage: 'txt',
          isFolder: false,
          isMainFile: false,
          orderIndex: 0
        },
        {
          fileName: 'main.py',
          filePath: 'src/main.py',
          fileContent: `"""${description}"""\n\ndef main():\n    print("Hello World!")\n    # TODO: Implement your solution here\n\nif __name__ == "__main__":\n    main()`,
          fileLanguage: 'py',
          isFolder: false,
          isMainFile: true,
          orderIndex: 2
        },
        {
          fileName: 'README.md',
          filePath: 'README.md',
          fileContent: `# ${technology} Project\n\n## Description\n${description}\n\n## Getting Started\n\`\`\`bash\npip install -r requirements.txt\npython src/main.py\n\`\`\``,
          fileLanguage: 'md',
          isFolder: false,
          isMainFile: false,
          orderIndex: 1
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
  
  if (tech.includes('java') || tech.includes('spring')) {
    return {
      projectFiles: [
        {
          fileName: 'pom.xml',
          filePath: 'pom.xml',
          fileContent: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>project</artifactId>
    <version>1.0.0</version>
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
    </properties>
</project>`,
          fileLanguage: 'xml',
          isFolder: false,
          isMainFile: false,
          orderIndex: 0
        },
        {
          fileName: 'Main.java',
          filePath: 'src/main/java/Main.java',
          fileContent: `/**\n * ${description}\n */\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n        // TODO: Implement your solution here\n    }\n}`,
          fileLanguage: 'java',
          isFolder: false,
          isMainFile: true,
          orderIndex: 3
        },
        {
          fileName: 'README.md',
          filePath: 'README.md',
          fileContent: `# ${technology} Project\n\n## Description\n${description}\n\n## Getting Started\n\`\`\`bash\nmvn compile\nmvn exec:java -Dexec.mainClass="Main"\n\`\`\``,
          fileLanguage: 'md',
          isFolder: false,
          isMainFile: false,
          orderIndex: 1
        }
      ],
      projectFolders: [
        {
          folderName: 'src',
          folderPath: 'src',
          isFolder: true,
          orderIndex: 0
        },
        {
          folderName: 'main',
          folderPath: 'src/main',
          isFolder: true,
          orderIndex: 1
        },
        {
          folderName: 'java',
          folderPath: 'src/main/java',
          isFolder: true,
          orderIndex: 2
        }
      ]
    };
  }
  
  // Default fallback
  const lang = tech.includes('python') ? 'py' : tech.includes('java') ? 'java' : 'js';
  return {
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
        fileContent: `# ${technology} Project\n\n## Description\n${description}\n`,
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

// Detect language from technology
function detectLanguageFromTechnology(technology: string): string {
  const tech = technology.toLowerCase();
  if (tech.includes('python')) return 'py';
  if (tech.includes('java')) return 'java';
  if (tech.includes('javascript') || tech.includes('node')) return 'js';
  if (tech.includes('typescript')) return 'ts';
  if (tech.includes('react')) return 'jsx';
  if (tech.includes('html')) return 'html';
  if (tech.includes('css')) return 'css';
  if (tech.includes('c++')) return 'cpp';
  if (tech.includes('go')) return 'go';
  return 'js';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { technology, problemDescription, questionId, retryCount = 0 } = await req.json();
    
    if (!technology || !questionId) {
      return new Response(
        JSON.stringify({ error: 'Technology and questionId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating project structure for: ${technology} (retry: ${retryCount})`);
    
    // Initialize environment variables and Supabase client FIRST
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Required environment variables not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Clear existing files for this question before generating new ones
    const { error: deleteError } = await supabase
      .from('project_files')
      .delete()
      .eq('question_id', questionId);
    
    if (deleteError) {
      console.warn('Warning: Could not clear existing files:', deleteError);
    }

    console.log('Generating project structure for:', technology);

    // Strengthen AI prompt for better JSON compliance
    const systemPrompt = `You are a project structure expert. Generate a realistic project structure for the given technology and problem.

CRITICAL INSTRUCTIONS:
1. Respond ONLY with valid JSON - no markdown, no backticks, no explanations, no comments
2. The JSON must be parseable by JSON.parse() without any preprocessing
3. Start your response directly with { and end with }
4. All string values must be properly escaped
5. Do not include any text before or after the JSON object

REQUIRED JSON FORMAT (copy this structure exactly):
{
  "projectFiles": [
    {
      "fileName": "exact filename with extension",
      "filePath": "relative/path/from/root",
      "fileContent": "starter code content for this file",
      "fileLanguage": "language identifier (js, py, java, html, css, json, etc.)",
      "isFolder": false,
      "isMainFile": true,
      "orderIndex": 0
    }
  ],
  "projectFolders": [
    {
      "folderName": "folder name",
      "folderPath": "relative/path/from/root",
      "isFolder": true,
      "orderIndex": 0
    }
  ]
}

TECHNOLOGY-SPECIFIC GUIDELINES:
- JavaScript/Node.js: Include package.json, src/index.js, README.md
- Python: Include requirements.txt, main.py, README.md, src/ folder
- Java: Include pom.xml or build.gradle, src/main/java/, Main.java
- React: Include package.json, src/App.js, src/index.js, public/index.html
- Spring Boot: Include pom.xml, src/main/java/, Application.java, application.properties
- HTML/CSS: Include index.html, style.css, script.js
- C++: Include main.cpp, Makefile or CMakeLists.txt
- Go: Include go.mod, main.go

CONTENT REQUIREMENTS:
- Add realistic starter code that matches the problem description
- Include proper configuration files for the technology
- Use correct file extensions and language identifiers
- Order files logically (config files first, then source files)
- Keep content concise but functional`;

    // Use more reliable model and settings for JSON generation
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
            content: `Technology: "${technology}"\nProblem: "${problemDescription || 'Create a basic project structure'}"\n\nGenerate the JSON structure now:`
          }
        ],
        temperature: 0.1, // Lower temperature for more consistent output
        max_tokens: 3000,
        response_format: { type: "json_object" } // Enforce JSON format
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const structureText = data.choices[0].message.content;
    
    console.log('Raw AI response:', structureText.substring(0, 200) + '...');

    let structure;
    try {
      // Clean and normalize the response
      let cleanedText = structureText.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json') || cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
      }
      
      // Parse JSON
      structure = JSON.parse(cleanedText);
      
      // Validate and normalize structure
      structure = validateAndNormalizeStructure(structure, technology);
      
      console.log(`AI generated structure: ${structure.projectFiles?.length || 0} files, ${structure.projectFolders?.length || 0} folders`);
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', structureText);
      
      // Use technology-aware fallback
      structure = createTechnologyAwareFallback(technology, problemDescription);
      console.log('Using technology-aware fallback structure');
    }

    // Helper function to find parent folder ID based on file path
    function findParentFolderId(filePath: string, pathToIdMap: Map<string, string>): string | null {
      const pathParts = filePath.split('/');
      
      // Try increasingly shorter paths to find deepest matching folder
      for (let i = pathParts.length - 1; i >= 1; i--) {
        const potentialFolderPath = pathParts.slice(0, i).join('/');
        if (pathToIdMap.has(potentialFolderPath)) {
          return pathToIdMap.get(potentialFolderPath)!;
        }
      }
      return null;
    }

    // Three-phase write process: Insert folders with hierarchy, then files
    let totalInserted = 0;
    const pathToIdMap = new Map<string, string>();
    
    // Phase 1: Insert folders in dependency order (parents before children)
    if (structure.projectFolders && structure.projectFolders.length > 0) {
      // Sort folders by path depth to ensure parents are inserted before children
      const sortedFolders = structure.projectFolders.sort((a: any, b: any) => {
        const aDepth = a.folderPath.split('/').length;
        const bDepth = b.folderPath.split('/').length;
        return aDepth - bDepth;
      });

      console.log(`Inserting ${sortedFolders.length} folders with hierarchy`);
      
      // Insert folders one by one to build hierarchy
      for (const folder of sortedFolders) {
        const parentFolderId = findParentFolderId(folder.folderPath, pathToIdMap);
        
        const folderInsert = {
          question_id: questionId,
          file_name: folder.folderName,
          file_path: folder.folderPath,
          file_content: '',
          file_language: '',
          is_folder: true,
          is_main_file: false,
          order_index: folder.orderIndex || 0,
          parent_folder_id: parentFolderId
        };

        const { data: insertedFolder, error: folderError } = await supabase
          .from('project_files')
          .insert([folderInsert])
          .select('id, file_path')
          .single();

        if (folderError) {
          console.error('Error inserting folder:', folderError);
          throw new Error(`Failed to insert folder ${folder.folderName}: ${folderError.message}`);
        }
        
        // Map the folder path to its ID for parent resolution
        pathToIdMap.set(folder.folderPath, insertedFolder.id);
        totalInserted += 1;
        
        console.log(`Inserted folder: ${folder.folderPath} -> ID: ${insertedFolder.id}, Parent: ${parentFolderId || 'root'}`);
      }
      
      console.log(`Successfully inserted ${sortedFolders.length} folders with hierarchy`);
    }

    // Phase 2: Insert files with proper parent folder references
    if (structure.projectFiles && structure.projectFiles.length > 0) {
      const fileInserts = structure.projectFiles.map((file: any) => {
        const parentFolderId = findParentFolderId(file.filePath, pathToIdMap);
        
        return {
          question_id: questionId,
          file_name: file.fileName,
          file_path: file.filePath,
          file_content: file.fileContent || '',
          file_language: file.fileLanguage || 'javascript',
          is_folder: false,
          is_main_file: file.isMainFile || false,
          order_index: file.orderIndex || 0,
          parent_folder_id: parentFolderId
        };
      });

      console.log(`Inserting ${fileInserts.length} files with parent references`);
      const { data: insertedFiles, error: fileError } = await supabase
        .from('project_files')
        .insert(fileInserts)
        .select('id, file_name, parent_folder_id');

      if (fileError) {
        console.error('Error inserting files:', fileError);
        throw new Error(`Failed to insert files: ${fileError.message}`);
      }
      
      totalInserted += insertedFiles?.length || 0;
      console.log(`Successfully inserted ${insertedFiles?.length || 0} files`);
      
      // Log parent relationships for debugging
      insertedFiles?.forEach(file => {
        console.log(`File: ${file.file_name}, Parent ID: ${file.parent_folder_id || 'root'}`);
      });
    }

    // Phase 3: Comprehensive verification
    const { data: verifyFiles, error: verifyError } = await supabase
      .from('project_files')
      .select('id, file_name, is_folder')
      .eq('question_id', questionId)
      .order('order_index');

    if (verifyError) {
      console.error('Verification query failed:', verifyError);
      throw new Error(`Verification failed: ${verifyError.message}`);
    }

    if (!verifyFiles || verifyFiles.length === 0) {
      console.error('CRITICAL: No files found after insertion');
      throw new Error('Files were not properly saved to database - verification failed');
    }

    const fileCount = verifyFiles.filter(f => !f.is_folder).length;
    const folderCount = verifyFiles.filter(f => f.is_folder).length;
    
    console.log(`Verification successful: ${fileCount} files, ${folderCount} folders inserted`);
    console.log('File names:', verifyFiles.map(f => f.file_name).join(', '));

    return new Response(JSON.stringify({ 
      success: true,
      filesCreated: fileCount,
      foldersCreated: folderCount,
      totalItems: verifyFiles.length,
      structure,
      message: `Successfully generated project structure with ${fileCount} files and ${folderCount} folders`
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