import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Play, 
  Eye, 
  Brain, 
  Code, 
  CheckCircle, 
  AlertTriangle, 
  Lightbulb, 
  Terminal,
  FileCode,
  Monitor
} from "lucide-react";

const CodeAssessment = () => {
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const languages = [
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "react", label: "React JSX" }
  ];

  const codeFiles = [
    { name: "main.js", active: true },
    { name: "utils.js", active: false },
    { name: "styles.css", active: false }
  ];

  const sampleCode = `// TODO: Implement a function that finds the longest palindromic substring
function longestPalindrome(s) {
    if (!s || s.length < 2) return s;
    
    let start = 0;
    let maxLength = 1;
    
    // Helper function to expand around center
    function expandAroundCenter(left, right) {
        while (left >= 0 && right < s.length && s[left] === s[right]) {
            const currentLength = right - left + 1;
            if (currentLength > maxLength) {
                start = left;
                maxLength = currentLength;
            }
            left--;
            right++;
        }
    }
    
    for (let i = 0; i < s.length; i++) {
        // Check for odd length palindromes
        expandAroundCenter(i, i);
        // Check for even length palindromes
        expandAroundCenter(i, i + 1);
    }
    
    return s.substring(start, start + maxLength);
}

// Test cases
console.log(longestPalindrome("babad")); // Expected: "bab" or "aba"
console.log(longestPalindrome("cbbd"));  // Expected: "bb"`;

  const handleRun = async () => {
    setIsRunning(true);
    // Simulate AI evaluation
    setTimeout(() => {
      setIsRunning(false);
      setShowResults(true);
    }, 2000);
  };

  const handlePreview = () => {
    // Simulate browser preview for web-based code
    console.log("Opening browser preview...");
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">AI-Powered Coding Assessment</h2>
          <p className="text-muted-foreground">
            Write, test, and get instant AI feedback on your code without any containers or runtimes.
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          <Card className="shadow-strong">
            <CardHeader className="bg-background-secondary/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary" />
                  Longest Palindromic Substring
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="secondary">
                    <Brain className="w-3 h-3 mr-1" />
                    AI Evaluation
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-[600px]">
                {/* Code Editor */}
                <div className="lg:col-span-2 border-r border-border">
                  {/* File Tabs */}
                  <div className="border-b border-border bg-background-secondary/30">
                    <div className="flex items-center px-4 py-2">
                      {codeFiles.map((file, index) => (
                        <div
                          key={index}
                          className={`px-3 py-1 text-sm rounded-t-md border-b-2 cursor-pointer transition-colors ${
                            file.active
                              ? 'bg-background border-primary text-foreground'
                              : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <FileCode className="w-3 h-3 inline mr-1" />
                          {file.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Code Editor Area */}
                  <div className="relative">
                    <div className="bg-code-bg text-code-text p-4 h-[500px] overflow-auto font-mono text-sm leading-relaxed">
                      <pre className="whitespace-pre-wrap">{sampleCode}</pre>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button
                        onClick={handleRun}
                        disabled={isRunning}
                        size="sm"
                        className="bg-primary hover:bg-primary-dark"
                      >
                        {isRunning ? (
                          <>
                            <Brain className="w-4 h-4 mr-2 animate-pulse" />
                            AI Evaluating...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Run Code
                          </>
                        )}
                      </Button>
                      
                      {selectedLanguage === 'react' && (
                        <Button onClick={handlePreview} variant="outline" size="sm">
                          <Monitor className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Results Panel */}
                <div className="bg-background-secondary/30">
                  <Tabs defaultValue="output" className="h-full">
                    <TabsList className="w-full rounded-none border-b border-border bg-transparent">
                      <TabsTrigger value="output" className="flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        Output
                      </TabsTrigger>
                      <TabsTrigger value="feedback" className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        AI Feedback
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="output" className="p-4 space-y-4">
                      {showResults ? (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-success">
                              <CheckCircle className="w-4 h-4" />
                              <span className="font-medium">Syntax Check: Passed</span>
                            </div>
                            <div className="flex items-center gap-2 text-success">
                              <CheckCircle className="w-4 h-4" />
                              <span className="font-medium">Logic Check: Passed</span>
                            </div>
                          </div>
                          
                          <div className="bg-background rounded-lg p-3 border">
                            <h4 className="font-medium mb-2">Console Output:</h4>
                            <div className="font-mono text-sm space-y-1">
                              <div className="text-success">✓ longestPalindrome("babad") → "bab"</div>
                              <div className="text-success">✓ longestPalindrome("cbbd") → "bb"</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>Run your code to see output and AI evaluation</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="feedback" className="p-4 space-y-4">
                      {showResults ? (
                        <>
                          <div className="space-y-4">
                            <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-4 h-4 text-success" />
                                <span className="font-medium text-success">Excellent Implementation</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Your solution correctly implements the expand around centers approach with optimal time complexity O(n²).
                              </p>
                            </div>

                            <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-info" />
                                <span className="font-medium text-info">Code Quality</span>
                              </div>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Clear variable naming</li>
                                <li>• Good helper function structure</li>
                                <li>• Proper edge case handling</li>
                              </ul>
                            </div>

                            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-warning" />
                                <span className="font-medium text-warning">Optimization Opportunity</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Consider Manacher's algorithm for O(n) time complexity in advanced scenarios.
                              </p>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-border">
                            <h4 className="font-medium mb-2">Skills Demonstrated:</h4>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">String Manipulation</Badge>
                              <Badge variant="secondary">Algorithm Design</Badge>
                              <Badge variant="secondary">Edge Case Handling</Badge>
                              <Badge variant="secondary">Code Organization</Badge>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>AI feedback will appear after running your code</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default CodeAssessment;