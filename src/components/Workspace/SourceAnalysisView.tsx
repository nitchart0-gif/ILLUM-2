import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  Edit2, 
  Save, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Users, 
  Check, 
  ListOrdered, 
  MapPin, 
  TrendingUp, 
  BookOpen, 
  HelpCircle, 
  History, 
  Eye, 
  Plus, 
  Trash2,
  ArrowRight,
  Info
} from 'lucide-react';
import { ProjectRecord, AnalysisRecord, SourceAnalysis, WorkspaceTab } from '../../types/navigation';
import { 
  analyzeSourceStory, 
  regenerateAnalysis, 
  updateAnalysis, 
  approveAnalysis, 
  fetchAnalysis 
} from '../../services/api';

interface SourceAnalysisViewProps {
  project: ProjectRecord;
  onProjectUpdated: (updated: ProjectRecord) => void;
  onNavigateToTab?: (tab: WorkspaceTab) => void;
}

export const SourceAnalysisView: React.FC<SourceAnalysisViewProps> = ({
  project,
  onProjectUpdated,
  onNavigateToTab,
}) => {
  // Current analysis record
  const currentRecord: AnalysisRecord | undefined = project.currentAnalysis;
  const analysisData: SourceAnalysis | undefined = currentRecord?.analysis || project.sourceStory?.analysis || project.sourceAnalysis;

  // Active status
  const currentStatus = project.analysisStatus || (
    currentRecord?.status 
      ? `Analysis ${currentRecord.status}`
      : 'Analysis Pending'
  );

  // Local state for actions and feedback
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<SourceAnalysis | null>(null);

  // Archived version view modal
  const [viewingVersion, setViewingVersion] = useState<AnalysisRecord | null>(null);

  // Synchronize when project or currentRecord changes
  useEffect(() => {
    setIsEditing(false);
    setEditForm(null);
    setFeedbackMessage(null);
    setErrorMessage(null);

    // Fetch latest analysis data and version history if not loaded yet
    if (project.id && (!project.analysisVersions || project.analysisVersions.length === 0)) {
      fetchAnalysis(project.id)
        .then((res) => {
          if (res.success && res.analysisVersions && res.analysisVersions.length > 0) {
            onProjectUpdated({
              ...project,
              currentAnalysis: res.currentAnalysis || project.currentAnalysis,
              analysisVersions: res.analysisVersions,
              analysisStatus: (res.analysisStatus as any) || project.analysisStatus,
            });
          }
        })
        .catch(() => {});
    }
  }, [project.id, currentRecord?.id]);

  // Check if source story has text
  const hasSourceStory = Boolean(project.sourceStory?.text && project.sourceStory.text.trim().length > 0);

  // 1. Action: Analyze Source Story (Initial generation)
  const handleAnalyze = async () => {
    if (!hasSourceStory) {
      setErrorMessage('Original story source is required. Please add and save story material in Tab 1 first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await analyzeSourceStory(project.id);
      onProjectUpdated(response.project);
      setFeedbackMessage(`Source Story Analysis v${response.analysis.version} generated successfully across all 7 dimensions.`);
      setTimeout(() => setFeedbackMessage(null), 4500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Source analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 2. Action: Regenerate Analysis
  const handleRegenerate = async () => {
    if (!hasSourceStory) {
      setErrorMessage('Original story source is required to regenerate analysis.');
      return;
    }

    setIsRegenerating(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await regenerateAnalysis(project.id);
      onProjectUpdated(response.project);
      setIsEditing(false);
      setFeedbackMessage(`New analysis version v${response.currentAnalysis.version} generated and previous version archived.`);
      setTimeout(() => setFeedbackMessage(null), 4500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to regenerate analysis.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // 3. Action: Start Editing Analysis
  const handleStartEditing = () => {
    if (!analysisData) return;
    setEditForm({
      mainSubjectAndCharacters: [...(analysisData.mainSubjectAndCharacters || [])],
      keyFacts: [...(analysisData.keyFacts || [])],
      chronology: [...(analysisData.chronology || [])],
      locationsAndDates: [...(analysisData.locationsAndDates || [])],
      keyDevelopments: [...(analysisData.keyDevelopments || [])],
      narrativeArc: {
        beginning: analysisData.narrativeArc?.beginning || '',
        middle: analysisData.narrativeArc?.middle || '',
        ending: analysisData.narrativeArc?.ending || '',
      },
      missingOrAmbiguous: [...(analysisData.missingOrAmbiguous || [])],
      analyzedAt: analysisData.analyzedAt || new Date().toISOString(),
      sourceWordCount: analysisData.sourceWordCount || 0,
      modelUsed: analysisData.modelUsed,
    });
    setIsEditing(true);
    setErrorMessage(null);
    setFeedbackMessage(null);
  };

  // 4. Action: Cancel Editing
  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
    setErrorMessage(null);
  };

  // 5. Action: Save Changes
  const handleSaveChanges = async () => {
    if (!editForm) return;

    setIsSavingEdits(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      // Clean up string lists (filter empty strings)
      const cleanedPayload: SourceAnalysis = {
        ...editForm,
        mainSubjectAndCharacters: editForm.mainSubjectAndCharacters.map((s) => s.trim()).filter(Boolean),
        keyFacts: editForm.keyFacts.map((s) => s.trim()).filter(Boolean),
        chronology: editForm.chronology.map((s) => s.trim()).filter(Boolean),
        locationsAndDates: editForm.locationsAndDates.map((s) => s.trim()).filter(Boolean),
        keyDevelopments: editForm.keyDevelopments.map((s) => s.trim()).filter(Boolean),
        narrativeArc: {
          beginning: editForm.narrativeArc.beginning.trim(),
          middle: editForm.narrativeArc.middle.trim(),
          ending: editForm.narrativeArc.ending.trim(),
        },
        missingOrAmbiguous: editForm.missingOrAmbiguous.map((s) => s.trim()).filter(Boolean),
      };

      const response = await updateAnalysis(project.id, { analysis: cleanedPayload });
      onProjectUpdated(response.project);
      setIsEditing(false);
      setEditForm(null);
      setFeedbackMessage('Analysis changes saved successfully. Status reset to Needs Review for verification.');
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save analysis changes.');
    } finally {
      setIsSavingEdits(false);
    }
  };

  // 6. Action: Approve Analysis
  const handleApprove = async () => {
    if (!currentRecord) return;

    setIsApproving(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await approveAnalysis(project.id);
      onProjectUpdated(response.project);
      setFeedbackMessage(`Analysis v${response.currentAnalysis.version} approved! Factual grounding verified.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to approve analysis.');
    } finally {
      setIsApproving(false);
    }
  };

  // Helper functions for list manipulation in edit mode
  const updateListItem = (field: keyof Omit<SourceAnalysis, 'narrativeArc' | 'analyzedAt' | 'sourceWordCount' | 'modelUsed'>, index: number, value: string) => {
    if (!editForm) return;
    const list = [...editForm[field]];
    list[index] = value;
    setEditForm({ ...editForm, [field]: list });
  };

  const removeListItem = (field: keyof Omit<SourceAnalysis, 'narrativeArc' | 'analyzedAt' | 'sourceWordCount' | 'modelUsed'>, index: number) => {
    if (!editForm) return;
    const list = editForm[field].filter((_, i) => i !== index);
    setEditForm({ ...editForm, [field]: list });
  };

  const addListItem = (field: keyof Omit<SourceAnalysis, 'narrativeArc' | 'analyzedAt' | 'sourceWordCount' | 'modelUsed'>, defaultValue: string = '') => {
    if (!editForm) return;
    const list = [...editForm[field], defaultValue];
    setEditForm({ ...editForm, [field]: list });
  };

  // Status Badge UI configuration
  const isApproved = currentStatus === 'Analysis Approved';
  const isStale = currentStatus === 'Analysis Stale';
  const isNeedsReview = currentStatus === 'Analysis Needs Review';
  const isPending = currentStatus === 'Analysis Pending' || !currentRecord;

  const versionHistory = project.analysisVersions || [];

  return (
    <div className="space-y-6">
      {/* Feedback & Error Notifications */}
      {feedbackMessage && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-medium">{feedbackMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Notice:</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Status Alert Banner */}
      {isStale && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                Analysis Stale
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The original source story was modified in Tab 1 after this analysis was generated. To ensure zero hallucination, regenerate the analysis for your updated source.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating || !hasSourceStory}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all shrink-0 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Analysis'}</span>
          </button>
        </div>
      )}

      {isNeedsReview && !isStale && (
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-sky-200">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              <strong>Analysis Needs Review:</strong> Inspect the 7 extracted dimensions below. You may edit them to refine details, or click <strong>Approve Analysis</strong> to lock this version.
            </span>
          </div>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isApproving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-sm transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isApproving ? 'Approving...' : 'Approve Now'}</span>
          </button>
        </div>
      )}

      {isApproved && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Analysis Approved:</strong> Grounded factual foundation is verified and locked.
              {currentRecord?.approvedAt && (
                <span className="text-emerald-400/80 ml-1">
                  (Approved on {new Date(currentRecord.approvedAt).toLocaleDateString()} at {new Date(currentRecord.approvedAt).toLocaleTimeString()})
                </span>
              )}
            </span>
          </div>
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('script')}
              className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer shrink-0"
            >
              <span>Proceed to Skill 1 — Script</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Header Card with Controls */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>Skill 0 — Source Story Analysis</span>
              </h2>

              {/* Status Badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                isApproved
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : isStale
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : isNeedsReview
                  ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {isStale && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                {isNeedsReview && <Clock className="w-3 h-3 text-sky-400" />}
                {isPending && <Clock className="w-3 h-3 text-amber-400" />}
                <span>{currentStatus}</span>
              </span>

              {currentRecord && (
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  v{currentRecord.version}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Structured extraction across 7 core analytical dimensions grounded strictly in your source material.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  disabled={isSavingEdits}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isSavingEdits}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingEdits ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </>
            ) : (
              <>
                {/* Analyze button (if pending) */}
                {isPending && (
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !hasSourceStory}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    <span>{isAnalyzing ? 'Analyzing Source...' : 'Analyze Source Story'}</span>
                  </button>
                )}

                {/* Regenerate button (if analysis exists) */}
                {!isPending && (
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={isRegenerating || !hasSourceStory}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                    title="Regenerate analysis and archive current version"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                    <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Analysis'}</span>
                  </button>
                )}

                {/* Edit Analysis button */}
                {!isPending && (
                  <button
                    type="button"
                    onClick={handleStartEditing}
                    disabled={isAnalyzing || isRegenerating}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Edit Analysis</span>
                  </button>
                )}

                {/* Approve Analysis button */}
                {!isPending && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproving || isApproved || isStale}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                      isApproved
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default'
                        : isStale
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 opacity-50 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    }`}
                    title={isStale ? 'Cannot approve stale analysis. Please regenerate.' : isApproved ? 'Already approved' : 'Approve analysis'}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isApproved ? 'Approved' : isApproving ? 'Approving...' : 'Approve Analysis'}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Metadata sub-bar (when record exists) */}
        {currentRecord && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
            <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              Version: <strong className="text-slate-200">v{currentRecord.version}</strong>
            </span>
            <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              Source Version: <strong className="text-slate-200">v{currentRecord.sourceVersion || 1}</strong>
            </span>
            {currentRecord.sourceFingerprint && (
              <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-[11px] font-mono">
                Fingerprint: <span className="text-indigo-400">{currentRecord.sourceFingerprint.substring(0, 10)}…</span>
              </span>
            )}
            <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              Created: <strong className="text-slate-300">{new Date(currentRecord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
            </span>
            {currentRecord.modelUsed && (
              <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-[11px]">
                Model: <strong className="text-indigo-400">{currentRecord.modelUsed}</strong>
              </span>
            )}
            {analysisData?.sourceWordCount !== undefined && (
              <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                Source Words: <strong className="text-slate-200">{analysisData.sourceWordCount}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Empty / Pending State */}
      {isPending && !isAnalyzing && (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-slate-200">No Analysis Generated Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Skill 0 pre-analyzes your raw source material and extracts structured facts across 7 dimensions (characters, key facts, chronology, locations & dates, key developments, narrative arc, and missing details) with a zero-hallucination guardrail.
            </p>
          </div>
          {hasSourceStory ? (
            <button
              type="button"
              onClick={handleAnalyze}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Analyze Source Story Now</span>
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-amber-400 font-medium">
                Please enter or paste your source story in Tab 1 before running analysis.
              </p>
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('source')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Go to Tab 1 (Source Story)</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading Spinner for Generation */}
      {isAnalyzing && (
        <div className="bg-slate-900/60 border border-indigo-500/30 rounded-2xl p-12 text-center space-y-3">
          <RotateCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">Analyzing Source Story with AI...</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Extracting characters, chronological events, verified facts, and narrative structure. Enforcing zero hallucination.
          </p>
        </div>
      )}

      {/* The 7 Dimensions Display / Editor */}
      {!isPending && analysisData && !isAnalyzing && (
        <div className="space-y-5">
          {isEditing && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>Editing Mode:</strong> Modify any of the 7 dimensions below. Saving changes will reset status to Needs Review.</span>
              </span>
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSavingEdits}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs cursor-pointer"
              >
                {isSavingEdits ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Main Subject and Characters */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>1. Main Subject and Characters</span>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => addListItem('mainSubjectAndCharacters', '')}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Entity</span>
                  </button>
                )}
              </div>

              {isEditing && editForm ? (
                <div className="space-y-2 flex-1">
                  {editForm.mainSubjectAndCharacters.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateListItem('mainSubjectAndCharacters', idx, e.target.value)}
                        placeholder="Character or main subject name..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeListItem('mainSubjectAndCharacters', idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editForm.mainSubjectAndCharacters.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No characters added yet. Click &quot;Add Entity&quot; above.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 flex-1">
                  {analysisData.mainSubjectAndCharacters && analysisData.mainSubjectAndCharacters.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                      {analysisData.mainSubjectAndCharacters.map((c, i) => (
                        <li key={i} className="leading-relaxed">
                          <span className="text-slate-100 font-medium">{c}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">None identified in source material.</p>
                  )}
                </div>
              )}
            </div>

            {/* 2. Key Facts */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>2. Key Facts</span>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => addListItem('keyFacts', '')}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Fact</span>
                  </button>
                )}
              </div>

              {isEditing && editForm ? (
                <div className="space-y-2 flex-1">
                  {editForm.keyFacts.map((fact, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={fact}
                        onChange={(e) => updateListItem('keyFacts', idx, e.target.value)}
                        placeholder="Verified fact..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeListItem('keyFacts', idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editForm.keyFacts.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No facts added. Click &quot;Add Fact&quot; above.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 flex-1">
                  {analysisData.keyFacts && analysisData.keyFacts.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                      {analysisData.keyFacts.map((fact, i) => (
                        <li key={i} className="leading-relaxed">
                          <span className="text-slate-200">{fact}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No facts extracted from source.</p>
                  )}
                </div>
              )}
            </div>

            {/* 3. Chronology */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
                  <ListOrdered className="w-4 h-4 text-indigo-400" />
                  <span>3. Chronology</span>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => addListItem('chronology', '')}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Event</span>
                  </button>
                )}
              </div>

              {isEditing && editForm ? (
                <div className="space-y-2 flex-1">
                  {editForm.chronology.map((event, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500 w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        value={event}
                        onChange={(e) => updateListItem('chronology', idx, e.target.value)}
                        placeholder="Chronological event..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeListItem('chronology', idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editForm.chronology.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No chronology events added.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 flex-1">
                  {analysisData.chronology && analysisData.chronology.length > 0 ? (
                    <ol className="space-y-1.5 text-xs text-slate-300 list-decimal list-inside">
                      {analysisData.chronology.map((ev, i) => (
                        <li key={i} className="leading-relaxed">
                          <span className="text-slate-200">{ev}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No chronological events extracted.</p>
                  )}
                </div>
              )}
            </div>

            {/* 4. Locations and Dates */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span>4. Locations and Dates</span>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => addListItem('locationsAndDates', '')}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                )}
              </div>

              {isEditing && editForm ? (
                <div className="space-y-2 flex-1">
                  {editForm.locationsAndDates.map((loc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={loc}
                        onChange={(e) => updateListItem('locationsAndDates', idx, e.target.value)}
                        placeholder="Location or date reference..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeListItem('locationsAndDates', idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editForm.locationsAndDates.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No locations or dates added.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 flex-1">
                  {analysisData.locationsAndDates && analysisData.locationsAndDates.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                      {analysisData.locationsAndDates.map((item, i) => (
                        <li key={i} className="leading-relaxed">
                          <span className="text-slate-200">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No locations or dates specified in source.</p>
                  )}
                </div>
              )}
            </div>

            {/* 5. Key Developments */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col md:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span>5. Key Developments</span>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => addListItem('keyDevelopments', '')}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Development</span>
                  </button>
                )}
              </div>

              {isEditing && editForm ? (
                <div className="space-y-2">
                  {editForm.keyDevelopments.map((dev, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={dev}
                        onChange={(e) => updateListItem('keyDevelopments', idx, e.target.value)}
                        placeholder="Key turning point or discovery..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeListItem('keyDevelopments', idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editForm.keyDevelopments.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No key developments recorded.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {analysisData.keyDevelopments && analysisData.keyDevelopments.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                      {analysisData.keyDevelopments.map((dev, i) => (
                        <li key={i} className="leading-relaxed">
                          <span className="text-slate-200">{dev}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No key developments extracted.</p>
                  )}
                </div>
              )}
            </div>

            {/* 6. Narrative Arc */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 md:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>6. Narrative Arc</span>
                </div>
                <span className="text-[11px] text-slate-500">Beginning • Middle • Ending</span>
              </div>

              {isEditing && editForm ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                      Beginning (Hook / Exposition)
                    </label>
                    <textarea
                      rows={4}
                      value={editForm.narrativeArc.beginning}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        narrativeArc: { ...editForm.narrativeArc, beginning: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                      Middle (Conflict / Progression)
                    </label>
                    <textarea
                      rows={4}
                      value={editForm.narrativeArc.middle}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        narrativeArc: { ...editForm.narrativeArc, middle: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Ending (Resolution / Climax)
                    </label>
                    <textarea
                      rows={4}
                      value={editForm.narrativeArc.ending}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        narrativeArc: { ...editForm.narrativeArc, ending: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block tracking-wider">
                      Beginning
                    </span>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      {analysisData.narrativeArc?.beginning || <span className="text-slate-500 italic">None specified</span>}
                    </p>
                  </div>
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-sky-400 block tracking-wider">
                      Middle
                    </span>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      {analysisData.narrativeArc?.middle || <span className="text-slate-500 italic">None specified</span>}
                    </p>
                  </div>
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                      Ending
                    </span>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      {analysisData.narrativeArc?.ending || <span className="text-slate-500 italic">None specified</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 7. Missing or Ambiguous Information */}
            <div className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-5 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span>7. Missing or Ambiguous Information</span>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => addListItem('missingOrAmbiguous', '')}
                    className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                )}
              </div>

              {isEditing && editForm ? (
                <div className="space-y-2">
                  {editForm.missingOrAmbiguous.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateListItem('missingOrAmbiguous', idx, e.target.value)}
                        placeholder="Flagged ambiguity or missing detail..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-amber-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeListItem('missingOrAmbiguous', idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editForm.missingOrAmbiguous.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No missing details or ambiguities flagged.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {analysisData.missingOrAmbiguous && analysisData.missingOrAmbiguous.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-amber-200/90 list-disc list-inside">
                      {analysisData.missingOrAmbiguous.map((g, i) => (
                        <li key={i} className="leading-relaxed">
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Zero gaps or ambiguities flagged in source material. All facts are internally consistent.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Version History Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-200">Analysis Version History</h3>
          </div>
          <span className="text-xs text-slate-500">
            {versionHistory.length + (currentRecord ? 1 : 0)} total {versionHistory.length + (currentRecord ? 1 : 0) === 1 ? 'version' : 'versions'}
          </span>
        </div>

        <div className="space-y-2.5">
          {/* Current Active Version entry */}
          {currentRecord && (
            <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-100 bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[11px]">
                  v{currentRecord.version} (Active)
                </span>
                <span className="text-slate-400">
                  {new Date(currentRecord.createdAt).toLocaleDateString()} at {new Date(currentRecord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  currentRecord.status === 'Approved'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : currentRecord.status === 'Stale'
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                }`}>
                  {currentRecord.status}
                </span>
                <span className="text-[11px] text-slate-500">Current Active</span>
              </div>
            </div>
          )}

          {/* Archived previous versions */}
          {versionHistory.map((ver) => (
            <div
              key={ver.id || ver.version}
              className="bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                  v{ver.version}
                </span>
                <span className="text-slate-400">
                  {new Date(ver.createdAt).toLocaleDateString()} at {new Date(ver.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[11px] text-slate-500">
                  Source v{ver.sourceVersion || 1}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  ver.status === 'Approved'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : ver.status === 'Stale'
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {ver.status}
                </span>

                <button
                  type="button"
                  onClick={() => setViewingVersion(ver)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                  title="View archived read-only snapshot"
                >
                  <Eye className="w-3 h-3 text-indigo-400" />
                  <span>View</span>
                </button>
              </div>
            </div>
          ))}

          {!currentRecord && versionHistory.length === 0 && (
            <p className="text-xs text-slate-500 italic py-2 text-center">
              No version history recorded yet. Run analysis to create the first version.
            </p>
          )}
        </div>
      </div>

      {/* Read-Only Modal for Archived Versions */}
      {viewingVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 max-w-3xl w-full max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-slate-100">
                  Archived Analysis v{viewingVersion.version} (Read-Only)
                </h3>
                <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                  {viewingVersion.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingVersion(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-300">
              Archived historical record created on {new Date(viewingVersion.createdAt).toLocaleString()}. Archived versions are preserved and cannot be modified.
            </div>

            {/* 7 Dimensions Read-Only Display */}
            <div className="space-y-4 text-xs">
              {/* 1 */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <span className="font-semibold text-slate-300 block">1. Main Subject and Characters</span>
                <ul className="space-y-1 text-slate-400 list-disc list-inside">
                  {viewingVersion.analysis?.mainSubjectAndCharacters?.map((c, i) => (
                    <li key={i}><span className="text-slate-200">{c}</span></li>
                  )) || <li className="text-slate-500 italic">None</li>}
                </ul>
              </div>

              {/* 2 */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <span className="font-semibold text-slate-300 block">2. Key Facts</span>
                <ul className="space-y-1 text-slate-400 list-disc list-inside">
                  {viewingVersion.analysis?.keyFacts?.map((f, i) => (
                    <li key={i}><span className="text-slate-200">{f}</span></li>
                  )) || <li className="text-slate-500 italic">None</li>}
                </ul>
              </div>

              {/* 3 */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <span className="font-semibold text-slate-300 block">3. Chronology</span>
                <ol className="space-y-1 text-slate-400 list-decimal list-inside">
                  {viewingVersion.analysis?.chronology?.map((ev, i) => (
                    <li key={i}><span className="text-slate-200">{ev}</span></li>
                  )) || <li className="text-slate-500 italic">None</li>}
                </ol>
              </div>

              {/* 4 */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <span className="font-semibold text-slate-300 block">4. Locations and Dates</span>
                <ul className="space-y-1 text-slate-400 list-disc list-inside">
                  {viewingVersion.analysis?.locationsAndDates?.map((l, i) => (
                    <li key={i}><span className="text-slate-200">{l}</span></li>
                  )) || <li className="text-slate-500 italic">None</li>}
                </ul>
              </div>

              {/* 5 */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <span className="font-semibold text-slate-300 block">5. Key Developments</span>
                <ul className="space-y-1 text-slate-400 list-disc list-inside">
                  {viewingVersion.analysis?.keyDevelopments?.map((d, i) => (
                    <li key={i}><span className="text-slate-200">{d}</span></li>
                  )) || <li className="text-slate-500 italic">None</li>}
                </ul>
              </div>

              {/* 6 */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <span className="font-semibold text-slate-300 block">6. Narrative Arc</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase block">Beginning</span>
                    <p className="text-slate-300 text-[11px] mt-0.5">{viewingVersion.analysis?.narrativeArc?.beginning || '—'}</p>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] font-bold text-sky-400 uppercase block">Middle</span>
                    <p className="text-slate-300 text-[11px] mt-0.5">{viewingVersion.analysis?.narrativeArc?.middle || '—'}</p>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block">Ending</span>
                    <p className="text-slate-300 text-[11px] mt-0.5">{viewingVersion.analysis?.narrativeArc?.ending || '—'}</p>
                  </div>
                </div>
              </div>

              {/* 7 */}
              <div className="bg-slate-950/70 border border-amber-500/20 rounded-xl p-3.5 space-y-1.5">
                <span className="font-semibold text-amber-300 block">7. Missing or Ambiguous Information</span>
                <ul className="space-y-1 text-amber-200/90 list-disc list-inside">
                  {viewingVersion.analysis?.missingOrAmbiguous?.map((m, i) => (
                    <li key={i}>{m}</li>
                  )) || <li className="text-slate-500 italic">None flagged</li>}
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setViewingVersion(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
