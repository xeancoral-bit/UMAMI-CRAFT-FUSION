import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

export default function AllergyVerificationModal({
  isOpen,
  kioskId,
  restaurantName = 'Umami Craft Fusion',
  onSelectYes,
  onSelectNo,
  errorMsg = ''
}) {
  const [selectedChoice, setSelectedChoice] = useState(null); // 'yes' | 'no'
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChoose = async (choice) => {
    if (submitting) return;
    setSelectedChoice(choice);
    setSubmitting(true);
    try {
      if (choice === 'yes') {
        await onSelectYes();
      } else {
        await onSelectNo();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="kiosk-modal-backdrop allergy-verify-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="allergy-verify-heading"
    >
      <div className="allergy-verify-modal" onClick={(e) => e.stopPropagation()}>
        {/* Verified QR Session Pill */}
        <div className="allergy-verify-session-pill">
          <ShieldCheck size={14} />
          <span>
            {restaurantName}
            {kioskId ? ` • Kiosk #${kioskId}` : ' • Verified QR Session'}
          </span>
        </div>

        {/* Allergy Icon Badge */}
        <div className="allergy-verify-icon-wrap">
          <ShieldAlert size={36} color="#C24522" strokeWidth={2.2} />
        </div>

        {/* Heading & Description */}
        <h2 id="allergy-verify-heading" className="allergy-verify-title">
          Do You Have Any Food Allergies?
        </h2>
        <p className="allergy-verify-desc">
          Help us personalize your dining experience and identify ingredients that may not be suitable for you.
        </p>

        {errorMsg && (
          <div className="allergy-verify-error">
            {errorMsg}
          </div>
        )}

        {/* Required Decision Buttons */}
        <div className="allergy-verify-actions">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleChoose('yes')}
            className={`allergy-verify-btn allergy-verify-btn--yes ${selectedChoice === 'yes' ? 'selected' : ''}`}
          >
            <div className="allergy-verify-btn-content">
              <span className="allergy-verify-btn-title">YES, I HAVE ALLERGIES</span>
              <span className="allergy-verify-btn-sub">
                Select allergens to exclude &amp; customize your Local Dietary Vault
              </span>
            </div>
            {submitting && selectedChoice === 'yes' ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <ArrowRight size={20} />
            )}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleChoose('no')}
            className={`allergy-verify-btn allergy-verify-btn--no ${selectedChoice === 'no' ? 'selected' : ''}`}
          >
            <div className="allergy-verify-btn-content">
              <span className="allergy-verify-btn-title">NO, I DON&apos;T HAVE ALLERGIES</span>
              <span className="allergy-verify-btn-sub">
                Continue directly to the menu &amp; ordering interface
              </span>
            </div>
            {submitting && selectedChoice === 'no' ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <CheckCircle2 size={20} />
            )}
          </button>
        </div>

        <p className="allergy-verify-footer-note">
          Please select an option to proceed. Your response is private to this dining session.
        </p>
      </div>
    </div>
  );
}

