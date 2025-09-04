import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { config, assessmentIds, dateRange, includeDetails } = await req.json();

    console.log('Generating report for assessments:', assessmentIds);
    console.log('Date range:', dateRange);
    console.log('Include details:', includeDetails);

    // Mock report data - in a real implementation, this would query the database
    const reportData = {
      title: 'Assessment Report',
      generatedAt: new Date().toISOString(),
      dateRange,
      assessments: assessmentIds.map((id: string) => ({
        id,
        title: `Assessment ${id}`,
        participantCount: Math.floor(Math.random() * 50) + 10,
        averageScore: Math.floor(Math.random() * 40) + 60,
        completionRate: Math.floor(Math.random() * 30) + 70
      })),
      summary: {
        totalParticipants: 150,
        averageScore: 75.8,
        completionRate: 88.5,
        topPerformers: 15,
        needsImprovement: 23
      }
    };

    if (config.format === 'pdf') {
      // Generate PDF report
      const pdfContent = await generatePDFReport(reportData, includeDetails);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          pdf: Array.from(pdfContent),
          filename: `assessment-report-${new Date().toISOString().split('T')[0]}.pdf`
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } else {
      // Generate CSV/Excel content
      const content = generateCSVReport(reportData, includeDetails);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          content,
          filename: `assessment-report-${new Date().toISOString().split('T')[0]}.${config.format}`
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

  } catch (error) {
    console.error('Error generating report:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Report generation failed',
        details: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
});

async function generatePDFReport(data: any, includeDetails: any): Promise<Uint8Array> {
  // Simple PDF generation - in production, use a proper PDF library
  const pdfHeader = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 500
>>
stream
BT
/F1 12 Tf
50 750 Td
(Assessment Report) Tj
0 -20 Td
(Generated: ${data.generatedAt}) Tj
0 -20 Td
(Date Range: ${data.dateRange.start} to ${data.dateRange.end}) Tj
0 -40 Td
(Summary:) Tj
0 -20 Td
(Total Participants: ${data.summary.totalParticipants}) Tj
0 -20 Td
(Average Score: ${data.summary.averageScore}%) Tj
0 -20 Td
(Completion Rate: ${data.summary.completionRate}%) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000826 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
885
%%EOF`;

  return new TextEncoder().encode(pdfHeader);
}

function generateCSVReport(data: any, includeDetails: any): string {
  let csv = 'Assessment Report\n\n';
  csv += `Generated,${data.generatedAt}\n`;
  csv += `Date Range,${data.dateRange.start} to ${data.dateRange.end}\n\n`;
  
  csv += 'Summary\n';
  csv += `Total Participants,${data.summary.totalParticipants}\n`;
  csv += `Average Score,${data.summary.averageScore}%\n`;
  csv += `Completion Rate,${data.summary.completionRate}%\n\n`;
  
  csv += 'Assessment Details\n';
  csv += 'ID,Title,Participants,Average Score,Completion Rate\n';
  
  data.assessments.forEach((assessment: any) => {
    csv += `${assessment.id},${assessment.title},${assessment.participantCount},${assessment.averageScore}%,${assessment.completionRate}%\n`;
  });
  
  if (includeDetails.participantInfo) {
    csv += '\nParticipant Details\n';
    csv += 'Name,Email,Score,Completion Time,Status\n';
    // Add mock participant data
    for (let i = 1; i <= 10; i++) {
      csv += `Participant ${i},participant${i}@example.com,${Math.floor(Math.random() * 40) + 60}%,${Math.floor(Math.random() * 60) + 30} min,Completed\n`;
    }
  }
  
  return csv;
}