import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Search, 
  BookOpen, 
  Save, 
  Clock, 
  ArrowLeft,
  ShieldCheck,
  Upload,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  X,
  Trash2,
  Smartphone,
  Monitor,
  Settings,
  ShieldAlert,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ProjectRecord, WorkspaceTab } from '../../types/navigation';
import { PhasePlaceholder } from '../common/PhasePlaceholder';
import { updateSourceStory, updateProject, extractUrlSource } from '../../services/api';
import { ScriptEditor } from './ScriptEditor';
import { SourceAnalysisView } from './SourceAnalysisView';

interface WorkspaceViewProps {
  project: ProjectRecord;
  onBack: () => void;
  onProjectUpdated: (updated: ProjectRecord) => void;
  onDeleteProject?: (id: string) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  project,
  onBack,
  onProjectUpdated,
  onDeleteProject,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => {
    try {
      const saved = localStorage.getItem('illyum_active_tab');
      if (saved && ['source', 'analysis', 'script', 'video_prompts', 'thumbnail_prompts', 'seo'].includes(saved)) {
        return saved as WorkspaceTab;
      }
    } catch (e) {}
    return 'source';
  });

  // Source story local editing state
  const [storyText, setStoryText] = useState(project.sourceStory?.text || '');
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // URL extraction state
  const [urlInput, setUrlInput] = useState('');
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);

  // Project Settings Modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editAspectRatio, setEditAspectRatio] = useState<'9:16' | '16:9'>(project.aspectRatio || '9:16');
  const [editLanguage, setEditLanguage] = useState<'Hindi' | 'English'>(project.language || 'English');
  const [editPartCount916, setEditPartCount916] = useState<3 | 4 | 5 | 6>(
    (project.selectedPartCount as any) || (project.duration === 24 ? 3 : project.duration === 40 ? 5 : project.duration === 48 ? 6 : 4)
  );
  const [editDurationMinutes169, setEditDurationMinutes169] = useState<number>(
    project.durationMinutes || (project.duration ? Math.max(3, Math.round(project.duration / 60)) : 3)
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Quick inline name edit
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(project.name);

  // Tab switch handler with localStorage persistence
  const handleTabChange = (tabId: WorkspaceTab) => {
    setActiveTab(tabId);
    try {
      localStorage.setItem('illyum_active_tab', tabId);
    } catch (e) {}
  };

  // Synchronize when project prop changes
  useEffect(() => {
    setStoryText(project.sourceStory?.text || '');
    setNameInput(project.name);
    setEditName(project.name);
    if (project.aspectRatio) setEditAspectRatio(project.aspectRatio);
    if (project.language) setEditLanguage(project.language);
    if (project.selectedPartCount) setEditPartCount916(project.selectedPartCount as any);
    if (project.durationMinutes) setEditDurationMinutes169(project.durationMinutes);
    setSaveFeedback(null);
    setErrorMessage(null);
  }, [project.id]);

  const tabs: { id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }>; tag: string }[] = [
    { id: 'source', label: 'Source Story', icon: BookOpen, tag: 'Active' },
    { id: 'analysis', label: 'Skill 0 — Source Analysis', icon: Sparkles, tag: 'Active' },
    { id: 'script', label: 'Skill 1 — Script', icon: FileText, tag: 'Active' },
    { id: 'video_prompts', label: 'Skill 2 — Video Prompts', icon: Video, tag: 'Ph.4' },
    { id: 'thumbnail_prompts', label: 'Skill 3 — Thumbnail Prompts', icon: ImageIcon, tag: 'Ph.5' },
    { id: 'seo', label: 'Skill 4 — SEO', icon: Search, tag: 'Ph.6' },
  ];

  // Save story text to backend
  const handleSaveStory = async () => {
    setIsSavingStory(true);
    setErrorMessage(null);
    setSaveFeedback(null);
    try {
      const updated = await updateSourceStory(project.id, {
        text: storyText,
        sourceType: 'pasted_text',
      });
      onProjectUpdated(updated);
      setSaveFeedback('Story source saved and persisted to server.');
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save story.');
    } finally {
      setIsSavingStory(false);
    }
  };

  // Handle local text/markdown file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setStoryText(content);
        try {
          const updated = await updateSourceStory(project.id, {
            text: content,
            sourceType: 'file',
            sourceReference: file.name,
          });
          onProjectUpdated(updated);
          setSaveFeedback(`Loaded & saved "${file.name}" to project.`);
          setTimeout(() => setSaveFeedback(null), 3500);
        } catch (err: any) {
          setErrorMessage(err.message || 'Failed to persist imported file.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle URL extraction with PRD Test A4 rule
  const handleExtractUrl = async () => {
    if (!urlInput.trim()) return;
    setIsExtractingUrl(true);
    setErrorMessage(null);
    setSaveFeedback(null);

    try {
      const updated = await extractUrlSource(project.id, urlInput.trim());
      onProjectUpdated(updated);
      setStoryText(updated.sourceStory.text);
      setShowUrlModal(false);
      setUrlInput('');
      setSaveFeedback(`Extracted story from URL successfully (${updated.sourceStory.wordCount} words).`);
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsExtractingUrl(false);
    }
  };

  // Save project name rename
  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    try {
      const updated = await updateProject(project.id, { name: nameInput.trim() });
      onProjectUpdated(updated);
      setIsEditingName(false);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Save Project Settings from Modal
  const handleSaveProjectSettings = async () => {
    if (!editName.trim()) {
      alert('Project name cannot be empty.');
      return;
    }
    if (editAspectRatio === '16:9' && editDurationMinutes169 < 3) {
      alert('Minimum video duration for 16:9 is 3 minutes.');
      return;
    }

    setIsSavingSettings(true);
    try {
      const payload: any = {
        name: editName.trim(),
        aspectRatio: editAspectRatio,
        language: editLanguage,
      };

      if (editAspectRatio === '9:16') {
        payload.selectedPartCount = editPartCount916;
        payload.duration = editPartCount916 * 8;
      } else {
        payload.durationMinutes = editDurationMinutes169;
        payload.duration = Math.round(editDurationMinutes169 * 60);
      }

      const updated = await updateProject(project.id, payload);
      onProjectUpdated(updated);
      setShowSettingsModal(false);
      setSaveFeedback('Project settings updated successfully.');
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update project settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Quick 1-click set missing aspect ratio
  const handleQuickSetAspectRatio = async (ratio: '9:16' | '16:9') => {
    try {
      const payload: any = { aspectRatio: ratio };
      if (ratio === '9:16') {
        payload.selectedPartCount = 4;
        payload.duration = 32;
      } else {
        payload.durationMinutes = 3;
        payload.duration = 180;
      }
      const updated = await updateProject(project.id, payload);
      onProjectUpdated(updated);
      setSaveFeedback(`Aspect ratio set to ${ratio} and saved.`);
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update aspect ratio.');
    }
  };

  const wordCount = storyText ? storyText.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = storyText.length;

  // Duration label
  const durationLabel = project.aspectRatio === '16:9'
    ? `${project.durationMinutes || Math.round((project.duration || 180)/60)}m (${project.calculatedPartCount || Math.ceil((project.duration || 180)/8)} parts)`
    : `${project.duration || 32}s (${project.selectedPartCount || Math.round((project.duration || 32)/8)} parts)`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Existing Project Missing Aspect Ratio Notice Banner */}
      {!project.aspectRatio && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Project Setting Incomplete: Missing Aspect Ratio</span>
            </div>
            <p className="text-xs text-slate-300">
              This existing project is missing an Aspect Ratio. Per ILLYUM rules, please select 9:16 (Vertical) or 16:9 (Horizontal).
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleQuickSetAspectRatio('9:16')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>9:16 Vertical (32s / 4 parts)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickSetAspectRatio('16:9')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>16:9 Horizontal (3m / 23 parts)</span>
            </button>
          </div>
        </div>
      )}

      {/* Workspace Top Header */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
              title="Return to Projects"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                  Project Workspace
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-emerald-400 font-medium">Single Source of Truth Active</span>
                {project.isDemo && (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                    Demo Project
                  </span>
                )}
              </div>

              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="bg-slate-950 border border-indigo-500 rounded-lg px-2.5 py-1 text-base sm:text-lg font-bold text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(project.name);
                      setIsEditingName(false);
                    }}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2 truncate mt-0.5">
                  <span className="truncate">{project.name}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                    title="Rename Project"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </h1>
              )}
            </div>
          </div>

          {/* Action buttons & Status Badge */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              project.status === 'Source Ready'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : project.status === 'Script Approved'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>Status: {project.status}</span>
            </div>

            {/* Ratio badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
              project.aspectRatio
                ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
            }`}>
              {project.aspectRatio === '16:9' ? (
                <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>{project.aspectRatio || 'Ratio Missing'}</span>
            </div>

            {/* Language badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 text-slate-300 text-xs">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-white">{project.language || 'English'}</span>
            </div>

            {/* Duration badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 text-slate-300 text-xs">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-white">{durationLabel}</span>
            </div>

            {/* Project Settings Button */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              title="Project Settings"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {onDeleteProject && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
                    onDeleteProject(project.id);
                  }
                }}
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 6 Workspace Tabs (Source Story, Skill 0, Skill 1, Skill 2, Skill 3, Skill 4) */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-800/80 pt-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 border-b-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                  tab.tag === 'Active'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Project Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-slate-100">Project Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Update project-level settings. These define the single source of truth for all skills and do not alter existing stories or approval histories.
            </p>

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Aspect Ratio (Mandatory for Skills 2 & 3)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditAspectRatio('9:16')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      editAspectRatio === '9:16'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">9:16 — Vertical</div>
                    <div className="text-[10px] text-slate-400">YouTube Shorts / Reels (8s Part Formula)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditAspectRatio('16:9')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      editAspectRatio === '16:9'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">16:9 — Horizontal</div>
                    <div className="text-[10px] text-slate-400">YouTube Landscape (Min 3m, Ceil Parts)</div>
                  </button>
                </div>
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Language
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditLanguage('Hindi')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      editLanguage === 'Hindi'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Hindi (हिंदी)</div>
                    <div className="text-[10px] text-slate-400">Strict Devanagari script</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditLanguage('English')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      editLanguage === 'English'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">English</div>
                    <div className="text-[10px] text-slate-400">Conversational English</div>
                  </button>
                </div>
              </div>

              {/* Duration: depends on editAspectRatio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Target Duration ({editAspectRatio === '9:16' ? 'Parts × 8s' : 'Ceiling(Seconds ÷ 8)'})
                </label>

                {editAspectRatio === '9:16' ? (
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { parts: 3 as const, sec: 24 },
                      { parts: 4 as const, sec: 32 },
                      { parts: 5 as const, sec: 40 },
                      { parts: 6 as const, sec: 48 },
                    ]).map((item) => (
                      <button
                        key={item.parts}
                        type="button"
                        onClick={() => setEditPartCount916(item.parts)}
                        className={`p-2 rounded-xl border text-center text-xs transition-all cursor-pointer ${
                          editPartCount916 === item.parts
                            ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="font-bold">{item.parts} Parts</div>
                        <div className="text-[10px] opacity-80">{item.sec}s</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="3"
                        max="60"
                        step="0.5"
                        value={editDurationMinutes169}
                        onChange={(e) => setEditDurationMinutes169(parseFloat(e.target.value) || 3)}
                        className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <span className="text-xs text-slate-400">minutes (min 3 min)</span>
                    </div>
                    <div className="text-[11px] text-indigo-400">
                      = {Math.round(editDurationMinutes169 * 60)}s &rarr; {Math.ceil(Math.round(editDurationMinutes169 * 60) / 8)} parts
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProjectSettings}
                disabled={isSavingSettings}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md cursor-pointer"
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents */}
      <div className="space-y-6">
        {/* Tab 1: Source Story Intake & Persistence */}
        {activeTab === 'source' && (
          <div className="space-y-6">
            {/* Feedback & Error Banners */}
            {saveFeedback && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{saveFeedback}</span>
              </div>
            )}
            {errorMessage && (
              <div className="flex items-start gap-2 p-3.5 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Notice:</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Source Story Editor Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <span>Original Story Source</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Paste your raw story material, news article, transcript, or narrative source.
                  </p>
                </div>

                {/* Import options */}
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer border border-slate-700 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept=".txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowUrlModal(!showUrlModal)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Import URL</span>
                  </button>
                </div>
              </div>

              {/* URL Import Dropdown Area */}
              {showUrlModal && (
                <div className="bg-slate-950/90 border border-slate-700/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-indigo-400" />
                      <span>Import Story from Web URL</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUrlModal(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/article"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleExtractUrl}
                      disabled={isExtractingUrl || !urlInput.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
                    >
                      {isExtractingUrl ? 'Extracting...' : 'Extract Content'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Rule FR-02: If extraction fails due to paywalls, JavaScript, or security, ILLYUM reports failure honestly without pretending to have read it.
                  </p>
                </div>
              )}

              {/* Textarea for Story Text */}
              <div className="space-y-2">
                <textarea
                  rows={9}
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="Paste your source story here. For example: historical accounts, scientific discoveries, biographies, narrative threads, or news developments..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed font-sans resize-y"
                />

                {/* Footer metadata & Save trigger */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 pt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                      Words: <strong className="text-slate-200">{wordCount}</strong>
                    </span>
                    <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                      Characters: <strong className="text-slate-200">{charCount}</strong>
                    </span>
                    {project.sourceStory?.sourceType && (
                      <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-[11px]">
                        Intake: <strong className="text-indigo-400">{project.sourceStory.sourceType}</strong>
                        {project.sourceStory.sourceReference && ` (${project.sourceStory.sourceReference})`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveStory}
                      disabled={isSavingStory}
                      className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-xl transition-all border border-slate-700 text-xs shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingStory ? 'Saving...' : 'Save Story'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveStory}
                      disabled={isSavingStory}
                      className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20 text-xs shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingStory ? 'Saving...' : 'Save Story'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange('analysis')}
                      disabled={charCount === 0}
                      className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-xl transition-all border border-slate-700 text-xs shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Skill 0 Analysis</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Source Story Readiness & Skill 0 Routing Card */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className={`w-4 h-4 shrink-0 ${charCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>
                  {charCount > 0 
                    ? project.currentAnalysis 
                      ? `Source story is saved. Skill 0 Analysis is ${project.analysisStatus || 'available'}. Proceed to Skill 0 to review or refine dimensions.`
                      : 'Source story is saved and ready. Proceed to Skill 0 — Source Analysis to extract characters, key facts, chronology, and narrative arc.'
                    : 'Enter or upload your original story above to begin the ILLYUM creation pipeline.'}
                </span>
              </div>
              {charCount > 0 && (
                <button
                  type="button"
                  onClick={() => handleTabChange('analysis')}
                  className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer shrink-0"
                >
                  <span>Go to Skill 0 — Source Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Skill 0 — Source Analysis */}
        {activeTab === 'analysis' && (
          <SourceAnalysisView
            project={project}
            onProjectUpdated={onProjectUpdated}
            onNavigateToTab={handleTabChange}
          />
        )}

        {/* Tab 3: Script (Skill 1: Story-to-Script) */}
        {activeTab === 'script' && (
          <ScriptEditor
            project={project}
            onProjectUpdated={onProjectUpdated}
            onNavigateToTab={handleTabChange}
          />
        )}

        {/* Tab 3: Video Generation Prompts (Phase 4 - Gated) */}
        {activeTab === 'video_prompts' && (
          <PhasePlaceholder
            phaseNumber={4}
            phaseTitle="Skill 2: Script-to-Video Generation Prompts"
            description="Transforms your approved script parts into production-ready visual prompts tailored for Google Flow, inheriting your project's aspect ratio."
            inputsRequired={['Approved Skill 1 Script parts only', 'Project Aspect Ratio (' + (project.aspectRatio || '9:16') + ')']}
            dependencyGate={project.status === 'Script Approved' ? 'Unlocked! Approved script is available.' : 'Blocked: Requires approved Skill 1 script.'}
            acceptanceCriteria={['One prompt per script part (<=8s each)', 'Explicit aspect ratio & resolution', 'Exact approved voiceover text', 'Consistent visual & character style']}
          />
        )}

        {/* Tab 4: Thumbnail Concepts (Phase 5 - Gated) */}
        {activeTab === 'thumbnail_prompts' && (
          <PhasePlaceholder
            phaseNumber={5}
            phaseTitle="Skill 3: Script-to-Thumbnail Generation Prompts"
            description="Produces high-converting YouTube and Instagram thumbnail concepts based on the approved script hook."
            inputsRequired={['Approved Skill 1 Script only', 'Project Aspect Ratio (' + (project.aspectRatio || '9:16') + ')']}
            dependencyGate={project.status === 'Script Approved' ? 'Unlocked! Approved script is available.' : 'Blocked: Requires approved Skill 1 script.'}
            acceptanceCriteria={['Exactly two distinct options (A & B)', 'Mobile readability & focal point', 'Quality constraints & negative prompts', 'Zero generated images (prompts only)']}
          />
        )}

        {/* Tab 5: SEO & Metadata (Phase 6 - Gated) */}
        {activeTab === 'seo' && (
          <PhasePlaceholder
            phaseNumber={6}
            phaseTitle="Skill 4: Story & Script-to-SEO Generation"
            description="Generates platform-compliant discoverability packages separated into dedicated YouTube and Instagram sub-tabs."
            inputsRequired={['Original Source Story', 'Approved Skill 1 Script']}
            dependencyGate={project.status === 'Script Approved' ? 'Unlocked! Source and approved script are available.' : 'Blocked: Requires approved Skill 1 script.'}
            acceptanceCriteria={['Separate YouTube and Instagram results', 'YouTube title = exact Hook text', 'No article titles or links in description', 'Transparent keyword evidence']}
          />
        )}
      </div>
    </div>
  );
};
