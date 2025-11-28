/**
 * AI Service for ATS - Uses OpenRouter/DeepSeek
 * Extracts structured data and calculates scores using ATS logic
 */

const OpenAI = require('openai');
const { matchResumeToJob } = require('./matchingEngine');
const { generateSuggestions } = require('./improvementSuggestions');

// Support multiple AI providers
const getAIClient = () => {
  const provider = process.env.AI_PROVIDER || 'mock';
  
  if (provider === 'openrouter') {
    return new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Recruitment Platform'
      }
    });
  } else if (provider === 'openai') {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  return null;
};

/**
 * AI-based matching - compares resume data against job requirements using AI
 * @param {Object} parsedData - Parsed resume data
 * @param {Object} jobData - Job role data
 * @param {Object} aiClient - AI client instance
 * @param {string} model - Model name
 * @param {string} provider - AI provider
 * @returns {Object} Match results with scores
 */
async function matchResumeWithAI(parsedData, jobData, aiClient, model, provider) {
  const matchingPrompt = `You are an expert HR analyst. Compare this candidate's profile against job requirements and provide a detailed match analysis.

CANDIDATE PROFILE:
- Experience: ${parsedData.yearsOfExperience} years
- Skills: ${parsedData.skills.join(', ')}
- Knowledge: ${parsedData.knowledgeKeywords.join(', ')}
- Tasks/Experience: ${parsedData.taskKeywords.join(', ')}
- Education: ${parsedData.education}
- Certifications: ${parsedData.certifications.join(', ')}

JOB REQUIREMENTS:
- Title: ${jobData.title}
- Required Skills: ${(jobData.skillKeywords || jobData.skills).join(', ')}
- Required Knowledge: ${jobData.knowledge.join(', ')}
- Required Tasks: ${jobData.tasks.join(', ')}
- Required Education: ${jobData.education || 'Not specified'}
- Preferred Certifications: ${jobData.certifications ? jobData.certifications.join(', ') : 'Not specified'}
- Experience Range: ${jobData.experienceRange.min}-${jobData.experienceRange.max} years

SCORING WEIGHTS:
- Skills: ${(jobData.weights.skills * 100).toFixed(0)}%
- Knowledge: ${(jobData.weights.knowledge * 100).toFixed(0)}%
- Tasks: ${(jobData.weights.tasks * 100).toFixed(0)}%
- Certifications: ${(jobData.weights.certifications * 100).toFixed(0)}%
- Education: ${(jobData.weights.education * 100).toFixed(0)}%

Analyze the match and return VALID JSON with this EXACT structure:
{
  "skillMatchPercent": <0-100>,
  "knowledgeMatchPercent": <0-100>,
  "taskMatchPercent": <0-100>,
  "certificationMatchPercent": <0-100>,
  "educationMatchPercent": <0-100>,
  "skillsMatched": [<array of matched skills>],
  "skillsGaps": [<array of missing skills>],
  "knowledgeMatched": [<array of matched knowledge>],
  "knowledgeGaps": [<array of missing knowledge>],
  "tasksMatched": [<array of matched tasks>],
  "tasksGaps": [<array of missing tasks>],
  "certificationMatched": [<array of matched certs>],
  "certificationGaps": [<array of missing certs>],
  "topStrengths": [<top 3 strengths>],
  "topGaps": [<top 3 gaps to improve>],
  "experienceStatus": "<below_minimum|match|overqualified>",
  "reasoning": "<brief explanation of the match>"
}

Be fair and semantic in matching - "Malware Analysis" matches "Ability to perform malware analysis". Consider synonyms and related concepts.`;

  const response = await aiClient.chat.completions.create({
    model: model,
    messages: [
      { role: "system", content: "You are an expert HR analyst specializing in cybersecurity recruitment." },
      { role: "user", content: matchingPrompt }
    ],
    temperature: 0,
    response_format: { type: "json_object" }
  });

  let rawMatch = response.choices[0].message.content;
  if (rawMatch.includes('```json')) {
    rawMatch = rawMatch.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }
  
  const aiMatch = JSON.parse(rawMatch);
  console.log('🎯 AI Match Results:', JSON.stringify(aiMatch, null, 2));
  
  // Calculate weighted final score
  const finalScore = Math.round(
    (aiMatch.skillMatchPercent * jobData.weights.skills) +
    (aiMatch.knowledgeMatchPercent * jobData.weights.knowledge) +
    (aiMatch.taskMatchPercent * jobData.weights.tasks) +
    (aiMatch.certificationMatchPercent * jobData.weights.certifications) +
    (aiMatch.educationMatchPercent * jobData.weights.education)
  );
  
  // Determine eligibility
  const threshold = jobData.thresholdScore || 60;
  let eligibility, eligibilityMessage;
  if (finalScore < threshold) {
    eligibility = 'not_eligible';
    eligibilityMessage = `Not eligible (score: ${finalScore}%, threshold: ${threshold}%)`;
  } else if (finalScore < threshold + 15) {
    eligibility = 'borderline';
    eligibilityMessage = `Borderline (score: ${finalScore}%, threshold: ${threshold}%)`;
  } else {
    eligibility = 'eligible';
    eligibilityMessage = `Eligible (score: ${finalScore}%, threshold: ${threshold}%)`;
  }
  
  // Return in format compatible with existing code
  return {
    finalScore,
    skillMatchPercent: aiMatch.skillMatchPercent,
    knowledgeMatchPercent: aiMatch.knowledgeMatchPercent,
    taskMatchPercent: aiMatch.taskMatchPercent,
    certificationMatchPercent: aiMatch.certificationMatchPercent,
    educationMatchPercent: aiMatch.educationMatchPercent,
    eligibility,
    eligibilityMessage,
    skillDetails: {
      matched: aiMatch.skillsMatched,
      missing: aiMatch.skillsGaps
    },
    knowledgeDetails: {
      matched: aiMatch.knowledgeMatched,
      missing: aiMatch.knowledgeGaps
    },
    taskDetails: {
      matched: aiMatch.tasksMatched,
      missing: aiMatch.tasksGaps
    },
    certificationDetails: {
      matched: aiMatch.certificationMatched,
      missing: aiMatch.certificationGaps
    },
    educationDetails: {
      match: aiMatch.educationMatchPercent >= 70
    },
    experienceMatch: {
      status: aiMatch.experienceStatus,
      candidateYears: parsedData.yearsOfExperience
    },
    warnings: aiMatch.topGaps.map(gap => `Gap: ${gap}`),
    topStrengths: aiMatch.topStrengths,
    topGaps: aiMatch.topGaps,
    reasoning: aiMatch.reasoning,
    matchingMethod: 'ai-based'
  };
}

/**
 * OPTIMIZED: Single AI call for parsing AND matching (70% faster)
 * Combines extraction and matching into one API call with shorter prompts
 * @param {string} resumeText - Raw resume text
 * @param {Object} jobData - Job role data from jobRoles_ATS
 * @returns {Object} Complete analysis with scores and suggestions
 */
async function parseResumeWithATS_Optimized(resumeText, jobData) {
  const provider = process.env.AI_PROVIDER || 'mock';
  const aiClient = getAIClient();
  
  // Check if AI service is configured
  if (!aiClient || 
      (provider === 'openai' && (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here')) ||
      (provider === 'openrouter' && (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here'))) {
    console.log('⚠️  Using mock AI service - no API key provided');
    return generateMockAnalysis(resumeText, jobData);
  }

  try {
    const model = provider === 'openrouter' 
      ? (process.env.MODEL_NAME || 'x-ai/grok-4.1-fast:free')
      : 'gpt-3.5-turbo';

    console.log(`⚡ OPTIMIZED MODE: Single AI call using ${provider} with model: ${model}`);
    
    // Use skillKeywords (shorter) instead of full skills array
    const topSkills = (jobData.skillKeywords || jobData.skills).slice(0, 10);
    const topKnowledge = jobData.knowledge.slice(0, 7);
    const topTasks = jobData.tasks.slice(0, 7);
    
    // SINGLE COMBINED PROMPT - Parse + Match in one call
    const systemPrompt = `You are an expert HR analyst for cybersecurity recruitment. Extract resume data AND match against job requirements in a single analysis.`;

    const userPrompt = `Analyze this resume against the job requirements and return a complete assessment.

RESUME TEXT:
${resumeText}

JOB REQUIREMENTS:
Title: ${jobData.title}
Core Skills: ${topSkills.join(', ')}
Core Knowledge: ${topKnowledge.join(', ')}
Key Tasks: ${topTasks.join(', ')}
Required Certifications: ${jobData.certifications ? jobData.certifications.join(', ') : 'None'}
Required Education: ${jobData.education || 'Not specified'}
Experience Range: ${jobData.experienceRange.min}-${jobData.experienceRange.max} years

Return VALID JSON with this EXACT structure:
{
  "yearsOfExperience": <number>,
  "skills": [<all skills found in resume>],
  "knowledgeKeywords": [<all knowledge areas found>],
  "taskKeywords": [<all tasks/responsibilities found>],
  "education": "<highest degree>",
  "certifications": [<all certifications found>],
  "jobTitles": [<job titles from resume>],
  "skillMatchPercent": <0-100>,
  "knowledgeMatchPercent": <0-100>,
  "taskMatchPercent": <0-100>,
  "certificationMatchPercent": <0-100>,
  "educationMatchPercent": <0-100>,
  "skillsMatched": [<matched skills>],
  "skillsGaps": [<missing skills>],
  "knowledgeMatched": [<matched knowledge>],
  "knowledgeGaps": [<missing knowledge>],
  "tasksMatched": [<matched tasks>],
  "tasksGaps": [<missing tasks>],
  "certificationMatched": [<matched certs>],
  "certificationGaps": [<missing certs>],
  "topStrengths": [<top 3 strengths>],
  "topGaps": [<top 3 improvement areas>],
  "experienceStatus": "<below_minimum|match|overqualified>",
  "reasoning": "<brief 1-2 sentence explanation>",
  "calculationDetails": {
    "skillsCalculation": "<explain how you calculated skillMatchPercent, e.g., 'Found 7 out of 10 required skills in resume = 70%'>",
    "knowledgeCalculation": "<explain how you calculated knowledgeMatchPercent>",
    "tasksCalculation": "<explain how you calculated taskMatchPercent>",
    "certificationsCalculation": "<explain how you calculated certificationMatchPercent>",
    "educationCalculation": "<explain how you calculated educationMatchPercent>",
    "matchedTextExamples": {
      "skills": [<array of text snippets from resume that matched skills, e.g., "Found 'Splunk' in work experience which matches SIEM requirement">],
      "knowledge": [<array of text snippets that matched knowledge>],
      "tasks": [<array of text snippets that matched tasks>]
    }
  }
}

Be semantic in matching - "Splunk" matches "SIEM", "incident investigation" matches "Incident Response".
IMPORTANT: Provide detailed calculation explanations showing your reasoning for each percentage score.`;

    const startTime = Date.now();
    
    const response = await aiClient.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const duration = Date.now() - startTime;
    console.log(`⚡ AI Response Time: ${duration}ms`);

    let rawAnalysis = response.choices[0].message.content;
    
    // Remove markdown if present
    if (rawAnalysis.includes('```json')) {
      rawAnalysis = rawAnalysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const aiResult = JSON.parse(rawAnalysis);
    console.log('✅ Single AI call completed - extracted AND matched data');
    
    // Log AI's calculation details
    if (aiResult.calculationDetails) {
      console.log('\n🧮 ========== AI CALCULATION BREAKDOWN ==========');
      console.log('\n📊 SKILLS CALCULATION:');
      console.log(aiResult.calculationDetails.skillsCalculation);
      console.log('\n📚 KNOWLEDGE CALCULATION:');
      console.log(aiResult.calculationDetails.knowledgeCalculation);
      console.log('\n📝 TASKS CALCULATION:');
      console.log(aiResult.calculationDetails.tasksCalculation);
      console.log('\n🎓 CERTIFICATIONS CALCULATION:');
      console.log(aiResult.calculationDetails.certificationsCalculation);
      console.log('\n🎓 EDUCATION CALCULATION:');
      console.log(aiResult.calculationDetails.educationCalculation);
      
      if (aiResult.calculationDetails.matchedTextExamples) {
        console.log('\n📄 MATCHED TEXT EXAMPLES FROM RESUME:');
        console.log('\nSkills:');
        aiResult.calculationDetails.matchedTextExamples.skills?.forEach((example, i) => {
          console.log(`  ${i + 1}. ${example}`);
        });
        console.log('\nKnowledge:');
        aiResult.calculationDetails.matchedTextExamples.knowledge?.forEach((example, i) => {
          console.log(`  ${i + 1}. ${example}`);
        });
        console.log('\nTasks:');
        aiResult.calculationDetails.matchedTextExamples.tasks?.forEach((example, i) => {
          console.log(`  ${i + 1}. ${example}`);
        });
      }
      console.log('\n========== END OF CALCULATION BREAKDOWN ==========\n');
    }
    
    // Calculate weighted final score
    const finalScore = Math.round(
      (aiResult.skillMatchPercent * jobData.weights.skills) +
      (aiResult.knowledgeMatchPercent * jobData.weights.knowledge) +
      (aiResult.taskMatchPercent * jobData.weights.tasks) +
      (aiResult.certificationMatchPercent * jobData.weights.certifications) +
      (aiResult.educationMatchPercent * jobData.weights.education)
    );
    
    // Determine eligibility
    const threshold = jobData.thresholdScore || 60;
    let eligibility, eligibilityMessage;
    if (finalScore < threshold) {
      eligibility = 'not_eligible';
      eligibilityMessage = `Not eligible (score: ${finalScore}%, threshold: ${threshold}%)`;
    } else if (finalScore < threshold + 15) {
      eligibility = 'borderline';
      eligibilityMessage = `Borderline (score: ${finalScore}%, threshold: ${threshold}%)`;
    } else {
      eligibility = 'eligible';
      eligibilityMessage = `Eligible (score: ${finalScore}%, threshold: ${threshold}%)`;
    }
    
    // Build match result object
    const matchResult = {
      finalScore,
      skillMatchPercent: aiResult.skillMatchPercent,
      knowledgeMatchPercent: aiResult.knowledgeMatchPercent,
      taskMatchPercent: aiResult.taskMatchPercent,
      certificationMatchPercent: aiResult.certificationMatchPercent,
      educationMatchPercent: aiResult.educationMatchPercent,
      eligibility,
      eligibilityMessage,
      skillDetails: {
        matched: aiResult.skillsMatched,
        missing: aiResult.skillsGaps,
        matchedCount: aiResult.skillsMatched.length,
        totalRequired: topSkills.length
      },
      knowledgeDetails: {
        matched: aiResult.knowledgeMatched,
        missing: aiResult.knowledgeGaps
      },
      taskDetails: {
        matched: aiResult.tasksMatched,
        missing: aiResult.tasksGaps
      },
      certificationDetails: {
        matched: aiResult.certificationMatched,
        missing: aiResult.certificationGaps
      },
      educationDetails: {
        match: aiResult.educationMatchPercent >= 70
      },
      experienceMatch: {
        status: aiResult.experienceStatus,
        candidateYears: aiResult.yearsOfExperience
      },
      warnings: aiResult.topGaps.map(gap => `Gap: ${gap}`),
      topStrengths: aiResult.topStrengths,
      topGaps: aiResult.topGaps,
      reasoning: aiResult.reasoning,
      matchingMethod: 'ai-optimized-single-call'
    };
    
    // Parsed data
    const parsedData = {
      yearsOfExperience: aiResult.yearsOfExperience || 0,
      skills: aiResult.skills || [],
      knowledgeKeywords: aiResult.knowledgeKeywords || [],
      taskKeywords: aiResult.taskKeywords || [],
      education: aiResult.education || 'Not specified',
      certifications: aiResult.certifications || [],
      jobTitles: aiResult.jobTitles || []
    };
    
    // Generate suggestions
    const suggestions = generateSuggestions(matchResult, parsedData, jobData);
    
    // Return combined result
    return {
      // Parsed data
      yearsOfExperience: parsedData.yearsOfExperience,
      skills: parsedData.skills,
      knowledgeKeywords: parsedData.knowledgeKeywords,
      taskKeywords: parsedData.taskKeywords,
      education: parsedData.education,
      certifications: parsedData.certifications,
      jobTitles: parsedData.jobTitles,
      
      // Matching results
      score: matchResult.finalScore,
      skillMatchPercent: matchResult.skillMatchPercent,
      knowledgeMatchPercent: matchResult.knowledgeMatchPercent,
      taskMatchPercent: matchResult.taskMatchPercent,
      certificationMatchPercent: matchResult.certificationMatchPercent,
      educationMatchPercent: matchResult.educationMatchPercent,
      
      // Eligibility
      eligibility: matchResult.eligibility,
      eligibilityMessage: matchResult.eligibilityMessage,
      
      // Gaps
      skills_matched: matchResult.skillDetails.matched,
      skill_gaps: matchResult.skillDetails.missing,
      knowledge_gaps: matchResult.knowledgeDetails.missing,
      task_gaps: matchResult.taskDetails.missing,
      certification_gaps: matchResult.certificationDetails.missing,
      education_match: matchResult.educationDetails.match,
      
      // Experience
      experience_years: parsedData.yearsOfExperience,
      experience_level: determineExperienceLevel(parsedData.yearsOfExperience),
      experience_status: matchResult.experienceMatch.status,
      
      // Feedback
      warnings: matchResult.warnings,
      suggestions: suggestions,
      
      // AI-specific insights
      topStrengths: matchResult.topStrengths,
      topGaps: matchResult.topGaps,
      reasoning: matchResult.reasoning,
      matchingMethod: matchResult.matchingMethod,
      
      // Summary
      summary: generateSummary(matchResult, parsedData),
      
      // Performance metrics
      processingTime: duration
    };

  } catch (error) {
    console.error('❌ Optimized AI parsing error:', error.message);
    console.error('Error details:', error);
    console.log('⚠️  Falling back to mock AI service');
    return generateMockAnalysis(resumeText, jobData);
  }
}

/**
 * Parse resume using AI and match against job (LEGACY - 2 AI calls)
 * @param {string} resumeText - Raw resume text
 * @param {Object} jobData - Job role data from jobRoles_ATS
 * @returns {Object} Complete analysis with scores and suggestions
 */
async function parseResumeWithATS(resumeText, jobData) {
  // Use optimized version by default
  return parseResumeWithATS_Optimized(resumeText, jobData);
}

/**
 * Generate mock analysis when AI is not available
 */
function generateMockAnalysis(resumeText, jobData) {
  console.log('⚠️  Using MOCK AI - extracting data with regex patterns');
  const text = resumeText.toLowerCase();
  const originalText = resumeText;
  
  // Simple keyword matching
  const foundSkills = jobData.skills.filter(skill => 
    text.includes(skill.toLowerCase())
  );
  
  const foundKnowledge = jobData.knowledge.filter(knowledge => 
    text.includes(knowledge.toLowerCase())
  );
  
  const foundTasks = jobData.tasks.filter(task => {
    const keywords = task.toLowerCase().split(' ').filter(w => w.length > 3);
    return keywords.some(kw => text.includes(kw));
  });
  
  // Extract experience - improved
  const expMatch = text.match(/(\d+)\+?\s*years?/);
  const yearsOfExperience = expMatch ? parseInt(expMatch[1]) : 2;
  
  // Extract education - improved
  let education = 'Not specified';
  if (text.includes('bachelor')) {
    // Try to extract full degree name
    const bachelorMatch = originalText.match(/bachelor[^\n|]*/i);
    education = bachelorMatch ? bachelorMatch[0].trim() : 'Bachelor\'s Degree';
  } else if (text.includes('master')) {
    const masterMatch = originalText.match(/master[^\n|]*/i);
    education = masterMatch ? masterMatch[0].trim() : 'Master\'s Degree';
  } else if (text.includes('associate')) {
    education = 'Associate\'s Degree';
  }
  
  // Extract certifications - improved with deduplication
  const certifications = new Set();
  const certMap = {
    'CompTIA Security+': /CompTIA\s+Security\+/gi,
    'CompTIA Network+': /CompTIA\s+Network\+/gi,
    'CompTIA CySA+': /CompTIA\s+CySA\+/gi,
    'CompTIA A+': /CompTIA\s+A\+/gi,
    'CEH': /Certified\s+Ethical\s+Hacker|(?<!\w)CEH(?!\w)/gi,
    'CISSP': /(?<!\w)CISSP(?!\w)/gi,
    'CISM': /(?<!\w)CISM(?!\w)/gi,
    'CISA': /(?<!\w)CISA(?!\w)/gi,
    'OSCP': /Offensive\s+Security\s+Certified\s+Professional|(?<!\w)OSCP(?!\w)/gi,
    'GIAC': /(?<!\w)GIAC(?!\w)/gi,
    'GSEC': /GIAC\s+Security\s+Essentials|(?<!\w)GSEC(?!\w)/gi,
    'GCIH': /GIAC\s+Certified\s+Incident\s+Handler|(?<!\w)GCIH(?!\w)/gi
  };
  
  // Check each certification pattern
  Object.entries(certMap).forEach(([certName, pattern]) => {
    if (pattern.test(originalText)) {
      certifications.add(certName);
    }
  });
  
  // Convert Set to Array
  const certificationsArray = Array.from(certifications);
  
  // If no certifications found, return empty array (don't add fake ones)
  if (certificationsArray.length === 0) {
    console.log('⚠️  No certifications found in resume');
  }
  
  console.log('📚 Extracted Education:', education);
  console.log('🎓 Extracted Certifications:', certificationsArray);
  
  // Mock parsed data
  const parsedData = {
    yearsOfExperience,
    skills: foundSkills,
    knowledgeKeywords: foundKnowledge,
    taskKeywords: foundTasks,
    education: education,
    certifications: certificationsArray,
    jobTitles: ['Security Analyst']
  };
  
  console.log('\n🔍 MOCK AI EXTRACTION RESULTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Skills Found:', foundSkills.length, '/', jobData.skills.length);
  console.log('   Matched:', foundSkills.join(', ') || 'None');
  console.log('📚 Knowledge Found:', foundKnowledge.length, '/', jobData.knowledge.length);
  console.log('   Matched:', foundKnowledge.join(', ') || 'None');
  console.log('📝 Tasks Found:', foundTasks.length, '/', jobData.tasks.length);
  console.log('🎓 Certifications:', certificationsArray.join(', ') || 'None');
  console.log('🎓 Education:', education);
  console.log('💼 Experience:', yearsOfExperience, 'years');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Use matching engine
  const matchResult = matchResumeToJob(parsedData, jobData);
  const suggestions = generateSuggestions(matchResult, parsedData, jobData);
  
  return {
    yearsOfExperience,
    skills: foundSkills,
    knowledgeKeywords: foundKnowledge,
    taskKeywords: foundTasks,
    education: parsedData.education,
    certifications: parsedData.certifications,
    jobTitles: parsedData.jobTitles,
    score: matchResult.finalScore,
    skillMatchPercent: matchResult.skillMatchPercent,
    knowledgeMatchPercent: matchResult.knowledgeMatchPercent,
    taskMatchPercent: matchResult.taskMatchPercent,
    certificationMatchPercent: matchResult.certificationMatchPercent || 0,
    educationMatchPercent: matchResult.educationMatchPercent || 0,
    eligibility: matchResult.eligibility,
    eligibilityMessage: matchResult.eligibilityMessage,
    skills_matched: matchResult.skillDetails.matched,
    skill_gaps: matchResult.skillDetails.missing,
    knowledge_gaps: matchResult.knowledgeDetails.missing,
    task_gaps: matchResult.taskDetails.missing,
    certification_gaps: matchResult.certificationDetails?.missing || [],
    education_match: matchResult.educationDetails?.match || false,
    experience_years: yearsOfExperience,
    experience_level: determineExperienceLevel(yearsOfExperience),
    experience_status: matchResult.experienceMatch.status,
    warnings: matchResult.warnings,
    suggestions: suggestions,
    summary: generateSummary(matchResult, parsedData)
  };
}

function determineExperienceLevel(years) {
  if (years === 0) return 'entry';
  if (years <= 2) return 'entry';
  if (years <= 5) return 'mid';
  if (years <= 10) return 'senior';
  return 'lead';
}

function generateSummary(matchResult, parsedData) {
  return `Candidate scored ${matchResult.finalScore}% overall. ` +
    `${matchResult.skillDetails.matchedCount}/${matchResult.skillDetails.totalRequired} skills matched. ` +
    `${parsedData.yearsOfExperience} years of experience. ` +
    `Status: ${matchResult.eligibilityMessage}`;
}

/**
 * Generate personalized suggestions for candidates using AI
 * @param {Object} analysisResult - The AI analysis result
 * @param {Object} jobData - Job role data
 * @returns {Object} Personalized suggestions
 */
async function generatePersonalizedSuggestions(analysisResult, jobData) {
  const provider = process.env.AI_PROVIDER || 'mock';
  const aiClient = getAIClient();
  
  // If AI not available, return null (no suggestions)
  if (!aiClient || 
      (provider === 'openai' && (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here')) ||
      (provider === 'openrouter' && (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here'))) {
    console.log('⚠️  AI not available - skipping personalized suggestions');
    return null;
  }

  try {
    const isEligible = analysisResult.score >= jobData.thresholdScore;
    
    let prompt;
    if (isEligible) {
      // For eligible candidates - test preparation tips
      prompt = `You are a helpful career advisor. A candidate just applied for "${jobData.title}" and is ELIGIBLE for the skills test.

Candidate Profile:
- Resume Score: ${analysisResult.score}/100
- Matched Skills: ${analysisResult.skills_matched.slice(0, 5).join(', ')}
- Experience: ${analysisResult.experience_years} years

Generate 3-4 encouraging test preparation tips. Be specific about what skills to review.
Format as JSON array of strings. Keep each tip to 1-2 sentences. Be encouraging and practical.

Example format:
["Tip 1 here", "Tip 2 here", "Tip 3 here"]`;
    } else {
      // For not eligible candidates - improvement suggestions
      const topGaps = analysisResult.skill_gaps.slice(0, 3);
      prompt = `You are a supportive career advisor. A candidate applied for "${jobData.title}" but didn't meet the minimum score (got ${analysisResult.score}/100, needed ${jobData.thresholdScore}).

Candidate Profile:
- Current Skills: ${analysisResult.skills_matched.join(', ') || 'Limited match'}
- Missing Skills: ${topGaps.join(', ')}
- Experience: ${analysisResult.experience_years} years

Generate 3 personalized, encouraging suggestions to help them improve. Each suggestion should:
1. Focus on one of the missing skills
2. Be actionable and specific
3. Be encouraging and realistic
4. Mention practical resources or steps

Format as JSON array of strings. Keep each suggestion to 2-3 sentences.

Example format:
["Suggestion 1 about skill A", "Suggestion 2 about skill B", "Suggestion 3 about skill C"]`;
    }

    const model = provider === 'openrouter' 
      ? (process.env.MODEL_NAME || 'x-ai/grok-4.1-fast:free')
      : 'gpt-3.5-turbo';

    console.log(`🤖 Generating personalized suggestions using ${model}...`);

    const response = await aiClient.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "You are a helpful career advisor. Always return valid JSON arrays." },
        { role: "user", content: prompt }
      ],
      temperature: 0,
      max_tokens: 500
    });

    let content = response.choices[0].message.content.trim();
    
    // Clean up markdown if present
    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const suggestions = JSON.parse(content);
    
    if (!Array.isArray(suggestions)) {
      throw new Error('AI did not return an array');
    }
    
    console.log(`✅ Generated ${suggestions.length} personalized suggestions`);
    
    return {
      isEligible,
      suggestions,
      message: isEligible 
        ? "Congratulations! Your profile matches our requirements." 
        : "Thank you for applying. Here are some suggestions to strengthen your profile."
    };

  } catch (error) {
    console.error('❌ Error generating personalized suggestions:', error.message);
    return null; // Fail gracefully
  }
}

module.exports = {
  parseResumeWithATS,
  parseResumeWithATS_Optimized,
  generatePersonalizedSuggestions
};
