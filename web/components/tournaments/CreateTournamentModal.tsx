import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Upload, ChevronRight, ChevronLeft, Check, Trophy, Calendar, MapPin, Users, BookOpen, Award, Swords, Settings, Shield, Zap } from 'lucide-react';
import { createTournament, updateTournament, type CreateTournamentInput } from '../../services/tournaments';
import type { Tournament, TournamentFormat, TournamentEventType, TournamentCategory, TournamentMode, RegistrationMode, RosterLockTiming } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (t: Tournament) => void;
  editTournament?: Tournament | null;
}

const STEPS = [
  { label: 'Basic Info', icon: Trophy },
  { label: 'Schedule', icon: Calendar },
  { label: 'Divisions', icon: Users },
  { label: 'Format', icon: Swords },
  { label: 'Settings', icon: Settings },
  { label: 'Rewards', icon: Award },
  { label: 'Review', icon: Check },
];

const CreateTournamentModal: React.FC<Props> = ({ isOpen, onClose, onSaved, editTournament }) => {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState(editTournament?.name || '');
  const [description, setDescription] = useState(editTournament?.description || '');
  const [location, setLocation] = useState(editTournament?.location || '');
  const [date, setDate] = useState(editTournament?.date ? editTournament.date.split('T')[0] : '');
  const [startTime, setStartTime] = useState(editTournament?.startTime || '08:00');
  const [checkInTime, setCheckInTime] = useState(editTournament?.checkInTime || '07:00');
  const [registrationDeadline, setRegistrationDeadline] = useState(editTournament?.registrationDeadline?.split('T')[0] || '');
  const [category, setCategory] = useState<TournamentCategory>(editTournament?.category || 'open');
  const [skillLevel, setSkillLevel] = useState(editTournament?.skillLevel || 'All Levels');
  const [format, setFormat] = useState<TournamentFormat>(editTournament?.format || 'single_elim');
  const [eventType, setEventType] = useState<TournamentEventType>(editTournament?.eventType || 'singles');
  const [maxPlayers, setMaxPlayers] = useState(editTournament?.maxPlayers || 32);
  const [numCourts, setNumCourts] = useState(editTournament?.numCourts || 1);
  const [prizePool, setPrizePool] = useState(editTournament?.prizePool || '');
  const [prizes, setPrizes] = useState(editTournament?.prizes || '');
  const [rules, setRules] = useState(editTournament?.rules || '11 points, win by 2, best of 3');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(editTournament?.image || null);
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>(editTournament?.tournamentMode || 'casual');
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>(
    editTournament?.registrationMode === 'squad' ? 'squad' : 'individual'
  );
  const [rosterLockTiming, setRosterLockTiming] = useState<RosterLockTiming>(editTournament?.rosterLockTiming || 'bracket_generated');
  const [squadMinSize, setSquadMinSize] = useState<number>(editTournament?.squadRequirements?.minSize || 2);
  const [squadRatingMin, setSquadRatingMin] = useState<number | ''>(editTournament?.squadRequirements?.ratingMin ?? '');
  const [squadRatingMax, setSquadRatingMax] = useState<number | ''>(editTournament?.squadRequirements?.ratingMax ?? '');
  const [squadRegions, setSquadRegions] = useState<string>((editTournament?.squadRequirements?.regions || []).join(', '));
  const [squadMembership, setSquadMembership] = useState<'any' | 'active' | 'premium'>(editTournament?.squadRequirements?.membership || 'any');

  const isEditing = !!editTournament;

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPosterFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPosterPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const input: CreateTournamentInput = {
        name,
        description,
        // Explicitly append PH timezone offset (+08:00) so the datetime is never misread as UTC
        date: new Date(`${date}T${startTime}:00+08:00`).toISOString(),
        location,
        prizePool,
        skillLevel,
        maxPlayers,
        format,
        eventType,
        category,
        startTime,
        checkInTime,
        // End of day PH time — a date-only input gives UTC midnight without this, which is 8 AM PH
        registrationDeadline: registrationDeadline ? new Date(`${registrationDeadline}T23:59:59+08:00`).toISOString() : undefined,
        numCourts,
        rules,
        prizes,
        imageFile: posterFile || undefined,
        tournamentMode,
        registrationMode,
        rosterLockTiming: tournamentMode === 'competitive' ? rosterLockTiming : 'bracket_generated',
        squadRequirements: registrationMode === 'individual' ? undefined : {
          minSize: squadMinSize,
          ratingMin: squadRatingMin === '' ? undefined : squadRatingMin,
          ratingMax: squadRatingMax === '' ? undefined : squadRatingMax,
          regions: squadRegions.split(',').map(r => r.trim()).filter(Boolean),
          membership: squadMembership,
        },
      };

      let result: Tournament;
      if (isEditing && editTournament) {
        result = await updateTournament(editTournament.id, input);
      } else {
        result = await createTournament(input);
      }

      onSaved(result);
      onClose();
    } catch (err: any) {
      console.error('Failed to save tournament:', err);
      alert(err.message || 'Failed to save tournament');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return name.trim().length > 0 && location.trim().length > 0;
      case 1: return !!date;
      default: return true;
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block";

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-4 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
              {isEditing ? 'Edit Tournament' : 'Create Tournament'}
            </h2>
            <p className="text-slate-400 text-xs font-bold mt-1">
              Step {step + 1} of {STEPS.length} — {STEPS[step].label}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-8 pb-4 shrink-0">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i < step ? 'bg-emerald-500' : i === step ? 'bg-blue-600' : 'bg-slate-100'
              }`}
              onClick={() => i <= step && setStep(i)}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-8 py-4">
          {/* Step 0: Basic Info */}
          {step === 0 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <label className={labelClass}>Tournament Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Manila Open 2026" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="About this tournament..." rows={3} className={inputClass + ' resize-none'} />
              </div>
              <div>
                <label className={labelClass}>Location *</label>
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. BGC Center Courts" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tournament Poster</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-8 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group overflow-hidden h-48"
                >
                  {posterPreview ? (
                    <>
                      <img src={posterPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-black text-[10px] uppercase tracking-widest">Change Image</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <Upload size={32} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-bold text-sm">Drop poster or click to browse</p>
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black mt-1">1200×630 recommended</p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePosterChange} className="hidden" />
                </div>
              </div>

                <div className="p-4 md:p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-5">
                  {/* Tournament Mode */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tournament Mode</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTournamentMode('casual')}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          tournamentMode === 'casual' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Zap size={16} className={tournamentMode === 'casual' ? 'text-emerald-600' : 'text-slate-400'} />
                          <span className={`font-black text-sm uppercase tracking-tight ${tournamentMode === 'casual' ? 'text-emerald-700' : 'text-slate-500'}`}>Casual</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">Flexible, fun, weekend events. Fast approval.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTournamentMode('competitive')}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          tournamentMode === 'competitive' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Shield size={16} className={tournamentMode === 'competitive' ? 'text-blue-600' : 'text-slate-400'} />
                          <span className={`font-black text-sm uppercase tracking-tight ${tournamentMode === 'competitive' ? 'text-blue-700' : 'text-slate-500'}`}>Competitive</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">Rated, strict brackets, approval required.</p>
                      </button>
                    </div>
                  </div>

                  {/* Registration Mode */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registration Mode</p>
                      <p className="text-sm text-slate-600 font-medium">How participants join</p>
                    </div>
                    <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setRegistrationMode('individual')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                          registrationMode === 'individual' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >Individual</button>
                      <button
                        type="button"
                        onClick={() => setRegistrationMode('squad')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                          registrationMode === 'squad' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >Squad</button>
                    </div>
                  </div>

                  {/* Roster Lock Timing — competitive only */}
                  {tournamentMode === 'competitive' && registrationMode === 'squad' && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Roster Lock Point</p>
                      <div className="grid grid-cols-1 gap-2">
                        {([
                          { value: 'registration_close' as RosterLockTiming, label: 'At Registration Close', desc: 'Strictest — lock when deadline passes' },
                          { value: 'bracket_generated' as RosterLockTiming, label: 'At Bracket Generation', desc: 'Recommended — lock when bracket is set' },
                          { value: 'first_match_start' as RosterLockTiming, label: 'At First Match', desc: 'Most flexible — lock when play begins' },
                        ]).map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRosterLockTiming(opt.value)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              rosterLockTiming === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <p className={`text-xs font-black ${rosterLockTiming === opt.value ? 'text-blue-700' : 'text-slate-600'}`}>{opt.label}</p>
                            <p className="text-[10px] text-slate-400">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Squad Requirements — squad mode only */}
                  {registrationMode === 'squad' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Minimum Squad Roster</label>
                        <input
                          type="number"
                          min={2}
                          value={squadMinSize}
                          onChange={e => setSquadMinSize(Number(e.target.value) || 0)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Membership</label>
                        <select
                          value={squadMembership}
                          onChange={e => setSquadMembership(e.target.value as any)}
                          className={inputClass}
                        >
                          <option value="any">Any</option>
                          <option value="active">Active</option>
                          <option value="premium">Premium</option>
                        </select>
                      </div>
                      {tournamentMode === 'competitive' && (
                        <div className="grid grid-cols-2 gap-3 md:col-span-2">
                          <div>
                            <label className={labelClass}>Rating Min</label>
                            <input
                              type="number"
                              step="0.1"
                              value={squadRatingMin}
                              onChange={e => setSquadRatingMin(e.target.value === '' ? '' : Number(e.target.value))}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Rating Max</label>
                            <input
                              type="number"
                              step="0.1"
                              value={squadRatingMax}
                              onChange={e => setSquadRatingMax(e.target.value === '' ? '' : Number(e.target.value))}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <label className={labelClass}>Allowed Regions (comma-separated)</label>
                        <input
                          value={squadRegions}
                          onChange={e => setSquadRegions(e.target.value)}
                          placeholder="e.g. Cebu, Manila, Davao"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}
                </div>
            </div>
          )}

          {/* Step 1: Schedule */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tournament Date *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Start Time</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Check-in Time</label>
                  <input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Registration Deadline</label>
                  <input type="date" value={registrationDeadline} onChange={e => setRegistrationDeadline(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Divisions */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <label className={labelClass}>Category</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['beginner', 'intermediate', 'advanced', 'open'] as TournamentCategory[]).map(c => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`p-4 rounded-2xl border-2 font-black text-sm uppercase tracking-widest transition-all ${
                        category === c ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Skill Level Label</label>
                <select value={skillLevel} onChange={e => setSkillLevel(e.target.value)} className={inputClass + ' appearance-none'}>
                  <option>All Levels</option>
                  <option>Beginner (2.0-3.0)</option>
                  <option>Intermediate (3.5-4.5)</option>
                  <option>Advanced (5.0+)</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Format */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <label className={labelClass}>Event Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'singles', label: 'Singles' },
                    { value: 'doubles', label: 'Doubles' },
                    { value: 'mixed_doubles', label: 'Mixed Doubles' },
                  ] as { value: TournamentEventType; label: string }[]).map(t => (
                    <button
                      key={t.value}
                      onClick={() => setEventType(t.value)}
                      className={`p-4 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${
                        eventType === t.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Tournament Format</label>
                <div className="grid grid-cols-1 gap-3">
                  {([
                    { value: 'single_elim', label: 'Single Elimination', desc: 'Lose once and you\'re out. Fast and decisive.' },
                    { value: 'double_elim', label: 'Double Elimination', desc: 'Must lose twice to be eliminated. More forgiving.' },
                    { value: 'round_robin', label: 'Round Robin', desc: 'Everyone plays everyone. Best record wins.' },
                  ] as { value: TournamentFormat; label: string; desc: string }[]).map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFormat(f.value)}
                      className={`p-5 rounded-2xl border-2 text-left transition-all ${
                        format === f.value ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <p className={`font-black text-sm uppercase tracking-tight ${format === f.value ? 'text-blue-700' : 'text-slate-700'}`}>
                        {f.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Settings */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Max Players / Teams</label>
                  <input type="number" min={2} value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Number of Courts</label>
                  <input type="number" min={1} value={numCourts} onChange={e => setNumCourts(Number(e.target.value))} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Match Rules</label>
                <textarea value={rules} onChange={e => setRules(e.target.value)} rows={3} className={inputClass + ' resize-none'} placeholder="e.g. 11 points, win by 2, best of 3" />
              </div>
            </div>
          )}

          {/* Step 5: Rewards */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <label className={labelClass}>Prize Pool</label>
                <input value={prizePool} onChange={e => setPrizePool(e.target.value)} placeholder="e.g. ₱50,000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Prizes / Rewards Description</label>
                <textarea value={prizes} onChange={e => setPrizes(e.target.value)} rows={4} className={inputClass + ' resize-none'} placeholder="1st Place: ₱30,000 + Trophy&#10;2nd Place: ₱15,000&#10;3rd Place: ₱5,000" />
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
                {posterPreview && (
                  <img src={posterPreview} alt="Poster" className="w-full h-40 object-cover rounded-2xl mb-4" />
                )}
                <ReviewRow label="Name" value={name} />
                <ReviewRow label="Location" value={location} />
                <ReviewRow label="Date" value={date ? new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
                <ReviewRow label="Time" value={`${startTime} (check-in: ${checkInTime})`} />
                <ReviewRow label="Category" value={category} />
                <ReviewRow label="Event Type" value={eventType.replace('_', ' ')} />
                <ReviewRow label="Format" value={format.replace('_', ' ')} />
                <ReviewRow label="Max Players" value={String(maxPlayers)} />
                <ReviewRow label="Courts" value={String(numCourts)} />
                <ReviewRow label="Mode" value={tournamentMode === 'competitive' ? 'Competitive' : 'Casual'} />
                <ReviewRow label="Registration" value={registrationMode === 'squad' ? 'Squad-based' : 'Individual'} />
                {tournamentMode === 'competitive' && registrationMode === 'squad' && (
                  <ReviewRow label="Roster Lock" value={rosterLockTiming.replace('_', ' ')} />
                )}
                {prizePool && <ReviewRow label="Prize Pool" value={prizePool} />}
                {rules && <ReviewRow label="Rules" value={rules} />}
                {description && <ReviewRow label="Description" value={description} />}
              </div>
              {!isEditing && (
                <p className="text-xs text-slate-400 text-center font-bold">
                  Your tournament will be submitted for admin approval before going live.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between p-8 pt-4 border-t border-slate-100 shrink-0">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-2 px-6 py-3 text-slate-500 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-colors"
          >
            <ChevronLeft size={16} />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canAdvance()}
              className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Tournament' : 'Publish Tournament'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 pt-0.5">{label}</span>
    <span className="text-sm font-bold text-slate-900 text-right capitalize">{value}</span>
  </div>
);

export default CreateTournamentModal;
