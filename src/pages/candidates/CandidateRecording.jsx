import React, { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const CandidateRecording = () => {
    const { candidateId = '' } = useParams();
    const [searchParams] = useSearchParams();

    const recordingLink = (searchParams.get('recordingLink') || '').trim();
    const candidateName = (searchParams.get('candidateName') || '').trim();
    const positionTitle = (searchParams.get('positionTitle') || '').trim();

    const decodedRecordingLink = useMemo(() => {
        try {
            return decodeURIComponent(recordingLink);
        } catch (_) {
            return recordingLink;
        }
    }, [recordingLink]);

    const isPlayableVideo = useMemo(() => {
        const source = decodedRecordingLink.toLowerCase();
        return source.includes('.mp4') || source.includes('.webm') || source.includes('.ogg') || source.startsWith('blob:');
    }, [decodedRecordingLink]);

    return (
        <div className="min-h-screen bg-slate-50 p-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-7xl mx-auto">
                <h1 className="text-xl font-bold text-slate-800">Candidate Video Recording</h1>
                <p className="text-xs text-slate-500 mt-1">
                    {candidateName || candidateId}
                    {positionTitle ? ` · ${positionTitle}` : ''}
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 min-h-[300px] max-w-7xl mx-auto">
                {!decodedRecordingLink ? (
                    <p className="text-sm text-rose-600">Recording is not available for this candidate.</p>
                ) : (
                    <div className="space-y-3">
                        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                            Recording fetched successfully.
                        </div>

                        {isPlayableVideo ? (
                            <video
                                controls
                                autoPlay={false}
                                className="w-full rounded-lg border border-slate-200 bg-black max-h-[72vh]"
                                src={decodedRecordingLink}
                            >
                                <track kind="captions" />
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <iframe
                                src={decodedRecordingLink}
                                title="Candidate Recording"
                                className="w-full rounded-lg border border-slate-200 min-h-[72vh]"
                            />
                        )}

                        <div>
                            <a
                                href={decodedRecordingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg bg-[#FF6B00] text-white hover:brightness-110"
                            >
                                Open direct recording link
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CandidateRecording;
