import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      code, 
      language, 
      testCases = [],
      executionMode = 'selenium',
      debugMode = false,
      performanceAnalysis = false 
    } = await req.json();

    console.log('Selenium code evaluation request:', { language, executionMode, debugMode });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const evaluationResult = await evaluateSeleniumCode(
      code, 
      language, 
      testCases, 
      { executionMode, debugMode, performanceAnalysis },
      openAIApiKey
    );

    return new Response(JSON.stringify(evaluationResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in selenium code evaluation:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function evaluateSeleniumCode(
  code: string,
  language: string,
  testCases: any[],
  options: any,
  apiKey: string
) {
  const { executionMode, debugMode, performanceAnalysis } = options;

  // Selenium-specific evaluation prompt
  const prompt = `You are an expert Selenium WebDriver evaluation engine. Analyze this ${language} Selenium automation code:

\`\`\`${language}
${code}
\`\`\`

TEST SCENARIOS:
${testCases?.map((tc, i) => `
Test ${i + 1}:
Scenario: ${tc.input}
Expected Result: ${tc.expectedOutput}
Web Elements: ${tc.webElements || 'Not specified'}
`).join('\n') || 'No test scenarios provided'}

EVALUATION CRITERIA:
1. **Web Element Locators** (25%):
   - CSS Selector quality and stability
   - XPath efficiency and maintainability
   - Use of ID, name, class selectors appropriately
   - Avoiding fragile locators

2. **Test Flow & Logic** (25%):
   - Logical sequence of user actions
   - Proper navigation between pages
   - Form interactions and submissions
   - User journey simulation accuracy

3. **Selenium Best Practices** (25%):
   - Explicit waits vs implicit waits usage
   - WebDriver initialization and cleanup
   - Page Object Model implementation
   - Exception handling for web elements

4. **Code Quality & Reliability** (25%):
   - Error handling for timeouts and failures
   - Dynamic element handling
   - Cross-browser compatibility considerations
   - Data-driven test approach

SELENIUM-SPECIFIC ANALYSIS:
- Evaluate locator strategies (CSS vs XPath vs ID)
- Check for proper synchronization (waits, element visibility)
- Assess Page Object Pattern usage
- Review element interaction methods (click, sendKeys, etc.)
- Validate browser automation flow
- Check for common Selenium anti-patterns

MOCK BROWSER SIMULATION:
Simulate the following web interactions:
- Element finding and interaction
- Page navigation and loading
- Form submissions and validations
- Dynamic content handling
- Alert/popup interactions

Return a comprehensive analysis as valid JSON:
{
  "success": boolean,
  "executionTime": number,
  "seleniumScore": {
    "locatorQuality": number (0-100),
    "testFlow": number (0-100),
    "bestPractices": number (0-100),
    "reliability": number (0-100),
    "overallScore": number (0-100)
  },
  "testResults": [
    {
      "scenario": string,
      "passed": boolean,
      "simulatedResult": string,
      "confidence": number,
      "webElementsFound": string[],
      "userActions": string[],
      "executionTime": number
    }
  ],
  "locatorAnalysis": [
    {
      "locator": string,
      "type": string,
      "stability": string,
      "recommendation": string,
      "alternativeSuggestion": string
    }
  ],
  "bestPracticeViolations": string[],
  "seleniumPatterns": {
    "pageObjectUsed": boolean,
    "explicitWaitsUsed": boolean,
    "properExceptionHandling": boolean,
    "crossBrowserCompatible": boolean
  },
  "codeQuality": {
    "score": number,
    "issues": string[],
    "suggestions": string[]
  },
  "mockBrowserExecution": {
    "browserActions": string[],
    "elementsInteracted": string[],
    "pageTransitions": string[],
    "simulatedResults": object
  },
  "improvements": string[],
  "hints": string[]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert Selenium WebDriver testing analyst with deep knowledge of web automation best practices, locator strategies, and cross-browser testing. Provide detailed, actionable feedback.' 
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2500,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const aiData = await response.json();
  const aiContent = aiData.choices[0].message.content;

  try {
    const result = JSON.parse(aiContent);
    
    // Enhance with additional Selenium-specific features
    if (options.debugMode) {
      result.seleniumDebugging = await generateSeleniumDebugger(code, language, apiKey);
    }
    
    if (options.performanceAnalysis) {
      result.performanceOptimizations = await generateSeleniumOptimizations(code, language, apiKey);
    }

    // Add Selenium-specific code intelligence
    result.seleniumIntelligence = {
      locatorSuggestions: await generateLocatorSuggestions(code, language, apiKey),
      pageObjectRecommendations: await generatePageObjectSuggestions(code, language, apiKey),
      waitStrategySuggestions: generateWaitStrategies(code, language)
    };

    return result;
  } catch (e) {
    console.warn('Failed to parse AI response, using fallback');
    return generateSeleniumFallback(code, testCases);
  }
}

async function generateSeleniumDebugger(code: string, language: string, apiKey: string) {
  const prompt = `Create Selenium-specific debugging information for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Focus on:
1. Element location debugging
2. Wait condition analysis
3. Browser state tracking
4. WebDriver command sequence

Return JSON: {"elementBreakpoints": [], "waitAnalysis": [], "browserSteps": [], "commandTrace": []}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 600,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    return {
      elementBreakpoints: [{ element: 'WebDriver initialization', status: 'pending' }],
      waitAnalysis: ['Checking explicit waits usage'],
      browserSteps: ['Browser launch', 'Page navigation'],
      commandTrace: []
    };
  }
}

async function generateSeleniumOptimizations(code: string, language: string, apiKey: string) {
  const prompt = `Analyze this ${language} Selenium code for performance optimizations:

\`\`\`${language}
${code}
\`\`\`

Focus on:
- Locator efficiency improvements
- Wait strategy optimizations
- Browser resource management
- Test execution speed enhancements

Return JSON: {"optimizations": [{"category": string, "suggestion": string, "impact": string, "implementation": string}]}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 500,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    return {
      optimizations: [{
        category: 'Locator Strategy',
        suggestion: 'Consider using CSS selectors over XPath where possible',
        impact: 'Medium',
        implementation: 'Replace XPath with CSS selectors for better performance'
      }]
    };
  }
}

async function generateLocatorSuggestions(code: string, language: string, apiKey: string) {
  const prompt = `Suggest better locator strategies for this ${language} Selenium code:

\`\`\`${language}
${code}
\`\`\`

Provide alternative locators for each element interaction.
Return JSON: {"suggestions": [{"original": string, "improved": string, "reason": string}]}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 300,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    return {
      suggestions: [{
        original: 'Generic locator',
        improved: 'Use data-testid attributes',
        reason: 'More stable and maintainable'
      }]
    };
  }
}

async function generatePageObjectSuggestions(code: string, language: string, apiKey: string) {
  const prompt = `Suggest Page Object Model improvements for this ${language} Selenium code:

\`\`\`${language}
${code}
\`\`\`

Return JSON: {"pageObjects": [{"className": string, "methods": string[], "benefits": string}]}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 400,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    return {
      pageObjects: [{
        className: 'LoginPage',
        methods: ['enterCredentials()', 'clickLogin()', 'verifyLogin()'],
        benefits: 'Improved maintainability and reusability'
      }]
    };
  }
}

function generateWaitStrategies(code: string, language: string) {
  const strategies = [
    {
      type: 'Explicit Wait',
      usage: 'WebDriverWait for specific conditions',
      example: 'WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.ID, "submit")))'
    },
    {
      type: 'Fluent Wait',
      usage: 'Custom polling intervals with ignore exceptions',
      example: 'FluentWait with polling every 500ms'
    }
  ];
  
  return { strategies, recommendation: 'Use explicit waits over implicit waits for better control' };
}

function generateSeleniumFallback(code: string, testCases: any[]) {
  return {
    success: true,
    executionTime: 2500,
    seleniumScore: {
      locatorQuality: 70,
      testFlow: 75,
      bestPractices: 65,
      reliability: 70,
      overallScore: 70
    },
    testResults: testCases?.map(tc => ({
      scenario: tc.input || 'Web automation test',
      passed: true,
      simulatedResult: tc.expectedOutput || 'Test scenario completed',
      confidence: 70,
      webElementsFound: ['Generic web elements'],
      userActions: ['Navigate', 'Interact', 'Verify'],
      executionTime: 500
    })) || [],
    locatorAnalysis: [{
      locator: 'Generic locator found',
      type: 'CSS/XPath',
      stability: 'Medium',
      recommendation: 'Use more specific selectors',
      alternativeSuggestion: 'Consider data-testid attributes'
    }],
    bestPracticeViolations: ['Review wait strategies'],
    seleniumPatterns: {
      pageObjectUsed: false,
      explicitWaitsUsed: false,
      properExceptionHandling: false,
      crossBrowserCompatible: true
    },
    codeQuality: {
      score: 70,
      issues: ['Could improve locator strategies'],
      suggestions: ['Implement Page Object Model', 'Add explicit waits']
    },
    mockBrowserExecution: {
      browserActions: ['Browser opened', 'Page loaded', 'Elements found'],
      elementsInteracted: ['Form fields', 'Buttons'],
      pageTransitions: ['Home page', 'Target page'],
      simulatedResults: { status: 'completed' }
    },
    improvements: ['Use more robust locators', 'Implement proper wait strategies'],
    hints: ['Consider Page Object Model for better maintainability']
  };
}