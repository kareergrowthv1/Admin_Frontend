import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  FileText,
  GraduationCap,
  Info,
  Layers3,
  Sparkles,
  XCircle,
} from 'lucide-react';
import api, { gatewayApi } from '../../config/axios';
import logo from '../../assets/logo.png';

const toArray = (value) => (Array.isArray(value) ? value : []);

const getOriginBadge = (origin) => {
  switch (origin) {
    case 'Human-written':
      return 'bg-[#D1FAE5] text-[#065F46]';
    case 'AI-assisted':
      return 'bg-[#FEF9C3] text-[#854D09]';
    case 'AI-generated':
      return 'bg-[#FEE2F2] text-[#991B1B]';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

const recommendationToRating = (status) => {
  switch (String(status || '').toUpperCase()) {
    case 'RECOMMENDED':
      return 'Recommended';
    case 'NOT_RECOMMENDED':
      return 'Not Recommended';
    case 'CAUTIOUSLY_RECOMMENDED':
    case 'PENDING':
      return 'Cautiously Recommended';
    default:
      return 'N/A';
  }
};

const getRoundTitle = (roundKey) => {
  switch (roundKey) {
    case 'round1':
      return 'General Screening';
    case 'round2':
      return 'Position-Specific Screening';
    case 'round3':
      return 'Coding Challenge';
    case 'round4':
      return 'Aptitude Assessment';
    default:
      return roundKey || 'Assessment Round';
  }
};

const getAssessmentSummaryFlag = (assessmentSummary, key, fallback = false) => {
  if (!assessmentSummary || typeof assessmentSummary !== 'object') return fallback;
  const snakeKey = key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
  const value = assessmentSummary?.[key] ?? assessmentSummary?.[snakeKey];
  return value == null ? fallback : Boolean(value);
};

const getQuestionAndAnswerFromConversationSet = (set) => {
  const conversations = toArray(set?.conversations);
  const questionEntry = conversations.find((c) => c?.type === 'question') || conversations[0] || {};
  const answerEntry = conversations.find((c) => c?.type === 'answer') || conversations[1] || {};

  return {
    question: questionEntry?.text || set?.question || '',
    candidateAnswer: answerEntry?.text || set?.candidateAnswer || set?.answer || '',
    aiComment: answerEntry?.aiComment || (set?.aiComments ? { text: set.aiComments } : null),
  };
};

const normalizeScreeningQuestions = (raw) => {
  const direct = raw?.screeningQuestions || raw?.phase3?.screeningQuestions;
  if (direct) {
    return {
      generalQuestions: toArray(direct?.generalQuestions).map((q) => ({
        question: q?.question || q?.text || '',
        candidateAnswer: q?.candidateAnswer || q?.answer || '',
        aiComment: q?.aiComment || (q?.aiComments ? { text: q.aiComments } : null),
      })),
      specificQuestions: toArray(direct?.specificQuestions).map((q) => ({
        question: q?.question || q?.text || '',
        candidateAnswer: q?.candidateAnswer || q?.answer || '',
        aiComment: q?.aiComment || (q?.aiComments ? { text: q.aiComments } : null),
      })),
    };
  }

  const categories = raw?.interviewData?.categories || {};
  return {
    generalQuestions: toArray(categories?.generalQuestion?.conversationSets).map(getQuestionAndAnswerFromConversationSet),
    specificQuestions: toArray(categories?.positionSpecificQuestion?.conversationSets).map(getQuestionAndAnswerFromConversationSet),
  };
};

const normalizeCodingQuestionSets = (raw) => {
  const sourceSets = toArray(raw?.codingQuestionSets || raw?.phase3?.codingQuestionSets || raw?.codingData);
  return sourceSets.map((set, setIndex) => {
    const questions = toArray(set?.questions).map((question, questionIndex) => {
      const submissions = toArray(question?.submissions);
      const finalSubmission = submissions.find((item) => item?.isFinalSubmission) || submissions[submissions.length - 1] || null;
      const testCases = toArray(question?.testCases || question?.testCaseResults).map((testCase) => ({
        ...testCase,
        isPassed: typeof testCase?.isPassed === 'boolean' ? testCase.isPassed : testCase?.result === 'passed',
      }));

      return {
        ...question,
        questionTitle: question?.questionTitle || question?.title || question?.question || `Coding Question ${questionIndex + 1}`,
        questionDescription: question?.questionDescription || question?.description || question?.problemStatement || '',
        constraints: question?.constraints || '',
        timeLimit: question?.timeLimit ?? 0,
        tags: toArray(question?.tags),
        sampleInputAndOutput: question?.sampleInputAndOutput || question?.sampleTestCase || null,
        followUpQuestions: toArray(question?.followUpQuestions),
        executionStatus: question?.executionStatus || finalSubmission?.status || 'SUBMITTED',
        testCasesPassed: typeof question?.testCasesPassed === 'number' ? question.testCasesPassed : testCases.filter((item) => item?.isPassed).length,
        totalTestCases: typeof question?.totalTestCases === 'number' ? question.totalTestCases : testCases.length,
        aiRatingReason: question?.aiRatingReason || null,
        submissions: finalSubmission
          ? [{
              ...finalSubmission,
              programmingLanguage: finalSubmission?.programmingLanguage || finalSubmission?.language || question?.language || 'N/A',
              submissionOrigin: finalSubmission?.submissionOrigin || question?.submissionOrigin || null,
            }]
          : [],
        testCases,
      };
    });

    return {
      ...set,
      id: set?.id || setIndex,
      questions,
      overallAiReview: set?.overallAiReview || '',
    };
  });
};

const normalizeAptitudeAssessment = (raw) => {
  const source = raw?.aptitudeAssessment || raw?.phase3?.aptitudeAssessment || raw?.aptitudeData;
  const questions = toArray(source?.questions).map((question, index) => {
    const options = toArray(question?.options).map((option, optionIndex) => {
      if (typeof option === 'string') {
        return { optionKey: String.fromCharCode(65 + optionIndex), text: option };
      }
      return {
        optionKey: option?.optionKey || String.fromCharCode(65 + optionIndex),
        text: option?.text || String(option?.value || ''),
      };
    });

    const resolveKey = (answer, fallbackObj) => {
      const objectKey = fallbackObj?.optionKey || fallbackObj?.key || null;
      if (objectKey) return objectKey;
      if (!answer) return null;
      const upper = String(answer).trim().toUpperCase();
      const byKey = options.find((option) => String(option.optionKey).toUpperCase() === upper);
      if (byKey) return byKey.optionKey;
      const byText = options.find((option) => String(option.text).trim().toLowerCase() === String(answer).trim().toLowerCase());
      return byText?.optionKey || null;
    };

    const candidateKey = resolveKey(question?.candidateAnswer || question?.selectedAnswer, question?.selectedAnswer);
    const correctKey = resolveKey(question?.correctAnswer, null);

    return {
      ...question,
      question: question?.question || question?.questionText || `Question ${index + 1}`,
      options,
      candidateAnswer: candidateKey || question?.candidateAnswer || question?.selectedAnswer?.text || null,
      correctAnswer: correctKey || question?.correctAnswer || null,
      isCorrect: typeof question?.isCorrect === 'boolean' ? question.isCorrect : candidateKey && correctKey ? candidateKey === correctKey : false,
    };
  });

  return {
    ...(source || {}),
    questions,
  };
};

const normalizeReportData = (raw) => {
  if (!raw || typeof raw !== 'object') return null;

  return {
    ...raw,
    screeningQuestions: normalizeScreeningQuestions(raw),
    codingQuestionSets: normalizeCodingQuestionSets(raw),
    aptitudeAssessment: normalizeAptitudeAssessment(raw),
  };
};

const normalizeMaybeGcsUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const isGcsPrivateUrl = (value) => {
  const url = String(value || '').trim();
  return url.startsWith('gs://') || url.startsWith('https://storage.googleapis.com/');
};

const signGcsUrlIfNeeded = async (rawUrl) => {
  const normalized = normalizeMaybeGcsUrl(rawUrl);
  if (!normalized) return '';
  if (!isGcsPrivateUrl(normalized)) return normalized;
  try {
    const res = await api.get('/candidates/recording/signed-url', {
      params: { gcsUrl: encodeURIComponent(normalized) },
    });
    return res?.data?.signedUrl || '';
  } catch {
    return '';
  }
};

const signScreenshotList = async (urls, max = 4) => {
  const list = toArray(urls).filter(Boolean).slice(0, max);
  if (list.length === 0) return [];
  const signed = await Promise.all(list.map((u) => signGcsUrlIfNeeded(u)));
  return signed.filter(Boolean);
};

const fetchReportScreenshotAssets = async ({ positionId, candidateId, clientId }) => {
  if (!positionId || !candidateId) return null;
  try {
    const res = await api.get('/candidates/report/screenshot-assets', {
      params: {
        positionId,
        candidateId,
        ...(clientId ? { clientId } : {}),
      },
    });
    return res?.data?.data || null;
  } catch {
    return null;
  }
};

const hydrateSignedScreenshotAssets = async (vm, context = {}) => {
  if (!vm || typeof vm !== 'object') return vm;

  const interviewData = vm.interviewData || {};
  const groups = interviewData.proctoringScreenshots || {};

  // Primary source: dedicated backend API that discovers and signs screenshot URLs from GCS.
  const apiAssets = await fetchReportScreenshotAssets(context);

  let calibration = toArray(apiAssets?.calibration).slice(0, 4);
  let noFace = toArray(apiAssets?.noFace).slice(0, 4);
  let multipleFaces = toArray(apiAssets?.multipleFaces).slice(0, 4);
  let allDirection = toArray(apiAssets?.allDirection).slice(0, 4);
  let profilePicture = String(apiAssets?.profilePicture || '').trim();

  // Fallback: if API has no data, use report payload URLs and sign them on client.
  if (!profilePicture && calibration.length === 0 && noFace.length === 0 && multipleFaces.length === 0 && allDirection.length === 0) {
    calibration = await signScreenshotList(groups.calibration, 4);
    noFace = await signScreenshotList(groups.noFace, 4);
    multipleFaces = await signScreenshotList(groups.multipleFaces, 4);
    allDirection = await signScreenshotList(groups.allDirection, 4);
  }

  const existingProfile = await signGcsUrlIfNeeded(vm?.candidateInfo?.profilePicture || '');
  profilePicture = profilePicture || existingProfile || calibration[0] || '';

  return {
    ...vm,
    candidateInfo: {
      ...(vm.candidateInfo || {}),
      profilePicture: profilePicture || null,
    },
    interviewData: {
      ...interviewData,
      proctoringScreenshots: {
        calibration,
        noFace,
        multipleFaces,
        allDirection,
      },
      screenshots: [...calibration, ...noFace, ...multipleFaces, ...allDirection].filter(Boolean),
    },
  };
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    const options = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    let formattedDate = date.toLocaleDateString('en-US', options);
    formattedDate = formattedDate.replace(/, (\d{1,2}:\d{2} (?:AM|PM))/, ' $1');
    return formattedDate;
  } catch {
    return 'Invalid date';
  }
};

const REPORT_FETCH_DEDUPE_TTL_MS = 5000;
const reportFetchInFlight = new Map();
const reportFetchRecent = new Map();

const fetchReportWithDedupe = async (requestKey, fetcher) => {
  const now = Date.now();
  const recent = reportFetchRecent.get(requestKey);
  if (recent && now - recent.ts < REPORT_FETCH_DEDUPE_TTL_MS) {
    return recent.data;
  }

  if (reportFetchInFlight.has(requestKey)) {
    return reportFetchInFlight.get(requestKey);
  }

  const promise = (async () => {
    const data = await fetcher();
    reportFetchRecent.set(requestKey, { ts: Date.now(), data });
    return data;
  })().finally(() => {
    reportFetchInFlight.delete(requestKey);
  });

  reportFetchInFlight.set(requestKey, promise);
  return promise;
};

const getRatingBadge = (rating) => {
  switch (rating?.toLowerCase()) {
    case 'recommended':
      return 'bg-[#D1FAE5] text-[#065F46] border-[#B8F2BD]';
    case 'not recommended':
      return 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]';
    case 'cautiously recommended':
      return 'bg-[#FFEDD5] text-[#9A3412] border-[#FDBA74]';
    default:
      return 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]';
  }
};

const getPerformanceLabel = (score, maxScore = 10) => {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (percentage >= 80) return { label: 'Excellent', bgColor: 'bg-green-100', textColor: 'text-green-800' };
  if (percentage >= 70) return { label: 'Good', bgColor: 'bg-green-100', textColor: 'text-green-800' };
  if (percentage >= 60) return { label: 'Above Average', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
  if (percentage >= 50) return { label: 'Average', bgColor: 'bg-orange-100', textColor: 'text-orange-800' };
  return { label: 'Below Average', bgColor: 'bg-red-100', textColor: 'text-red-800' };
};

const getSkillLevel = (score, maxScore = 10) => {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (percentage >= 90) return { level: 'Expert', color: 'text-purple-700', bgColor: 'bg-purple-50' };
  if (percentage >= 80) return { level: 'Advanced', color: 'text-blue-700', bgColor: 'bg-blue-50' };
  if (percentage >= 70) return { level: 'Proficient', color: 'text-green-700', bgColor: 'bg-green-50' };
  if (percentage >= 60) return { level: 'Competent', color: 'text-yellow-700', bgColor: 'bg-yellow-50' };
  if (percentage >= 40) return { level: 'Basic', color: 'text-orange-700', bgColor: 'bg-orange-50' };
  return { level: 'Beginner', color: 'text-red-700', bgColor: 'bg-red-50' };
};

const CircularProgress = ({ score, maxScore = 10, size = 100, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let progressColor = '#EF4444';
  if (score >= 7) progressColor = '#22C55E';
  else if (score >= 5) progressColor = '#F59E0B';

  return (
    <div className="relative flex items-center justify-center">
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E5E7EB" strokeWidth={strokeWidth} fill="transparent" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-800">{score}</span>
        <span className="text-sm text-gray-500">/{maxScore}</span>
      </div>
    </div>
  );
};

const StarRating = ({ score, maxScore = 10 }) => {
  const starRating = Math.round((score / maxScore) * 5);
  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          key={index}
          className={`w-5 h-5 ${index < starRating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-2 text-sm font-medium text-gray-600">({score}/{maxScore})</span>
    </div>
  );
};

const AIRatingReason = ({ aiComment }) => {
  const aiRatingReason = aiComment?.aiRatingReason;
  const origin = aiComment?.responseOrigin;
  const hasTopics = aiRatingReason?.topicsAddressed?.length > 0 || aiRatingReason?.topicsOverlooked?.length > 0;

  if (!hasTopics && !origin && !aiComment?.text) return null;

  return (
    <div className="bg-[#E5D7F0] border border-[#9B72CF] rounded-lg px-6 py-3 mt-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="flex items-center text-base font-semibold text-[#7A4CAD]">
          <Sparkles className="w-5 h-5 mr-2 text-[#7A4CAD]" />
          AI Analysis
        </h4>
        {origin && <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getOriginBadge(origin)}`}>{origin}</span>}
      </div>

      {aiRatingReason?.topicsAddressed?.length > 0 && (
        <div className="mb-3">
          <p className="font-semibold text-[#7A4CAD] text-sm mb-1">Topics addressed:</p>
          <ul className="list-disc list-inside text-[#7A4CAD] space-y-0.5 text-sm">
            {aiRatingReason.topicsAddressed.map((topic, index) => (
              <li key={index} className="leading-relaxed">{topic}</li>
            ))}
          </ul>
        </div>
      )}
      {aiRatingReason?.topicsOverlooked?.length > 0 && (
        <div>
          <p className="font-semibold text-[#7A4CAD] text-sm mb-1">Topics overlooked:</p>
          <ul className="list-disc list-inside text-[#7A4CAD] space-y-0.5 text-sm">
            {aiRatingReason.topicsOverlooked.map((topic, index) => (
              <li key={index} className="leading-relaxed">{topic}</li>
            ))}
          </ul>
        </div>
      )}
      {aiComment?.text && !hasTopics && !origin && <p className="text-[#7A4CAD] text-sm leading-relaxed">{aiComment.text}</p>}
    </div>
  );
};

const CodingAIRatingReason = ({ reason, submissionOrigin }) => {
  const hasContent = reason?.approach || reason?.correctness || reason?.efficiency || reason?.improvement;
  if (!hasContent && !submissionOrigin) return null;

  const sections = [
    { title: 'Approach Analysis', content: reason?.approach, Icon: Sparkles },
    { title: 'Correctness & Edge Cases', content: reason?.correctness, Icon: CheckCircle2 },
    { title: 'Efficiency (Time & Space)', content: reason?.efficiency, Icon: Info },
    { title: 'Suggested Improvements', content: reason?.improvement, Icon: GraduationCap },
  ];

  return (
    <div className="bg-[#E5D7F0] border border-[#9B72CF] rounded-lg p-4 mt-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="flex items-center text-base font-semibold text-[#7A4CAD]">
          <Code2 className="w-6 h-6 mr-2 text-[#7A4CAD]" />
          AI Code Analysis
        </h5>
        {submissionOrigin && <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getOriginBadge(submissionOrigin)}`}>{submissionOrigin}</span>}
      </div>
      {hasContent ? (
        <div className="space-y-3">
          {sections.map(({ title, content, Icon }) => content ? (
            <div key={title}>
              <p className="flex items-center font-semibold text-[#7A4CAD] text-sm mb-1">
                <Icon className="w-5 h-5 mr-2 text-[#7A4CAD]" />
                {title}:
              </p>
              <p className="text-[#7A4CAD] text-sm leading-relaxed ml-7">{content}</p>
            </div>
          ) : null)}
        </div>
      ) : (
        <p className="text-[#7A4CAD] text-sm leading-relaxed ml-7">Analysis origin noted, but no specific code analysis provided.</p>
      )}
    </div>
  );
};

const buildReportViewModel = (raw, candidateNameParam, positionTitleParam, candidateId) => {
  const data = normalizeReportData(raw);
  if (!data) return null;

  const generalQuestions = toArray(data?.screeningQuestions?.generalQuestions);
  const specificQuestions = toArray(data?.screeningQuestions?.specificQuestions);
  const codingData = toArray(data?.codingQuestionSets);
  const aptitudeData = data?.aptitudeAssessment || { questions: [] };
  const assessmentSummary = data?.assessmentSummary || {};

  const interviewData = {
    categories: {
      generalQuestion: {
        conversationSets: generalQuestions.map((item) => ({
          conversations: [
            { type: 'question', speaker: 'KareerBot', text: item.question },
            { type: 'answer', speaker: 'Candidate', text: item.candidateAnswer || 'No response recorded.', aiComment: item.aiComment || null },
          ],
        })),
      },
      positionSpecificQuestion: {
        conversationSets: specificQuestions.map((item) => ({
          conversations: [
            { type: 'question', speaker: 'KareerBot', text: item.question },
            { type: 'answer', speaker: 'Candidate', text: item.candidateAnswer || 'No response recorded.', aiComment: item.aiComment || null },
          ],
        })),
      },
    },
    proctoringLogs: toArray(data?.proctoringLogs),
    proctoringScreenshots: {
      calibration: toArray(data?.proctoringScreenshots?.calibration),
      noFace: toArray(data?.proctoringScreenshots?.noFace),
      multipleFaces: toArray(data?.proctoringScreenshots?.multipleFaces),
      allDirection: toArray(data?.proctoringScreenshots?.allDirection),
    },
    screenshots: toArray(data?.screenshots),
    deviceScreenshots: toArray(data?.deviceScreenshots),
    roundTimings: toArray(data?.roundTimings),
  };

  const roundScores = data?.softSkills?.roundScores || {};
  const round1Assigned = getAssessmentSummaryFlag(assessmentSummary, 'round1Assigned', Boolean(data?.generalScreeningStatus));
  const round2Assigned = getAssessmentSummaryFlag(assessmentSummary, 'round2Assigned', Boolean(data?.positionSpecificScreeningStatus));
  const round3Assigned = getAssessmentSummaryFlag(assessmentSummary, 'round3Assigned', Boolean(data?.codingScreeningStatus));
  const round4Assigned = getAssessmentSummaryFlag(assessmentSummary, 'round4Assigned', Boolean(data?.aptitudeScreeningStatus));
  const roundAssignments = [
    {
      roundKey: 'round1',
      title: getRoundTitle('round1'),
      assigned: round1Assigned,
      score: data?.generalScreeningScore ?? 0,
      totalMarks: roundScores?.general?.totalMarks ?? 10,
      timeTaken: interviewData.roundTimings.find((item) => item?.roundKey === 'round1')?.timeTaken ?? null,
    },
    {
      roundKey: 'round2',
      title: getRoundTitle('round2'),
      assigned: round2Assigned,
      score: data?.positionSpecificScreeningScore ?? 0,
      totalMarks: roundScores?.position?.totalMarks ?? 80,
      timeTaken: interviewData.roundTimings.find((item) => item?.roundKey === 'round2')?.timeTaken ?? null,
    },
    {
      roundKey: 'round3',
      title: getRoundTitle('round3'),
      assigned: round3Assigned,
      score: data?.codingScreeningScore ?? 0,
      totalMarks: roundScores?.coding?.totalMarks ?? 0,
      timeTaken: interviewData.roundTimings.find((item) => item?.roundKey === 'round3')?.timeTaken ?? null,
    },
    {
      roundKey: 'round4',
      title: getRoundTitle('round4'),
      assigned: round4Assigned,
      score: data?.aptitudeScreeningScore ?? 0,
      totalMarks: roundScores?.aptitude?.totalMarks ?? 10,
      timeTaken: interviewData.roundTimings.find((item) => item?.roundKey === 'round4')?.timeTaken ?? null,
    },
  ];

  const sectionScoresDetailed = data?.section_scores_detailed || {
    general: { status: round1Assigned, percentage: data?.generalScreeningScore || 0, total: roundScores?.general?.totalMarks ?? 10 },
    aptitude: { status: round4Assigned, percentage: data?.aptitudeScreeningScore || 0, total: roundScores?.aptitude?.totalMarks ?? 10 },
    coding: { status: round3Assigned, percentage: data?.codingScreeningScore || 0, total: roundScores?.coding?.totalMarks ?? 10 },
    positionSpecific: { status: round2Assigned, percentage: data?.positionSpecificScreeningScore || 0, total: roundScores?.position?.totalMarks ?? 80 },
  };

  const evaluationData = {
    totalScore: data?.totalScore ?? data?.overallMarks ?? 0,
    overallScore: data?.overallMarks ?? 0,
    overallRating: data?.overallRating || recommendationToRating(data?.recommendationStatus),
    contentOriginality: data?.contentOriginality || {
      breakdown: {
        aiGenerated: data?.aiGeneratedPercentage ?? 0,
        humanWritten: data?.humanWrittenPercentage ?? 0,
      },
    },
    skillRatings: toArray(data?.mandatorySkills).map((skill) => ({
      skill: skill?.skill,
      aiSuggested: skill?.aiRating ?? 0,
      total: 10,
      aiComment: skill?.aiComment || '',
    })),
    softSkills: toArray(data?.softSkills?.skills).map((skill) => ({
      skill: skill?.skill,
      score: skill?.score ?? 0,
      maxMarks: skill?.maxMarks || 10,
    })),
    finalRemarks: [
      ...toArray(data?.generalRemarks),
      ...toArray(data?.conclusion),
    ].filter(Boolean),
    sectionAnalysis: data?.sectionAnalysis || {
      general: data?.sectionWiseAnalysis?.general || null,
      position: data?.sectionWiseAnalysis?.position || null,
      coding: data?.sectionWiseAnalysis?.coding || null,
    },
    section_scores_detailed: sectionScoresDetailed,
    generalScreeningStatus: round1Assigned,
    positionSpecificScreeningStatus: round2Assigned,
    codingScreeningStatus: round3Assigned,
    aptitudeScreeningStatus: round4Assigned,
    resumeSummaryBullets: toArray(data?.resumeSummaryPoints),
  };

  const candidateInfo = {
    name: data?.candidateName || candidateNameParam || 'N/A',
    candidateCode: data?.candidateCode || candidateId || 'N/A',
    positionTitle: data?.jobTitle || data?.positionName || positionTitleParam || 'N/A',
    company: data?.companyName || 'N/A',
    email: data?.email || 'N/A',
    mobileNumber: data?.phone || 'N/A',
    profilePicture: data?.profilePicture || null,
    resumeSummary: data?.resumeSummary || '',
  };

  return {
    raw: data,
    report: evaluationData,
    evaluationData,
    candidateInfo,
    interviewData,
    codingData,
    aptitudeData,
    roundAssignments,
  };
};

const CandidateAvatar = ({ candidateInfo }) => {
  const name = candidateInfo?.name || 'Candidate';
  if (candidateInfo?.profilePicture) {
    return (
      <img
        src={candidateInfo.profilePicture}
        alt={name}
        className="w-[160px] h-[160px] object-cover rounded-full shadow-lg border-4 border-white"
      />
    );
  }

  const initials = name.split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-[160px] h-[160px] bg-gray-200 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
      <span className="text-4xl font-bold text-gray-600">{initials || 'NA'}</span>
    </div>
  );
};

const CandidateReport = () => {
  const navigate = useNavigate();
  const { candidateId = '' } = useParams();
  const [searchParams] = useSearchParams();

  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const isCancelledRef = useRef(false);

  const positionId = (searchParams.get('positionId') || '').trim();
  const clientId = (searchParams.get('clientId') || '').trim();
  const candidateNameParam = (searchParams.get('candidateName') || '').trim();
  const positionTitleParam = (searchParams.get('positionTitle') || '').trim();
  const reportCacheKey = `candidate-report:${positionId}:${candidateId}`;

  const loadReport = useCallback(async () => {
    if (!candidateId || !positionId) {
      setError('Missing candidate or position reference.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const cached = sessionStorage.getItem(reportCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setReportData(parsed);
        hydrateSignedScreenshotAssets(parsed, {
          candidateId,
          positionId,
          clientId,
        }).then((hydratedCached) => {
          if (!isCancelledRef.current) {
            setReportData(hydratedCached);
          }
        }).catch(() => {});
        // Keep cached view for quick paint, but always refresh from API
        // so newly generated report content (e.g. round transcripts) is not stale.
      }

      const requestKey = `${positionId}:${candidateId}:${clientId}`;
      // Single API call with in-flight dedupe for same report key.
      const res = await fetchReportWithDedupe(requestKey, () =>
        gatewayApi.get(`/report/get/${positionId}/${candidateId}`, {
          params: {
            ...(clientId ? { clientId } : {}),
          },
          validateStatus: () => true,
          timeout: 30 * 1000,
        })
      );

      if (isCancelledRef.current) return;

      if (res.status === 200) {
        const vm = buildReportViewModel(res.data?.data || null, candidateNameParam, positionTitleParam, candidateId);
        const hydratedVm = await hydrateSignedScreenshotAssets(vm, {
          candidateId,
          positionId,
          clientId,
        });
        if (isCancelledRef.current) return;
        setReportData(hydratedVm);
        sessionStorage.setItem(reportCacheKey, JSON.stringify(hydratedVm));
        return;
      }

      if (res.status === 202) {
        setError(res.data?.message || 'Report generation is in progress. Please retry in a moment.');
        return;
      }

      if (res.status === 404) {
        setError(res.data?.message || 'Report not found for this candidate and position.');
        return;
      }

      setError(res.data?.message || 'Unable to load report.');
    } catch (err) {
      if (!isCancelledRef.current) {
        setError(err.message || 'Network error.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [candidateId, positionId, clientId, candidateNameParam, positionTitleParam, reportCacheKey]);

  useEffect(() => {
    isCancelledRef.current = false;
    loadReport();
    return () => {
      isCancelledRef.current = true;
    };
  }, [loadReport]);

  useEffect(() => {
    const printStyles = `
      <style id="candidate-report-print-styles">
        @media print {
          @page {
            margin: 0.5in;
            size: A4;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      </style>
    `;

    const existingStyles = document.getElementById('candidate-report-print-styles');
    if (existingStyles) existingStyles.remove();
    document.head.insertAdjacentHTML('beforeend', printStyles);

    return () => {
      const styles = document.getElementById('candidate-report-print-styles');
      if (styles) styles.remove();
    };
  }, []);

  if (!candidateId || !positionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-lg shadow-md border border-gray-200">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Missing Report Parameters</h2>
          <p className="text-gray-600 mb-4">Please navigate to the report from the candidate list to view details.</p>
          <button onClick={() => navigate('/candidates')} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
            Back to Candidates
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center text-gray-600">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg">Loading report data...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching generated report, this should be quick.</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-lg shadow-md border border-gray-200 max-w-md w-full">
          <XCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Report Not Available</h2>
          <p className="text-gray-600 mb-4">{error || 'The report is currently being prepared. This may take a few moments to complete.'}</p>
          <button onClick={loadReport} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
            Check Again
          </button>
        </div>
      </div>
    );
  }

  const { report, evaluationData, candidateInfo, interviewData, codingData, aptitudeData, roundAssignments } = reportData;

  const generalQuestionsForDisplay = toArray(interviewData?.categories?.generalQuestion?.conversationSets);
  const specificQuestionsForDisplay = toArray(interviewData?.categories?.positionSpecificQuestion?.conversationSets);
  const filteredSectionScores = Object.entries(report?.section_scores_detailed || {}).filter(([, section]) => section?.status === true);
  const hasSectionScoresToDisplay = filteredSectionScores.length > 0 || report?.totalScore !== undefined;

  const originalityBreakdownData = report?.contentOriginality?.breakdown
    ? [
        { label: 'AI-generated', value: report.contentOriginality.breakdown.aiGenerated, barColor: '#f97316' },
        { label: 'Human-written', value: report.contentOriginality.breakdown.humanWritten, barColor: '#CFFDBC' },
      ].filter((item) => item.value !== undefined && item.value !== null)
    : [];

  const sectionNames = {
    general: 'General',
    aptitude: 'Aptitude',
    coding: 'Coding',
    positionSpecific: 'Position Specific',
  };

  const proctoringScreenshots = interviewData?.proctoringScreenshots || {};
  const noFaceShots = toArray(proctoringScreenshots?.noFace).slice(0, 4);
  const multipleFaceShots = toArray(proctoringScreenshots?.multipleFaces).slice(0, 4);
  const allDirectionShots = toArray(proctoringScreenshots?.allDirection).slice(0, 4);
  const hasProctoringScreenshotGallery = noFaceShots.length > 0 || multipleFaceShots.length > 0 || allDirectionShots.length > 0;

  return (
    <div className="min-h-screen bg-white font-sans text-[#111827]">
      <div className="bg-gradient-to-r from-[#1A2C5A] to-[#2B4F91] text-white pt-6 pb-2 px-8 relative h-[250px]">
        <div className="absolute top-8 left-20 flex items-center space-x-2">
          <span className="text-xl font-bold">KareerGrowth</span>
          <span className="text-xs font-light text-[#8E9CC3]">TECH DRIVEN HIRING SOLUTION</span>
        </div>

        <div className="flex items-center justify-between w-full h-full pt-16">
          <div className="flex-shrink-0 ml-4">
            <CandidateAvatar candidateInfo={candidateInfo} />
          </div>

          <div className="flex-grow text-white flex flex-col justify-start items-start ml-8">
            <div className="text-sm text-[#8E9CC3] mb-1">{candidateInfo?.candidateCode || 'N/A'}</div>
            <h1 className="text-2xl font-bold">
              {candidateInfo?.name || 'N/A'} - {candidateInfo?.positionTitle || 'N/A'}
            </h1>
            <div className="text-sm mt-1">Company: {candidateInfo?.company || 'N/A'}</div>
            <div className="text-sm mt-1">{candidateInfo?.email || 'N/A'} | {candidateInfo?.mobileNumber || 'N/A'}</div>
          </div>

          {report?.overallRating && report.overallRating !== 'N/A' && (
            <div className={`px-6 py-3 rounded-lg border-2 ${getRatingBadge(report.overallRating)} font-bold text-base shadow-lg flex-shrink-0 mr-8`}>
              {report.overallRating}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-[#111827] mb-6 flex items-center">
            <Layers3 className="w-6 h-6 mr-2 text-[#2B4F91]" />
            Assigned Rounds
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {roundAssignments.map((round) => (
              <div key={round.roundKey} className={`rounded-xl border p-5 shadow-sm ${round.assigned ? 'bg-white border-[#E5E7EB]' : 'bg-[#F9FAFB] border-[#E5E7EB] opacity-70'}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">{round.roundKey.toUpperCase()}</p>
                    <h3 className="text-base font-semibold text-[#111827] mt-1">{round.title}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${round.assigned ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#F3F4F6] text-[#4B5563]'}`}>
                    {round.assigned ? 'Assigned' : 'Not Assigned'}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-[#374151]">
                  <div className="flex justify-between gap-3">
                    <span>Score</span>
                    <span className="font-semibold text-[#111827]">{round.assigned ? `${round.score}/${round.totalMarks || 0}` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Time Taken</span>
                    <span className="font-semibold text-[#111827]">{round.assigned ? `${round.timeTaken ?? 0} min` : 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-[#111827] mb-6 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-[#2B4F91]" />
            Report Summary
          </h2>
          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div className="p-8 space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-[#111827] mb-4">Resume Summary</h3>
                {candidateInfo?.resumeSummary ? (
                  <ul className="list-disc list-inside text-[#374151] space-y-3">
                    {candidateInfo.resumeSummary
                      .split('\n')
                      .filter((line) => line.trim())
                      .map((line, index) => (
                        <li key={index} className="text-sm leading-relaxed mb-2 last:mb-0">{line.trim()}</li>
                      ))}
                  </ul>
                ) : report?.resumeSummaryBullets?.length > 0 ? (
                  <ul className="list-disc list-inside text-[#374151] space-y-3">
                    {report.resumeSummaryBullets.map((bullet, index) => (
                      <li key={index} className="text-sm leading-relaxed mb-2 last:mb-0">{bullet}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center text-[#4B5563] text-sm">No resume summary available</div>
                )}
              </div>

              {originalityBreakdownData.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-[#111827] mb-4">Response Origin</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {originalityBreakdownData.map((item) => (
                      <div key={item.label} className="bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[#374151]">{item.label}</span>
                          <span className="text-lg font-bold text-[#111827]">{item.value}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded">
                          <div className="h-2 rounded" style={{ width: `${Math.min(Math.max(item.value || 0, 0), 100)}%`, backgroundColor: item.barColor }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[#4B5563] mt-3">
                    Note: These percentages are for reference only to indicate whether responses may be AI-generated or human-written.
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-xl font-semibold text-[#111827] mb-4">Overall Performance Metrics</h3>
                {hasSectionScoresToDisplay ? (
                  <div className="max-w-4xl mx-auto bg-white p-6">
                    {(filteredSectionScores.length > 0 || report.totalScore !== undefined) && (
                      <div className="flex justify-center text-xs text-[#6B7280] mb-6 font-normal gap-6">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#3B82F6' }}></span>
                          <span>Section Marks</span>
                        </div>
                        {report.totalScore !== undefined && (
                          <div className="flex items-center">
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#22C55E' }}></span>
                            <span>Overall Marks</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-evenly items-end h-40 relative px-8">
                      {filteredSectionScores.map(([key, section]) => {
                        const scoredMarks = section?.percentage || 0;
                        const totalMarks = section?.total || 0;
                        const barPercentage = totalMarks > 0 ? (scoredMarks / totalMarks) * 100 : 0;
                        return (
                          <div key={key} className="flex flex-col items-center h-full justify-end text-center">
                            <span className="text-sm font-semibold text-[#6B7280] mb-2">{Math.round(scoredMarks)}</span>
                            <div className="relative w-16 h-32 bg-[#D1D5DB] rounded-t-md border border-gray-300" style={{ height: '120px' }}>
                              <div className="absolute bottom-0 w-full bg-[#3B82F6] rounded-t-md transition-all duration-700 ease-in-out border-t border-blue-600" style={{ height: `${barPercentage || 0}%` }}></div>
                            </div>
                            <span className="text-xs text-[#6B7280] mt-3 min-w-[80px] text-center leading-tight whitespace-nowrap">{sectionNames[key] || key}</span>
                            <span className="text-xs text-[#6B7280] mt-1 min-w-[80px] text-center leading-tight whitespace-nowrap">Total: {totalMarks}</span>
                          </div>
                        );
                      })}

                      {report.totalScore !== undefined && (
                        <div className="flex flex-col items-center h-full justify-end text-center">
                          <span className="text-sm font-semibold text-[#6B7280] mb-2">{Math.round(report.totalScore)}</span>
                          <div className="relative w-16 h-32 bg-[#D1D5DB] rounded-t-md border border-gray-300" style={{ height: '120px' }}>
                            <div className="absolute bottom-0 w-full bg-[#22C55E] rounded-t-md transition-all duration-700 ease-in-out border-t border-green-600" style={{ height: `${report.totalScore || 0}%` }}></div>
                          </div>
                          <span className="text-xs text-[#6B7280] mt-3 min-w-[80px] text-center leading-tight whitespace-nowrap">Overall</span>
                          <span className="text-xs text-[#6B7280] mt-1 min-w-[80px] text-center leading-tight whitespace-nowrap">Total: 100</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[#4B5563] text-sm mt-4">No overall performance metrics available.</div>
                )}
              </div>

              {(report?.skillRatings?.length > 0 || report?.softSkills?.length > 0) && (
                <div>
                  <h3 className="text-xl font-semibold text-[#111827] mb-4">Skills Assessment</h3>

                  {report?.softSkills?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-[#111827] mb-6">Skills</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {report.softSkills.map((skill, index) => {
                          const performanceData = getPerformanceLabel(skill.score, skill.maxMarks || 10);
                          return (
                            <div key={`${skill.skill}-${index}`} className="flex flex-col items-center text-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105">
                              <div className="mb-4 flex-shrink-0">
                                <CircularProgress score={skill.score} maxScore={skill.maxMarks || 10} size={100} strokeWidth={8} />
                              </div>
                              <h5 className="font-semibold text-[#111827] text-sm mb-3 leading-tight text-center min-h-[40px] flex items-center justify-center">{skill.skill}</h5>
                              <span className={`px-4 py-2 rounded-full text-xs font-medium ${performanceData.bgColor} ${performanceData.textColor} text-center w-full max-w-[120px]`}>
                                {performanceData.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {report?.skillRatings?.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-[#111827] mb-6">Technical Skills</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {report.skillRatings.map((skill, index) => {
                          const skillLevel = getSkillLevel(skill.aiSuggested || 0, skill.total || 10);
                          return (
                            <div key={`${skill.skill}-${index}`} className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full translate-x-10 -translate-y-10 opacity-60"></div>
                              <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex-1">
                                    <h5 className="font-bold text-[#111827] text-lg mb-2">{skill.skill}</h5>
                                    <StarRating score={skill.aiSuggested || 0} maxScore={skill.total || 10} />
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${skillLevel.bgColor} ${skillLevel.color} ml-4`}>
                                    {skillLevel.level}
                                  </div>
                                </div>

                                <div className="mb-4">
                                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Proficiency</span>
                                    <span>{Math.round(((skill.aiSuggested || 0) / (skill.total || 10)) * 100)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out" style={{ width: `${Math.min(((skill.aiSuggested || 0) / (skill.total || 10)) * 100, 100)}%` }}></div>
                                  </div>
                                </div>

                                {skill.aiComment && (
                                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                                    <div className="flex items-start">
                                      <Info className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                                      <p className="text-xs text-blue-700 leading-relaxed">{skill.aiComment}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {report && ((evaluationData?.generalScreeningStatus && (report?.sectionAnalysis?.general?.strengths?.length > 0 || report?.sectionAnalysis?.general?.concerns?.length > 0)) || (evaluationData?.positionSpecificScreeningStatus && (report?.sectionAnalysis?.position?.strengths?.length > 0 || report?.sectionAnalysis?.position?.concerns?.length > 0)) || (evaluationData?.codingScreeningStatus && (report?.sectionAnalysis?.coding?.strengths?.length > 0 || report?.sectionAnalysis?.coding?.concerns?.length > 0))) && (
          <section>
            <h2 className="text-2xl font-bold text-[#111827] mb-6 flex items-center">
              <Layers3 className="w-6 h-6 mr-2 text-[#2B4F91]" />
              Section-wise Analysis
            </h2>
            <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-md overflow-hidden">
              <div className="p-8 space-y-6">
                {[
                  { key: 'general', title: 'General Questions Analysis', enabled: evaluationData?.generalScreeningStatus },
                  { key: 'position', title: 'Position-Specific Questions Analysis', enabled: evaluationData?.positionSpecificScreeningStatus },
                  { key: 'coding', title: 'Coding Assessment Analysis', enabled: evaluationData?.codingScreeningStatus },
                ].map((section) => {
                  const data = report?.sectionAnalysis?.[section.key];
                  if (!section.enabled || !data) return null;
                  return (
                    <div key={section.key}>
                      <h3 className="text-xl font-semibold text-[#111827] mb-4">{section.title}</h3>
                      {toArray(data?.strengths).length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-lg font-medium text-[#065F46] mb-2">Strengths</h4>
                          <ul className="list-disc list-inside text-[#065F46] space-y-1">
                            {toArray(data.strengths).map((item, index) => <li key={index} className="text-sm leading-relaxed">{item}</li>)}
                          </ul>
                        </div>
                      )}
                      {toArray(data?.concerns).length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-lg font-medium text-[#9A3412] mb-2">Concerns</h4>
                          <ul className="list-disc list-inside text-[#9A3412] space-y-1">
                            {toArray(data.concerns).map((item, index) => <li key={index} className="text-sm leading-relaxed">{item}</li>)}
                          </ul>
                        </div>
                      )}
                      {data?.overallAssessment && (
                        <div className="mb-4">
                          <h4 className="text-lg font-medium text-[#1E40AF] mb-2">Overall Assessment</h4>
                          <p className="text-sm leading-relaxed text-[#1E40AF]">{data.overallAssessment}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {report?.finalRemarks?.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-[#111827] mb-6 flex items-center">
              <CheckCircle2 className="w-6 h-6 mr-2 text-[#2B4F91]" />
              Final Remarks
            </h2>
            <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-md overflow-hidden">
              <div className="p-8 space-y-3">
                {report.finalRemarks.map((remark, index) => (
                  <p key={index} className="text-sm leading-relaxed text-[#374151]">{remark}</p>
                ))}
              </div>
            </div>
          </section>
        )}

        {(evaluationData?.generalScreeningStatus || evaluationData?.positionSpecificScreeningStatus) && (
          <section>
            <h2 className="text-2xl font-bold text-[#111827] mb-6 flex items-center">
              <Info className="w-6 h-6 mr-2 text-[#2B4F91]" />
              Screening Questions
            </h2>

            {evaluationData?.generalScreeningStatus && generalQuestionsForDisplay.length > 0 && (
              <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-md overflow-hidden mb-8">
                <div className="bg-[#1F3769] px-6 py-3 border-b border-[#2B4F91]">
                  <h3 className="text-base font-semibold text-white text-center capitalize">General Questions</h3>
                </div>
                <div className="p-6">
                  {generalQuestionsForDisplay.map((data, index) => (
                    <div key={index} className="mb-6 last:mb-0">
                      <div className="space-y-4">
                        {toArray(data.conversations).map((turn, turnIndex) => (
                          <div key={turnIndex} className="space-y-2">
                            {turn.type === 'question' && (
                              <div className="flex justify-start">
                                <div className="bg-white border border-[#E5E7EB] text-[#111827] p-4 rounded-lg max-w-[85%] shadow-sm">
                                  <div className="flex items-center mb-2">
                                    <img src={logo} alt="KareerBot" className="w-6 h-6 rounded-full object-cover mr-2" />
                                    <span className="font-medium text-sm mr-2 text-[#374151]">{turn.speaker}</span>
                                  </div>
                                  <p className="text-sm leading-relaxed">{turn.text || 'N/A'}</p>
                                </div>
                              </div>
                            )}
                            {turn.type === 'answer' && (
                              <div className="flex justify-end">
                                <div className="bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] p-4 rounded-lg max-w-[85%] shadow-sm">
                                  <div className="flex items-center mb-2 justify-end space-x-2 space-x-reverse">
                                    <span className="font-medium text-sm mr-2 text-[#374151]">{candidateInfo?.name || 'Candidate'}</span>
                                    <div className="w-8 h-8 rounded-full bg-[#1A2C5A] text-white flex items-center justify-center text-xs font-bold">
                                      {(candidateInfo?.name || 'C').charAt(0).toUpperCase()}
                                    </div>
                                  </div>
                                  <p className="text-sm leading-relaxed text-right">{turn.text || 'N/A'}</p>
                                  {turn.aiComment && <AIRatingReason aiComment={turn.aiComment} />}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {evaluationData?.generalScreeningStatus && generalQuestionsForDisplay.length === 0 && (
              <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-md overflow-hidden mb-8">
                <div className="bg-[#1F3769] px-6 py-3 border-b border-[#2B4F91]">
                  <h3 className="text-base font-semibold text-white text-center capitalize">General Questions</h3>
                </div>
                <div className="p-6 text-center text-[#4B5563] text-sm">
                  General round was assigned, but no question-by-question transcript is available in this report payload.
                </div>
              </div>
            )}

            {evaluationData?.positionSpecificScreeningStatus && specificQuestionsForDisplay.length > 0 && (
              <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-md overflow-hidden">
                <div className="bg-[#1F3769] px-6 py-3 border-b border-[#2B4F91]">
                  <h3 className="text-base font-semibold text-white text-center capitalize">Position Specific Questions</h3>
                </div>
                <div className="p-6">
                  {specificQuestionsForDisplay.map((data, index) => (
                    <div key={index} className="mb-6 last:mb-0">
                      <div className="space-y-4">
                        {toArray(data.conversations).map((turn, turnIndex) => (
                          <div key={turnIndex} className="space-y-2">
                            {turn.type === 'question' && (
                              <div className="flex justify-start">
                                <div className="bg-white border border-[#E5E7EB] text-[#111827] p-4 rounded-lg max-w-[85%] shadow-sm">
                                  <div className="flex items-center mb-2">
                                    <img src={logo} alt="KareerBot" className="w-6 h-6 rounded-full object-cover mr-2" />
                                    <span className="font-medium text-sm mr-2 text-[#374151]">{turn.speaker}</span>
                                  </div>
                                  <p className="text-sm leading-relaxed">{turn.text || 'N/A'}</p>
                                </div>
                              </div>
                            )}
                            {turn.type === 'answer' && (
                              <div className="flex justify-end">
                                <div className="bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] p-4 rounded-lg max-w-[85%] shadow-sm">
                                  <div className="flex items-center mb-2 justify-end space-x-2 space-x-reverse">
                                    <span className="font-medium text-sm mr-2 text-[#374151]">{candidateInfo?.name || 'Candidate'}</span>
                                    <div className="w-8 h-8 rounded-full bg-[#1A2C5A] text-white flex items-center justify-center text-xs font-bold">
                                      {(candidateInfo?.name || 'C').charAt(0).toUpperCase()}
                                    </div>
                                  </div>
                                  <p className="text-sm leading-relaxed text-right">{turn.text || 'N/A'}</p>
                                  {turn.aiComment && <AIRatingReason aiComment={turn.aiComment} />}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {evaluationData?.positionSpecificScreeningStatus && specificQuestionsForDisplay.length === 0 && (
              <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-md overflow-hidden">
                <div className="bg-[#1F3769] px-6 py-3 border-b border-[#2B4F91]">
                  <h3 className="text-base font-semibold text-white text-center capitalize">Position Specific Questions</h3>
                </div>
                <div className="p-6 text-center text-[#4B5563] text-sm">
                  Position-specific round was assigned, but no question-by-question transcript is available in this report payload.
                </div>
              </div>
            )}
          </section>
        )}

        {evaluationData?.codingScreeningStatus && (
          <section>
            <h2 className="text-2xl font-bold text-[#111827] mb-6 flex items-center">
              <Code2 className="w-6 h-6 mr-2 text-[#2B4F91]" />
              Coding Assessment
            </h2>
            {codingData.length > 0 ? codingData.map((set, setIndex) => (
              <div key={set.id || setIndex} className="mb-8 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
                <div className="bg-[#1F3769] px-6 py-3 border-b border-[#2B4F91]">
                  <h3 className="text-base font-semibold text-white text-center capitalize">Coding Assessment - Set {setIndex + 1}</h3>
                </div>
                <div className="p-6">
                  {toArray(set.questions).map((question, qIndex) => (
                    <div key={qIndex} className="mb-8 last:mb-0">
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-[#111827] mb-3">{question.questionTitle || 'N/A'}</h4>
                        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4 mb-4">
                          {question.questionDescription && <p className="text-sm text-[#374151] leading-relaxed mb-4">{question.questionDescription}</p>}
                          {question.constraints && question.constraints !== 'string' && (
                            <div className="mb-3">
                              <span className="font-medium text-[#374151] text-sm">Constraints:</span>
                              <div className="bg-white border border-[#D1D5DB] rounded p-3 mt-1">
                                <pre className="text-xs text-[#374151] whitespace-pre-wrap overflow-x-auto">{question.constraints}</pre>
                              </div>
                            </div>
                          )}
                          {(question.timeLimit !== undefined || question.tags.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#4B5563]">
                              <div><span className="font-medium">Time Limit:</span> {question.timeLimit !== undefined ? `${question.timeLimit} minutes` : 'N/A'}</div>
                              {question.tags.length > 0 && <div><span className="font-medium">Tags:</span> {question.tags.join(', ')}</div>}
                            </div>
                          )}
                        </div>

                        {question.sampleInputAndOutput && (question.sampleInputAndOutput.input || question.sampleInputAndOutput.output) && (
                          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4 mb-4">
                            <h5 className="font-medium text-[#1E40AF] mb-3 text-sm">Sample Test Case</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {question.sampleInputAndOutput.input && (
                                <div>
                                  <span className="font-medium text-[#1E40AF] text-xs">Input:</span>
                                  <pre className="bg-white border border-[#BFDBFE] p-2 rounded mt-1 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{question.sampleInputAndOutput.input}</pre>
                                </div>
                              )}
                              {question.sampleInputAndOutput.output && (
                                <div>
                                  <span className="font-medium text-[#1E40AF] text-xs">Expected Output:</span>
                                  <pre className="bg-white border border-[#BFDBFE] p-2 rounded mt-1 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{question.sampleInputAndOutput.output}</pre>
                                </div>
                              )}
                            </div>
                            {question.sampleInputAndOutput.explanation && (
                              <div className="mt-3">
                                <span className="font-medium text-[#1E40AF] text-xs">Explanation:</span>
                                <div className="bg-white border border-[#BFDBFE] rounded p-2 mt-1">
                                  <p className="text-[#3B82F6] text-xs">{question.sampleInputAndOutput.explanation}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {question.submissions?.[0] ? (
                        <div className="bg-[#FDFCE7] border border-[#FEE085] rounded-lg p-4 mb-4">
                          <h5 className="font-medium text-[#854D09] mb-3 text-sm">{candidateInfo?.name || 'Candidate'}'s Solution</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-xs">
                            <div>
                              <span className="font-medium text-[#854D09]">Test Cases:</span>
                              <span className={`ml-2 font-bold ${(question.testCasesPassed || 0) > 0 && question.testCasesPassed === question.totalTestCases ? 'text-[#065F46]' : (question.testCasesPassed || 0) > 0 ? 'text-[#854D09]' : 'text-[#991B1B]'}`}>
                                {question.testCasesPassed ?? 'N/A'}/{question.totalTestCases ?? 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-[#854D09]">Status:</span>
                              <span className="ml-2 font-medium text-[#374151]">{question.executionStatus || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-[#854D09]">Language:</span>
                              <span className="ml-2 text-[#374151]">{question.submissions[0].programmingLanguage || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-[#854D09]">Time Complexity:</span>
                              <span className="ml-2 font-mono text-xs text-[#374151]">{question.submissions[0].timeComplexity || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-[#854D09]">Space Complexity:</span>
                              <span className="ml-2 font-mono text-xs text-[#374151]">{question.submissions[0].spaceComplexity || 'N/A'}</span>
                            </div>
                          </div>

                          {question.submissions[0].sourceCode ? (
                            <div>
                              <h6 className="font-medium text-[#854D09] mb-2 text-sm">Source Code:</h6>
                              <div className="bg-[#1F2937] rounded-lg overflow-hidden">
                                <pre className="text-[#6EE7B7] p-4 text-xs font-mono whitespace-pre-wrap"><code>{question.submissions[0].sourceCode}</code></pre>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-[#4B5563] text-sm mt-4">No source code available.</div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-[#FDFCE7] border border-[#FEE085] rounded-lg p-4 mb-4 text-center text-[#4B5563] text-sm">No submission data available for this question.</div>
                      )}

                      {(question?.aiRatingReason || question?.submissions?.[0]?.submissionOrigin) && (
                        <CodingAIRatingReason reason={question.aiRatingReason} submissionOrigin={question.submissions?.[0]?.submissionOrigin} />
                      )}

                      {question.testCases?.length > 0 ? (
                        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4">
                          <h5 className="font-medium text-[#111827] mb-3 text-sm">Test Cases Results</h5>
                          <div className="space-y-3">
                            {question.testCases.map((testCase, tcIndex) => (
                              <div key={tcIndex} className={`border rounded-lg p-3 ${testCase.isPassed ? 'bg-[#D1FAE5] border-[#A7F3D0]' : 'bg-[#FEF2F2] border-[#FECACA]'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm text-[#111827]">Test Case {tcIndex + 1}</span>
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${testCase.isPassed ? 'bg-[#065F46] text-white' : 'bg-[#991B1B] text-white'}`}>
                                    {testCase.isPassed ? 'PASSED' : 'FAILED'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                    <span className="font-medium text-xs text-[#374151]">Input:</span>
                                    <div className="bg-white border border-[#D1D5DB] rounded p-2 mt-1">
                                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">{testCase.locked ? 'Hidden' : (testCase.input || 'N/A')}</pre>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-xs text-[#374151]">Expected:</span>
                                    <div className="bg-white border border-[#D1D5DB] rounded p-2 mt-1">
                                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">{testCase.locked ? 'Hidden' : (testCase.expectedOutput || 'N/A')}</pre>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-xs text-[#374151]">Actual:</span>
                                    <div className="bg-white border border-[#D1D5DB] rounded p-2 mt-1">
                                      <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">{testCase.locked ? 'Hidden' : (testCase.actualOutput || 'N/A')}</pre>
                                    </div>
                                  </div>
                                </div>
                                {testCase.errorMessage && (
                                  <div className="mt-3">
                                    <span className="font-medium text-[#991B1C] text-xs">Error Message:</span>
                                    <div className="bg-white border border-[#FECACA] rounded p-2 mt-1">
                                      <p className="text-[#991B1C] text-xs whitespace-pre-wrap break-words">{testCase.errorMessage}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4 text-center text-[#4B5563] text-sm mt-4">No test case results available.</div>
                      )}
                    </div>
                  ))}

                  {set.overallAiReview && (
                    <div className="bg-[#E5D7F0] border border-[#9B72CF] rounded-lg p-4 mt-4">
                      <h5 className="flex items-center text-base font-semibold text-[#7A4CAD]">
                        <Sparkles className="w-5 h-5 mr-2 text-[#7A4CAD]" />
                        Overall AI Code Review
                      </h5>
                      <p className="text-[#7A4CAD] text-sm leading-relaxed whitespace-pre-wrap">{set.overallAiReview}</p>
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-md p-6">
                <div className="text-center text-[#4B5563] text-sm mt-4">No coding assessment data available.</div>
              </div>
            )}
          </section>
        )}

        {evaluationData?.aptitudeScreeningStatus && (
          <section>
            <h2 className="text-2xl font-bold text-[#111827] mb-6 flex items-center">
              <GraduationCap className="w-6 h-6 mr-2 text-[#2B4F91]" />
              Aptitude Assessment
            </h2>
            {aptitudeData?.questions?.length > 0 ? (
              <div className="mb-8 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
                <div className="bg-[#1F3769] px-6 py-3 border-b border-[#2B4F91]">
                  <h3 className="text-base font-semibold text-white text-center capitalize">Aptitude Assessment</h3>
                </div>
                <div className="p-6">
                  {aptitudeData.questions.map((question, qIndex) => (
                    <div key={qIndex} className="bg-white border border-[#E5E7EB] rounded-lg p-6 mb-4 last:mb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h4 className="font-semibold text-[#111827]">{qIndex + 1}. {question.question || 'N/A'}</h4>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            !question.candidateAnswer
                              ? 'bg-gray-100 text-gray-600'
                              : question.isCorrect
                                ? 'bg-[#D1FAE5] text-[#065F46]'
                                : 'bg-[#FEF2F2] text-[#991B1B]'
                          }`}
                        >
                          {!question.candidateAnswer ? 'Not Answered' : (question.isCorrect ? 'Correct' : 'Wrong')}
                        </span>
                      </div>
                      {question.options?.length > 0 ? (
                        <div className="space-y-2 mb-4">
                          {question.options.map((option) => {
                            const isSelected = question.candidateAnswer === option.optionKey || question.candidateAnswer === option.text;
                            const isCorrectOption = question.correctAnswer === option.optionKey || question.correctAnswer === option.text;

                            let optionBg = 'bg-white';
                            let optionBorder = 'border-[#E5E7EB]';
                            let optionText = 'text-[#374151]';

                            if (isCorrectOption) {
                              optionBg = 'bg-[#D1FAE5]';
                              optionBorder = 'border-[#A7F3D0]';
                              optionText = 'text-[#065F46]';
                            } else if (isSelected && !isCorrectOption) {
                              optionBg = 'bg-[#FEF2F2]';
                              optionBorder = 'border-[#FECACA]';
                              optionText = 'text-[#991B1B]';
                            }

                            return (
                              <div key={option.optionKey} className={`p-3 rounded-lg border ${optionBg} ${optionBorder}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <span className={`w-6 h-6 bg-white border border-[#D1D5DB] rounded-full flex items-center justify-center text-sm font-bold ${optionText}`}>
                                      {option.optionKey || '?'}
                                    </span>
                                    <span className={`text-sm leading-relaxed ${optionText}`}>{option.text || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                                    {isSelected && (
                                      <span className={`px-2 py-1 text-white text-xs rounded font-medium ${isCorrectOption ? 'bg-[#065F46]' : 'bg-[#991B1B]'}`}>
                                        SELECTED
                                      </span>
                                    )}
                                    {isCorrectOption && (
                                      <span className="flex items-center">
                                        <CheckCircle2 className="w-5 h-5 text-[#065F46]" />
                                        <span className="ml-1 text-xs font-medium text-[#065F46]">CORRECT</span>
                                      </span>
                                    )}
                                    {isSelected && !isCorrectOption && (
                                      <span className="flex items-center">
                                        <XCircle className="w-5 h-5 text-[#991B1B]" />
                                        <span className="ml-1 text-xs font-medium text-[#991B1B]">WRONG</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-[#4B5563] text-sm mt-4">No options available for this question.</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-md p-6">
                <div className="text-center text-[#4B5563] text-sm mt-4">Aptitude round was assigned, but no question data is available in this report payload.</div>
              </div>
            )}
          </section>
        )}

        {hasProctoringScreenshotGallery && (
          <section>
            <h2 className="text-2xl font-bold text-[#111827] mb-6 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-[#2B4F91]" />
              Proctoring Screenshots
            </h2>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-8">
              {noFaceShots.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-[#111827] mb-3">No Face (Top 4)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {noFaceShots.map((url, index) => (
                      <a key={`noface-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="group block">
                        <img src={url} alt={`No Face ${index + 1}`} className="w-full h-36 object-cover rounded-lg border border-[#E5E7EB] group-hover:shadow-md transition" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {multipleFaceShots.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-[#111827] mb-3">Multiple Faces (Top 4)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {multipleFaceShots.map((url, index) => (
                      <a key={`multiple-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="group block">
                        <img src={url} alt={`Multiple Faces ${index + 1}`} className="w-full h-36 object-cover rounded-lg border border-[#E5E7EB] group-hover:shadow-md transition" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {allDirectionShots.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-[#111827] mb-3">All Direction Face (Top 4)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {allDirectionShots.map((url, index) => (
                      <a key={`direction-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="group block">
                        <img src={url} alt={`Direction Face ${index + 1}`} className="w-full h-36 object-cover rounded-lg border border-[#E5E7EB] group-hover:shadow-md transition" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {interviewData?.proctoringLogs?.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-[#111827] mb-6 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-[#2B4F91]" />
              Proctoring Logs
            </h2>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
              <div className="space-y-4">
                {interviewData.proctoringLogs
                  .slice()
                  .sort((a, b) => new Date(a.time) - new Date(b.time))
                  .map((log, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className={`w-3 h-3 mt-1 rounded-full flex-shrink-0 ${log.type === 'success' ? 'bg-[#22C55E]' : log.type === 'warning' ? 'bg-[#F97316]' : log.type === 'info' ? 'bg-[#3B82F6]' : log.type === 'error' ? 'bg-[#EF4444]' : 'bg-gray-400'}`}></div>
                      <span className="text-sm font-medium text-[#111827] whitespace-nowrap">{formatDate(log.time)}</span>
                      <span className="text-sm text-[#4B5563]">{log.message || 'No message'}</span>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] p-8 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-sm text-[#4B5563]">
            <p>Report generated on {formatDate(new Date().toISOString())}</p>
            <p>Candidate: {candidateInfo?.name || 'N/A'} | Email: {candidateInfo?.email || 'N/A'}</p>
          </div>
          <div className="flex space-x-4">
            <button onClick={() => window.print()} className="px-4 py-2 border border-[#D1D5DB] text-[#4B5563] rounded-lg hover:bg-[#F3F4F6] transition text-sm">
              <FileText className="w-4 h-4 inline mr-2" />
              Print Report
            </button>
          </div>
        </div>
      </div>

      <div className="hidden print:block mt-8 pt-4 border-t border-[#E5E7EB]">
        <div className="text-center text-sm text-[#4B5563]">
          <p>Report generated on {formatDate(new Date().toISOString())}</p>
          <p>Candidate: {candidateInfo?.name || 'N/A'} | Email: {candidateInfo?.email || 'N/A'} | Phone: {candidateInfo?.mobileNumber || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};

export default CandidateReport;
