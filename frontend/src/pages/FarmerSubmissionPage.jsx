import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Sprout,
  Stethoscope,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CloudSun,
  Thermometer,
  Droplets,
  CloudRain,
  ShieldCheck,
  AlertTriangle,
  Info,
  ClipboardList,
} from 'lucide-react';

import { useSubmitCase } from '../services/queries';
import { formatErrorMessage } from '../services/api';
import { saveOfflineReport } from '../services/offlineQueue';
import { getTreatmentAdvice } from '../services/diseaseTreatments';

import ImageInput from '../components/farmer/ImageInput';
import VoiceInputButton from '../components/farmer/VoiceInputButton';
import RiskBadge from '../components/RiskBadge';
import { Card, CardBody } from '../components/common/Card';
import { Skeleton } from '../components/common/Skeleton';
import useDocumentMetadata from '../hooks/useDocumentMetadata';
import { useToast } from '../context/ToastContext';

const LocationPicker = lazy(() => import('../components/farmer/LocationPicker'));

const DRAFT_STORAGE_KEY = 'cropshield_farmer_report_draft_v2';

const COMMON_CROPS = [
  { id: 'Tomato', name: 'Tomato', icon: '🍅' },
  { id: 'Potato', name: 'Potato', icon: '🥔' },
  { id: 'Corn (Maize)', name: 'Corn (Maize)', icon: '🌽' },
  { id: 'Chilli', name: 'Chilli', icon: '🌶️' },
  { id: 'Cotton', name: 'Cotton', icon: '☁️' },
  { id: 'Rice (Paddy)', name: 'Rice (Paddy)', icon: '🌾' },
  { id: 'Onion', name: 'Onion', icon: '🧅' },
  { id: 'Grape', name: 'Grape', icon: '🍇' },
  { id: 'Banana', name: 'Banana', icon: '🍌' },
];

const MORE_CROPS = [
  'Cabbage',
  'Cauliflower',
  'Eggplant (Brinjal)',
  'Groundnut (Peanut)',
  'Soybean',
  'Sugarcane',
  'Wheat',
  'Pigeon Pea (Tur/Arhar)',
  'Chickpea (Gram)',
  'Pomegranate',
  'Mango',
  'Other',
];

const GROWTH_STAGES = [
  { id: 'Seedling', key: 'stageSeedling', descKey: 'stageSeedlingDesc', label: 'Seedling', icon: '🌱', defaultDesc: 'Emergence & early leaves' },
  { id: 'Vegetative', key: 'stageVegetative', descKey: 'stageVegetativeDesc', label: 'Vegetative', icon: '🌿', defaultDesc: 'Rapid stem & leaf growth' },
  { id: 'Flowering', key: 'stageFlowering', descKey: 'stageFloweringDesc', label: 'Flowering', icon: '🌸', defaultDesc: 'Flower buds & open blooms' },
  { id: 'Fruiting', key: 'stageFruiting', descKey: 'stageFruitingDesc', label: 'Fruiting', icon: '🍅', defaultDesc: 'Fruit set & development' },
  { id: 'Harvest', key: 'stageHarvest', descKey: 'stageHarvestDesc', label: 'Harvest', icon: '🧺', defaultDesc: 'Maturity & ripening' },
];

const SYMPTOM_OPTIONS = [
  { id: 'leaf_spots', labelKey: 'symptomsStep.symptomLeafSpots', defaultLabel: 'Leaf spots', icon: '🍂' },
  { id: 'yellowing', labelKey: 'symptomsStep.symptomYellowing', defaultLabel: 'Yellowing leaves', icon: '🟡' },
  { id: 'wilting', labelKey: 'symptomsStep.symptomWilting', defaultLabel: 'Wilting / Drooping', icon: '🥀' },
  { id: 'holes', labelKey: 'symptomsStep.symptomHoles', defaultLabel: 'Holes / Chewed', icon: '🐛' },
  { id: 'white_powder', labelKey: 'symptomsStep.symptomWhitePowder', defaultLabel: 'White powder', icon: '⚪' },
  { id: 'curling', labelKey: 'symptomsStep.symptomCurling', defaultLabel: 'Leaf curling', icon: '🌀' },
  { id: 'fruit_rot', labelKey: 'symptomsStep.symptomFruitRot', defaultLabel: 'Fruit / Stem rot', icon: '🟤' },
];


// Zod validation schema: Starts completely empty!
const reportFormSchema = z.object({
  image_url: z.string().optional().nullable(),
  image_file: z.any().optional().nullable(),
  crop: z.string().min(1, 'Please select what crop you are growing.'),
  growth_stage: z.string().min(1, 'Please select the growth stage of your crop.'),
  selectedSymptoms: z.array(z.string()).default([]),
  symptomsNotes: z.string().default(''),
  location_name: z.string().min(2, 'Please enter a name or identifier for your field.'),
  latitude: z.number({ required_error: 'Please mark your field location using GPS or map.' }).nullable(),
  longitude: z.number({ required_error: 'Please mark your field location using GPS or map.' }).nullable(),
}).refine((data) => Boolean(data.image_url || data.image_file), {
  message: 'Please take or upload a photo of your sick crop leaf.',
  path: ['image_url'],
}).refine((data) => data.selectedSymptoms.length > 0 || data.symptomsNotes.trim().length > 0, {
  message: 'Please tap at least one symptom or describe what you see.',
  path: ['selectedSymptoms'],
}).refine((data) => data.latitude !== null && data.longitude !== null, {
  message: 'Please mark your field location on the map.',
  path: ['latitude'],
});

export default function FarmerSubmissionPage({ onCaseCreated }) {
  const { t } = useTranslation();
  const { success, info } = useToast();

  useDocumentMetadata({
    title: 'Report Crop Disease — CropShield Kisan',
    description: 'Capture foliar crop disease symptoms, pin field geolocation, and receive instant AI pathogen diagnosis.',
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [submittingStep, setSubmittingStep] = useState('idle'); // 'idle' | 'submitting' | 'done' | 'offline_saved'
  const [analyzedResult, setAnalyzedResult] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);
  const [isCustomCropSelected, setIsCustomCropSelected] = useState(false);

  // Form management - starts 100% empty (no pre-filled Tomato/Kolar data)
  const {
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      image_url: '',
      image_file: null,
      crop: '',
      growth_stage: '',
      selectedSymptoms: [],
      symptomsNotes: '',
      location_name: '',
      latitude: null,
      longitude: null,
    },
    mode: 'onChange',
  });

  const formData = watch();
  const submitMutation = useSubmitCase();

  // 1. Load draft from localStorage on mount (form starts empty unless draft exists)
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.crop || parsed.location_name || parsed.selectedSymptoms?.length) {
          reset({
            ...parsed,
            image_file: null,
          });
          if (parsed.crop && !COMMON_CROPS.some((c) => c.id === parsed.crop)) {
            setIsCustomCropSelected(true);
          }
        }
      }
    } catch {
      // Ignore draft read errors
    }
  }, [reset]);

  // 2. Autosave draft to localStorage on changes
  useEffect(() => {
    if (submittingStep === 'done') return;
    try {
      const draftPayload = {
        crop: formData.crop,
        growth_stage: formData.growth_stage,
        selectedSymptoms: formData.selectedSymptoms,
        symptomsNotes: formData.symptomsNotes,
        location_name: formData.location_name,
        latitude: formData.latitude,
        longitude: formData.longitude,
        image_url:
          typeof formData.image_url === 'string' &&
          (formData.image_url.startsWith('http') || formData.image_url.startsWith('data:image')) &&
          formData.image_url.length < 500000
            ? formData.image_url
            : '',
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
    } catch {
      // Ignore quota errors
    }
  }, [formData, submittingStep]);

  // Validate current step before advancing
  const handleNextStep = async () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = Boolean(formData.image_url || formData.image_file);
      if (!isValid) {
        trigger('image_url');
      }
    } else if (currentStep === 2) {
      isValid = await trigger(['crop', 'growth_stage']);
    } else if (currentStep === 3) {
      isValid = (formData.selectedSymptoms && formData.selectedSymptoms.length > 0) || Boolean(formData.symptomsNotes?.trim());
      if (!isValid) {
        trigger('selectedSymptoms');
      }
    } else if (currentStep === 4) {
      if (formData.latitude === null || formData.longitude === null) {
        isValid = false;
        trigger(['latitude', 'location_name']);
      } else {
        isValid = await trigger(['location_name', 'latitude', 'longitude']);
      }
    }

    if (isValid && currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToStep = (stepNumber) => {
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle symptom chip
  const toggleSymptom = (symptomId) => {
    const current = formData.selectedSymptoms || [];
    const exists = current.includes(symptomId);
    const updated = exists ? current.filter((id) => id !== symptomId) : [...current, symptomId];
    setValue('selectedSymptoms', updated, { shouldValidate: true });
  };


  // Final Form Submission
  const handleSubmitReport = async () => {
    setSubmissionError(null);

    const isValid = await trigger();
    if (!isValid) {
      if (errors.image_url) jumpToStep(1);
      else if (errors.crop || errors.growth_stage) jumpToStep(2);
      else if (errors.selectedSymptoms) jumpToStep(3);
      else if (errors.location_name || errors.latitude) jumpToStep(4);
      return;
    }

    const compiledSymptoms = [
      ...(formData.selectedSymptoms || []).map((s) => {
        const item = SYMPTOM_OPTIONS.find((opt) => opt.id === s);
        return item ? item.defaultLabel : s;
      }),
      formData.symptomsNotes?.trim(),
    ]
      .filter(Boolean)
      .join('. ');

    const payload = {
      crop: formData.crop.trim(),
      growth_stage: formData.growth_stage.trim(),
      location_name: formData.location_name.trim(),
      latitude: parseFloat(formData.latitude) || 13.1368,
      longitude: parseFloat(formData.longitude) || 78.1348,
      symptoms: compiledSymptoms || 'Visual damage observed on foliage.',
      image_url:
        typeof formData.image_url === 'string' &&
        (formData.image_url.startsWith('http') || formData.image_url.startsWith('data:image'))
          ? formData.image_url
          : null,
      temperature: autoWeather?.temperature ?? 26.5,
      humidity: autoWeather?.humidity ?? 78.0,
      rainfall: autoWeather?.rainfall ?? 10.0,
    };

    // Check offline state
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      setSubmittingStep('submitting');
      try {
        const offlineCase = await saveOfflineReport(payload);
        setAnalyzedResult(offlineCase);
        setSubmittingStep('offline_saved');
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        info(t('reports.offlineSavedToast', 'Report saved locally on your device. Will automatically sync when online.'));
        if (onCaseCreated) onCaseCreated(offlineCase);
      } catch (err) {
        setSubmissionError(formatErrorMessage(err));
        setSubmittingStep('idle');
      }
      return;
    }

    try {
      setSubmittingStep('submitting');
      const result = await submitMutation.mutateAsync(payload);
      setAnalyzedResult(result);
      setSubmittingStep('done');
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      if (result?.ai_unavailable) {
        info('Report submitted. Case queued for officer review (AI model unavailable on server).');
      } else {
        success(t('reports.submittedToast', 'Report submitted successfully! AI analysis ready.'));
      }

      if (onCaseCreated) onCaseCreated(result);
    } catch (err) {
      if (err.isNetworkError || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        const offlineCase = await saveOfflineReport(payload);
        setAnalyzedResult(offlineCase);
        setSubmittingStep('offline_saved');
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        info(t('reports.offlineSavedToast', 'Report saved locally on your device. Will automatically sync when online.'));
      } else {
        setSubmittingStep('idle');
        setSubmissionError(formatErrorMessage(err));
      }
    }
  };

  // Plain-Language Confidence translation & color
  const confidenceInfo = useMemo(() => {
    if (!analyzedResult || analyzedResult.ai_unavailable || !analyzedResult.confidence) return null;
    const score = Math.round((analyzedResult.confidence || 0) * 100);

    if (score >= 85) {
      return {
        label: t('results.confidenceLikely', 'Likely'),
        color: '#16a34a',
        bg: '#f0fdf4',
        border: '#bbf7d0',
        score,
      };
    }
    if (score >= 60) {
      return {
        label: t('results.confidencePossible', 'Possible'),
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
        score,
      };
    }
    return {
      label: t('results.confidenceUnsure', 'Not sure, sent to an officer for checking'),
      color: '#475569',
      bg: '#f8fafc',
      border: '#cbd5e1',
      score,
    };
  }, [analyzedResult, t]);

  const treatmentAdvice = useMemo(() => {
    if (!analyzedResult?.disease || analyzedResult?.ai_unavailable) return null;
    return getTreatmentAdvice(analyzedResult?.disease);
  }, [analyzedResult]);

  // Reusable Result Card Content (used in both mobile full-screen and desktop sticky result panel)
  const renderResultCard = () => (
    <div className="farmer-result-card-inner">
      {/* Offline Notice banner */}
      {submittingStep === 'offline_saved' && (
        <div className="cs-offline-notice-banner mb-3" role="alert">
          <Info size={18} className="text-primary flex-shrink-0" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>
              {t('wizard.savedOffline', "Saved. Will send when you're back online")}
            </div>
            <div style={{ fontSize: '12px', marginTop: '2px', opacity: 0.9 }}>
              {t('wizard.savedOfflineDesc', 'Your report is stored on this phone and will upload automatically when internet connects.')}
            </div>
          </div>
        </div>
      )}

      {/* AI Unavailable Banner */}
      {analyzedResult?.ai_unavailable && (
        <div className="cs-offline-notice-banner mb-3" style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }} role="status">
          <Info size={18} className="text-muted flex-shrink-0" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main)' }}>
              AI Model Currently Unavailable
            </div>
            <div style={{ fontSize: '12px', marginTop: '2px', color: 'var(--text-muted)' }}>
              Your case was submitted successfully, but the AI diagnosis model is not currently available. Your submission has been saved and is awaiting AI analysis.
            </div>
          </div>
        </div>
      )}

      {/* Header Badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
        <div className="cs-badge cs-badge-suspected">
          <AlertTriangle size={13} className="icon-mr" />
          <span>{analyzedResult?.ai_unavailable ? 'Awaiting AI Analysis' : t('results.suspectedBadge', 'Suspected (Pending Officer Confirmation)')}</span>
        </div>
        <RiskBadge level={analyzedResult?.risk_level || 'MEDIUM'} size="md" showScore={false} />
      </div>

      {/* Large Disease Name */}
      <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.25, letterSpacing: '-0.4px' }}>
        {analyzedResult?.disease || (analyzedResult?.ai_unavailable ? 'Awaiting AI Analysis' : t('home.underAiAnalysis', 'Under AI Analysis'))}
      </h2>
      <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
        {formData.crop} &bull; {formData.growth_stage} &bull; {formData.location_name}
      </div>

      {/* Confidence Meter */}
      {confidenceInfo && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 14px',
            background: confidenceInfo.bg,
            border: `1px solid ${confidenceInfo.border}`,
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: confidenceInfo.color }}>
              {confidenceInfo.label}
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: confidenceInfo.color }}>
              {confidenceInfo.score}% {t('results.confidenceText', 'Confidence')}
            </div>
          </div>

          <div className="cs-confidence-track mt-2">
            <div
              className="cs-confidence-fill"
              style={{
                width: `${Math.max(confidenceInfo.score, 10)}%`,
                backgroundColor: confidenceInfo.color,
              }}
            />
          </div>
        </div>
      )}

      {/* Preliminary AI Disclaimer */}
      <div
        className="mt-3"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <Info size={15} className="text-muted flex-shrink-0" />
        <span>{t('results.disclaimer', 'AI results are preliminary. A certified agricultural officer will review this case.')}</span>
      </div>

      {/* Treatment Advice */}
      <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <ShieldCheck size={17} className="text-primary" />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
            {t('results.treatmentTitle', 'Recommended Action & Treatment')}
          </h3>
        </div>

        {treatmentAdvice ? (
          <>
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--primary)',
                fontWeight: 600,
                background: 'var(--primary-light)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '12px',
              }}
            >
              {t('results.treatmentNotice', 'Advice is curated by agricultural experts. Follow the label instructions for dosage.')}
            </div>

            <div style={{ fontSize: '13.5px', color: 'var(--text-body)', lineHeight: 1.45, marginBottom: '10px' }}>
              <strong>{t('results.immediateAction', 'Immediate Action')}: </strong>
              {treatmentAdvice.immediateAction}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {treatmentAdvice.recommendedSpray?.map((spray, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {spray.type}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      {spray.dosage}
                    </span>
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                    {spray.name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {spray.notes}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            Recommended actions and chemical spray prescriptions will be provided once the diagnosis is confirmed by an agricultural officer or AI analysis.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link
          to={analyzedResult?.id ? `/farmer/reports/${analyzedResult.id}` : '/farmer/reports'}
          className="cs-btn cs-btn-primary cs-btn-lg cs-btn-block"
          style={{ minHeight: '50px', fontSize: '15px', fontWeight: 700 }}
        >
          <ClipboardList size={18} className="icon-mr" />
          {t('results.viewReport', 'View in My Reports')}
        </Link>

        <button
          type="button"
          className="cs-btn cs-btn-secondary cs-btn-lg cs-btn-block"
          style={{ minHeight: '46px', fontSize: '14.5px' }}
          onClick={() => {
            reset({
              crop: '',
              growth_stage: '',
              selectedSymptoms: [],
              symptomsNotes: '',
              location_name: '',
              latitude: null,
              longitude: null,
              image_url: '',
              image_file: null,
            });
            setAnalyzedResult(null);
            setSubmittingStep('idle');
            setCurrentStep(1);
          }}
        >
          <RotateCcw size={15} className="icon-mr" />
          {t('results.submitAnother', 'Scan Another Crop')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="farmer-wizard-shell">

      {/* Main Wizard Container (Responsive 2-column layout on Desktop >=1024px with sticky result panel) */}
      <div className="farmer-wizard-layout-grid">
        {/* LEFT COLUMN: Main Wizard Screen (or Case Summary when submitted) */}
        <div className="farmer-wizard-main-column">
          {analyzedResult ? (
            /* On Desktop/Mobile: Completed case summary in left pane */
            <Card className="farmer-step-card animate-fade-in">
              <CardBody style={{ padding: '22px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <CheckCircle2 size={22} className="text-primary flex-shrink-0" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {t('wizard.caseSubmittedTitle', 'Field Case Successfully Submitted')}
                  </h2>
                </div>

                <div className="review-cards-list mb-3">
                  <div className="review-summary-row">
                    <div className="review-row-left">
                      <div className="review-row-thumb">
                        {formData.image_url ? (
                          <img
                            src={formData.image_url}
                            alt="Crop specimen preview"
                            width="48"
                            height="48"
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Camera size={20} className="text-muted" />
                        )}
                      </div>
                      <div>
                        <div className="review-row-label">{t('reviewStep.photoPreview', 'Crop Photo')}</div>
                        <div className="review-row-value">{t('photo.photoAttached', 'Attached & Compressed')}</div>
                      </div>
                    </div>
                  </div>

                  <div className="review-summary-row">
                    <div className="review-row-left">
                      <Sprout size={20} className="text-primary flex-shrink-0" />
                      <div>
                        <div className="review-row-label">{t('reviewStep.cropAndStage', 'Crop & Growth Stage')}</div>
                        <div className="review-row-value">
                          {formData.crop} &bull; {formData.growth_stage}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="review-summary-row">
                    <div className="review-row-left">
                      <Stethoscope size={20} className="text-primary flex-shrink-0" />
                      <div>
                        <div className="review-row-label">{t('reviewStep.symptoms', 'Reported Symptoms')}</div>
                        <div className="review-row-value">
                          {(formData.selectedSymptoms || []).length > 0
                            ? formData.selectedSymptoms.join(', ')
                            : formData.symptomsNotes || t('common.marked', 'Marked')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="review-summary-row">
                    <div className="review-row-left">
                      <MapPin size={20} className="text-primary flex-shrink-0" />
                      <div>
                        <div className="review-row-label">{t('reviewStep.location', 'Field Location')}</div>
                        <div className="review-row-value">
                          {formData.location_name}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile view only: renders result card below summary */}
                <div className="farmer-mobile-result-section">
                  {renderResultCard()}
                </div>
              </CardBody>
            </Card>
          ) : (
            /* Active Stepper & Steps 1-5 */
            <>
              {/* Stepper Header */}
              <div className="farmer-wizard-header mb-3">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                    {t('wizard.stepOf', { current: currentStep, total: 5 })} &mdash;{' '}
                    {currentStep === 1 && t('wizard.step1Title', 'Photo')}
                    {currentStep === 2 && t('wizard.step2Title', 'Crop & Stage')}
                    {currentStep === 3 && t('wizard.step3Title', 'Symptoms')}
                    {currentStep === 4 && t('wizard.step4Title', 'Location')}
                    {currentStep === 5 && t('wizard.step5Title', 'Review & Submit')}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {Math.round((currentStep / 5) * 100)}%
                  </span>
                </div>

                <div className="farmer-wizard-stepper">
                  {[1, 2, 3, 4, 5].map((stepNum) => (
                    <div
                      key={stepNum}
                      className={`farmer-step-pill ${
                        stepNum === currentStep ? 'is-current' : stepNum < currentStep ? 'is-done' : ''
                      }`}
                      onClick={() => {
                        if (stepNum < currentStep) jumpToStep(stepNum);
                      }}
                      title={`Step ${stepNum}`}
                    />
                  ))}
                </div>
              </div>

              {/* Form Step Content Card */}
              <Card className="farmer-step-card">
                <CardBody style={{ padding: '20px 18px' }}>
                  {/* STEP 1: PHOTO */}
                  {currentStep === 1 && (
                    <div className="step-pane animate-fade-in">
                      <div className="step-title-group mb-3">
                        <h2 className="step-heading">
                          1. {t('wizard.step1Title', 'Take or upload a photo of the sick leaf')}
                        </h2>
                        <p className="step-subheading">
                          {t('photo.helper', 'Clear, well-lit photos allow AI to spot early fungal patterns accurately.')}
                        </p>
                      </div>

                      <ImageInput
                        value={formData.image_url}
                        onChange={({ file, url, previewUrl }) => {
                          setValue('image_file', file, { shouldValidate: true });
                          setValue('image_url', url || previewUrl || '', { shouldValidate: true });
                        }}
                        error={errors.image_url?.message}
                      />
                    </div>
                  )}

                  {/* STEP 2: CROP & GROWTH STAGE */}
                  {currentStep === 2 && (
                    <div className="step-pane animate-fade-in">
                      <div className="step-title-group mb-3">
                        <h2 className="step-heading">{t('cropStep.selectCrop', '1. What crop are you growing?')}</h2>
                        <p className="step-subheading">
                          {t('cropStep.subheading', 'Select your crop to tailor disease identification.')}
                        </p>
                      </div>

                      <div className="crop-selection-grid mb-3">
                        {COMMON_CROPS.map((cropItem) => {
                          const isSelected = formData.crop === cropItem.id;
                          return (
                            <button
                              key={cropItem.id}
                              type="button"
                              className={`crop-icon-card ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => {
                                setValue('crop', cropItem.id, { shouldValidate: true });
                                setIsCustomCropSelected(false);
                              }}
                            >
                              <span className="crop-card-emoji">{cropItem.icon}</span>
                              <span className="crop-card-label">{cropItem.name}</span>
                              {isSelected && <CheckCircle2 size={16} className="crop-check-icon" />}
                            </button>
                          );
                        })}
                      </div>

                      <div className="cs-field-group mb-4">
                        <label className="cs-field-label">
                          <span>{t('cropStep.otherCrop', 'Or choose from other crops...')}</span>
                        </label>
                        <select
                          className="cs-select"
                          style={{ minHeight: '48px', fontSize: '15px' }}
                          value={isCustomCropSelected ? formData.crop : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              setValue('crop', e.target.value, { shouldValidate: true });
                              setIsCustomCropSelected(true);
                            }
                          }}
                        >
                          <option value="">-- {t('cropStep.chooseOtherCrop', 'Choose other crop')} --</option>
                          {MORE_CROPS.map((other) => (
                            <option key={other} value={other}>
                              {other}
                            </option>
                          ))}
                        </select>
                        {errors.crop && <span className="cs-field-error">{errors.crop.message}</span>}
                      </div>

                      <div className="step-title-group mb-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--border-card)' }}>
                        <h2 className="step-heading">{t('cropStep.selectStage', '2. What growth stage is it in?')}</h2>
                      </div>

                      <div className="stage-selector-list">
                        {GROWTH_STAGES.map((stage) => {
                          const isSelected = formData.growth_stage === stage.id;
                          return (
                            <button
                              key={stage.id}
                              type="button"
                              className={`stage-row-btn ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => setValue('growth_stage', stage.id, { shouldValidate: true })}
                            >
                              <span className="stage-icon">{stage.icon}</span>
                              <div className="stage-meta">
                                <div className="stage-name">{t(`cropStep.${stage.key}`, stage.label)}</div>
                                <div className="stage-desc">{t(`cropStep.${stage.descKey}`, stage.defaultDesc)}</div>
                              </div>
                              {isSelected && <CheckCircle2 size={18} className="stage-check text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                      {errors.growth_stage && (
                        <span className="cs-field-error mt-2">{errors.growth_stage.message}</span>
                      )}
                    </div>
                  )}

                  {/* STEP 3: SYMPTOMS */}
                  {currentStep === 3 && (
                    <div className="step-pane animate-fade-in">
                      <div className="step-title-group mb-3">
                        <h2 className="step-heading">{t('symptomsStep.title', 'What does the damage look like?')}</h2>
                        <p className="step-subheading">
                          {t('symptomsStep.selectSymptoms', 'Tap all symptoms you see on the plant:')}
                        </p>
                      </div>

                      <div className="symptom-chips-wrap mb-4">
                        {SYMPTOM_OPTIONS.map((opt) => {
                          const isSelected = (formData.selectedSymptoms || []).includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              className={`symptom-chip ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => toggleSymptom(opt.id)}
                            >
                              <span className="symptom-icon">{opt.icon}</span>
                              <span className="symptom-label">{t(opt.labelKey, opt.defaultLabel)}</span>
                              {isSelected && <CheckCircle2 size={15} className="symptom-check" />}
                            </button>
                          );
                        })}
                      </div>
                      {errors.selectedSymptoms && (
                        <span className="cs-field-error mb-3">{errors.selectedSymptoms.message}</span>
                      )}

                      <div className="cs-field-group mt-3">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <label className="cs-field-label">
                            <span>{t('symptomsStep.optionalDetails', 'Additional notes (optional):')}</span>
                          </label>
                          <VoiceInputButton
                            currentText={formData.symptomsNotes}
                            onTranscript={(text) => setValue('symptomsNotes', text, { shouldValidate: true })}
                          />
                        </div>

                        <textarea
                          rows={3}
                          className="cs-textarea"
                          placeholder={t(
                            'symptomsStep.detailsPlaceholder',
                            'Describe how long this has been happening, weather, or fertilizer used...'
                          )}
                          value={formData.symptomsNotes || ''}
                          onChange={(e) => setValue('symptomsNotes', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 4: LOCATION */}
                  {currentStep === 4 && (
                    <div className="step-pane animate-fade-in">
                      <div className="step-title-group mb-3">
                        <h2 className="step-heading">{t('locationStep.title', 'Where is this field located?')}</h2>
                        <p className="step-subheading">
                          {t('locationStep.subheading', 'Pinning your field helps detect nearby disease clusters and alert neighbor farmers.')}
                        </p>
                      </div>

                      <Suspense fallback={<Skeleton height="260px" width="100%" />}>
                        <LocationPicker
                          latitude={formData.latitude}
                          longitude={formData.longitude}
                          locationName={formData.location_name}
                          onChange={({ latitude, longitude, locationName }) => {
                            setValue('latitude', latitude, { shouldValidate: true });
                            setValue('longitude', longitude, { shouldValidate: true });
                            if (locationName) setValue('location_name', locationName, { shouldValidate: true });
                          }}
                          error={errors.location_name?.message || errors.latitude?.message}
                        />
                      </Suspense>
                    </div>
                  )}

                  {/* STEP 5: REVIEW & SUBMIT */}
                  {currentStep === 5 && (
                    <div className="step-pane animate-fade-in">
                      <div className="step-title-group mb-3">
                        <h2 className="step-heading">{t('reviewStep.title', 'Check details before sending')}</h2>
                        <p className="step-subheading">
                          {t('reviewStep.subheading', 'Review all information. You can edit any section before final submission.')}
                        </p>
                      </div>

                      <div className="review-cards-list mb-3">
                        <div className="review-summary-row">
                          <div className="review-row-left">
                            <div className="review-row-thumb">
                              {formData.image_url ? (
                                <img
                                  src={formData.image_url}
                                  alt="Crop specimen preview"
                                  width="48"
                                  height="48"
                                  loading="lazy"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <Camera size={20} className="text-muted" />
                              )}
                            </div>
                            <div>
                              <div className="review-row-label">{t('reviewStep.photoPreview', 'Crop Photo')}</div>
                              <div className="review-row-value">{t('photo.photoAttached', 'Attached & Compressed')}</div>
                            </div>
                          </div>
                          <button type="button" className="cs-btn-text" onClick={() => jumpToStep(1)}>
                            {t('common.edit', 'Edit')}
                          </button>
                        </div>

                        <div className="review-summary-row">
                          <div className="review-row-left">
                            <Sprout size={20} className="text-primary flex-shrink-0" />
                            <div>
                              <div className="review-row-label">{t('reviewStep.cropAndStage', 'Crop & Growth Stage')}</div>
                              <div className="review-row-value">
                                {formData.crop || t('common.notSelected', 'Not chosen')} &bull; {formData.growth_stage || t('common.notSelected', 'Not chosen')}
                              </div>
                            </div>
                          </div>
                          <button type="button" className="cs-btn-text" onClick={() => jumpToStep(2)}>
                            {t('common.edit', 'Edit')}
                          </button>
                        </div>

                        <div className="review-summary-row">
                          <div className="review-row-left">
                            <Stethoscope size={20} className="text-primary flex-shrink-0" />
                            <div>
                              <div className="review-row-label">{t('reviewStep.symptoms', 'Reported Symptoms')}</div>
                              <div className="review-row-value">
                                {(formData.selectedSymptoms || []).length > 0
                                  ? formData.selectedSymptoms.join(', ')
                                  : formData.symptomsNotes || t('common.none', 'None')}
                              </div>
                            </div>
                          </div>
                          <button type="button" className="cs-btn-text" onClick={() => jumpToStep(3)}>
                            {t('common.edit', 'Edit')}
                          </button>
                        </div>

                        <div className="review-summary-row">
                          <div className="review-row-left">
                            <MapPin size={20} className="text-primary flex-shrink-0" />
                            <div>
                              <div className="review-row-label">{t('reviewStep.location', 'Field Location')}</div>
                              <div className="review-row-value">
                                {formData.location_name || t('reviewStep.markedOnMap', 'Marked on map')}
                              </div>
                            </div>
                          </div>
                          <button type="button" className="cs-btn-text" onClick={() => jumpToStep(4)}>
                            {t('common.edit', 'Edit')}
                          </button>
                        </div>
                      </div>

                      {/* Auto-filled Weather Card (No manual entry for farmers) */}
                      {autoWeather && (
                        <div className="auto-weather-card mb-4">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <CloudSun size={18} className="text-primary" />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                              {t('reviewStep.weatherCard', 'Local Field Weather (Auto-detected)')}
                            </span>
                          </div>

                          <div className="auto-weather-stats">
                            <div className="weather-stat-item">
                              <Thermometer size={14} className="text-muted" />
                              <span>{autoWeather.temperature}°C</span>
                            </div>
                            <div className="weather-stat-item">
                              <Droplets size={14} className="text-muted" />
                              <span>{autoWeather.humidity}% {t('reviewStep.humidity', 'Humidity')}</span>
                            </div>
                            <div className="weather-stat-item">
                              <CloudRain size={14} className="text-muted" />
                              <span>{autoWeather.rainfall} mm {t('reviewStep.rain', 'Rain')}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {submissionError && (
                        <div className="cs-input-error-banner mb-3" role="alert">
                          <AlertTriangle size={16} className="flex-shrink-0" />
                          <span>{submissionError}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Wizard Bottom Navigation Action Bar */}
                  <div className="farmer-wizard-actions mt-4 pt-3" style={{ borderTop: '1px solid var(--border-card)' }}>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        className="cs-btn cs-btn-secondary"
                        style={{ minHeight: '48px', padding: '12px 18px', fontSize: '15px' }}
                        onClick={handlePrevStep}
                        disabled={submittingStep === 'submitting'}
                      >
                        <ArrowLeft size={16} className="icon-mr" />
                        {t('common.back', 'Back')}
                      </button>
                    )}

                    {currentStep < 5 ? (
                      <button
                        type="button"
                        className="cs-btn cs-btn-primary"
                        style={{ minHeight: '52px', padding: '12px 24px', fontSize: '16px', fontWeight: 700, flex: 1 }}
                        onClick={handleNextStep}
                      >
                        <span>{t('common.next', 'Next')}</span>
                        <ArrowRight size={18} className="icon-ml" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="cs-btn cs-btn-primary"
                        style={{ minHeight: '52px', padding: '12px 24px', fontSize: '16px', fontWeight: 800, flex: 1 }}
                        onClick={handleSubmitReport}
                        disabled={submittingStep === 'submitting'}
                      >
                        {submittingStep === 'submitting' ? (
                          <>
                            <span className="spin icon-mr">&#9696;</span>
                            <span>{t('reviewStep.submittingBtn', 'Analyzing crop with AI...')}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={18} className="icon-mr" />
                            <span>{t('reviewStep.submitBtn', 'Submit for Instant Diagnosis')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Desktop Sticky Result/Preview Panel (Visible on Desktop >=1024px) */}
        <aside className="farmer-wizard-desktop-aside">
          <div className="sticky-preview-panel">
            {analyzedResult ? (
              /* Sticky Result Panel on Desktop when submitted */
              renderResultCard()
            ) : (
              /* Live Preview Panel on Desktop during steps 1-5 */
              <>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
                  {t('wizard.desktopSummaryTitle', 'Report Summary Preview')}
                </h3>

                <div className="side-panel-photo mb-3">
                  {formData.image_url ? (
                    <img
                      src={formData.image_url}
                      alt="Attached crop specimen"
                      width="260"
                      height="160"
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="side-panel-placeholder">
                      <Camera size={28} className="text-muted mb-1" />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {t('photo.noPhotoYet', 'No photo added yet')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="side-panel-details">
                  <div className="side-panel-row">
                    <span className="text-muted">{t('cropStep.cropLabel', 'Crop')}:</span>
                    <strong>{formData.crop || t('common.notSelected', 'Not chosen')}</strong>
                  </div>
                  <div className="side-panel-row">
                    <span className="text-muted">{t('cropStep.stageLabel', 'Stage')}:</span>
                    <strong>{formData.growth_stage || t('common.notSelected', 'Not chosen')}</strong>
                  </div>
                  <div className="side-panel-row">
                    <span className="text-muted">{t('symptomsStep.symptomsLabel', 'Symptoms')}:</span>
                    <span>{(formData.selectedSymptoms || []).length} {t('common.marked', 'marked')}</span>
                  </div>
                  <div className="side-panel-row">
                    <span className="text-muted">{t('locationStep.fieldLabel', 'Field')}:</span>
                    <span>{formData.location_name || t('locationStep.notPinnedYet', 'Not pinned')}</span>
                  </div>
                </div>

                <div className="side-panel-tip mt-4">
                  <Info size={14} className="text-primary flex-shrink-0" />
                  <span>{t('wizard.desktopTip', 'Diagnosis and curated treatment will be shown right here upon submission.')}</span>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
