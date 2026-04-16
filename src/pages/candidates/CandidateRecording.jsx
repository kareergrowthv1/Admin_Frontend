import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from '../../config/axios';

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractRawGcsUrl(value) {
    if (!value) return '';
    let decoded = value.trim();
    try { decoded = decodeURIComponent(decoded); } catch (_) { /* keep */ }
    return decoded;
}

function isGcsPrivateUrl(url) {
    return url.startsWith('gs://') || url.startsWith('https://storage.googleapis.com/');
}

async function fetchSignedUrl(rawUrl) {
    if (!rawUrl) return null;
    const gcsUrl = extractRawGcsUrl(rawUrl);
    if (!isGcsPrivateUrl(gcsUrl)) return gcsUrl; // already a public/blob URL
    const res = await axios.get('/candidates/recording/signed-url', {
        params: { gcsUrl: encodeURIComponent(gcsUrl) },
    });
    return res.data?.signedUrl ?? null;
}

// Try to find camera_recording_*.mp4 in the same GCS merge/ folder as the screen recording
async function discoverCameraUrl(screenRawUrl) {
    if (!screenRawUrl) return null;
    const gcsUrl = extractRawGcsUrl(screenRawUrl);
    if (!isGcsPrivateUrl(gcsUrl)) return null;
    try {
        const res = await axios.get('/candidates/recording/discover-camera', {
            params: { screenGcsUrl: encodeURIComponent(gcsUrl) },
        });
        return res.data?.signedUrl ?? null;
    } catch (_) {
        return null;
    }
}

// ── RecordingTile ─────────────────────────────────────────────────────────────

const RecordingTile = ({ title, url, loading, error }) => {
    if (loading) {
        return (
            <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/60 text-center">
                <p className="text-sm text-slate-500 animate-pulse">Loading {title}…</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="border border-rose-200 rounded-xl p-6 bg-rose-50/60">
                <p className="text-sm font-semibold text-rose-700">{title}</p>
                <p className="text-xs text-rose-600 mt-1">{error}</p>
            </div>
        );
    }
    if (!url) return null;

    return (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/60">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
                <div className="flex items-center gap-2">
                    <a
                        href={url}
                        download
                        className="inline-flex items-center px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-700"
                    >
                        Download
                    </a>
                </div>
            </div>
            <video
                controls
                autoPlay={false}
                preload="metadata"
                className="w-full rounded-lg border border-slate-200 bg-black max-h-[60vh]"
                key={url}
                src={url}
            >
                <track kind="captions" />
                Your browser does not support the video tag.
            </video>
        </div>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const CandidateRecording = () => {
    const { candidateId = '' } = useParams();
    const [searchParams] = useSearchParams();

    const fallbackRecordingLink = (searchParams.get('recordingLink') || '').trim();
    const screenRaw = (searchParams.get('screenRecordingLink') || '').trim() || fallbackRecordingLink;
    const cameraRaw = (searchParams.get('cameraRecordingLink') || '').trim();
    const candidateName = (searchParams.get('candidateName') || '').trim();
    const positionTitle = (searchParams.get('positionTitle') || '').trim();

    const [screenUrl, setScreenUrl] = useState(null);
    const [cameraUrl, setCameraUrl] = useState(null);
    const [screenLoading, setScreenLoading] = useState(Boolean(screenRaw));
    const [cameraLoading, setCameraLoading] = useState(true); // always attempt camera
    const [screenError, setScreenError] = useState(null);
    const [cameraError, setCameraError] = useState(null);

    useEffect(() => {
        if (!screenRaw) { setScreenLoading(false); return; }
        setScreenLoading(true);
        fetchSignedUrl(screenRaw)
            .then(u => { setScreenUrl(u); })
            .catch(e => setScreenError(e?.response?.data?.message || e.message))
            .finally(() => setScreenLoading(false));
    }, [screenRaw]);

    // Camera: use DB link if present, otherwise auto-discover from GCS merge/ folder
    useEffect(() => {
        setCameraLoading(true);
        if (cameraRaw) {
            // Camera link is in DB — just sign it
            fetchSignedUrl(cameraRaw)
                .then(u => { setCameraUrl(u); })
                .catch(e => setCameraError(e?.response?.data?.message || e.message))
                .finally(() => setCameraLoading(false));
        } else if (screenRaw) {
            // No camera link in DB — scan GCS merge/ folder for camera_recording_*.mp4
            discoverCameraUrl(screenRaw)
                .then(u => { if (u) setCameraUrl(u); })
                .catch(() => { /* silent — no camera recording is fine */ })
                .finally(() => setCameraLoading(false));
        } else {
            setCameraLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screenRaw, cameraRaw]);

    const hasAny = screenRaw || cameraRaw;
    const allDone = !screenLoading && !cameraLoading;

    return (
        <div className="min-h-screen bg-slate-50 p-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-7xl mx-auto">
                <h1 className="text-xl font-bold text-slate-800">Candidate Video Recordings</h1>
                <p className="text-xs text-slate-500 mt-1">
                    {candidateName || candidateId}
                    {positionTitle ? ` · ${positionTitle}` : ''}
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 min-h-[300px] max-w-7xl mx-auto">
                {!hasAny ? (
                    <p className="text-sm text-rose-600">Recording is not available for this candidate.</p>
                ) : (
                    <div className="space-y-4">

                        <div className="grid grid-cols-1 gap-4">
                            {/* Screen recording — always attempt if screenRaw present */}
                            {screenRaw && (
                                <RecordingTile
                                    title="Screen Recording"
                                    url={screenUrl}
                                    loading={screenLoading}
                                    error={screenError}
                                />
                            )}
                            {/* Camera recording — show when loading OR when found (from DB or GCS discovery) */}
                            {(cameraLoading || cameraUrl) && (
                                <RecordingTile
                                    title="Camera Recording"
                                    url={cameraUrl}
                                    loading={cameraLoading}
                                    error={cameraError}
                                />
                            )}
                        </div>
                        {allDone && !screenUrl && !cameraUrl && (
                            <p className="text-sm text-amber-600">Recordings are still processing. Try again in a few minutes.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CandidateRecording;

