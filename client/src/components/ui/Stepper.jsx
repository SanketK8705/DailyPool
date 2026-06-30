import React, { useState, Children } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StarBorder from './StarBorder';

const stepVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: '0%',
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  onBeforeStepAdvance = () => ({ success: true }),
  nextButtonText = 'Continue',
  backButtonText = 'Back',
  setError = null,
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);

  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isLastStep = currentStep === totalSteps;

  const handleNext = () => {
    if (onBeforeStepAdvance) {
      const check = onBeforeStepAdvance(currentStep);
      if (check && !check.success) {
        if (setError) {
          setError(check.error);
        } else {
          alert(check.error);
        }
        return;
      }
    }
    if (setError) setError(''); // Clear previous error upon success

    if (currentStep < totalSteps) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
      onStepChange(currentStep + 1);
    } else {
      onFinalStepCompleted();
    }
  };

  const handleBack = () => {
    if (setError) setError(''); // Clear error on back
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
      onStepChange(currentStep - 1);
    }
  };


  return (
    <div className="w-full flex flex-col">
      {/* Step Indicators */}
      <div className="flex items-center justify-between mb-8 px-2">
        {stepsArray.map((_, idx) => {
          const stepNum = idx + 1;
          const isActive = currentStep === stepNum;
          const isCompleted = currentStep > stepNum;

          return (
            <React.Fragment key={stepNum}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                    isActive
                      ? 'bg-brand-secondary border-brand-secondary text-white ring-4 ring-brand-secondary/20'
                      : isCompleted
                      ? 'bg-brand-accent border-brand-accent text-slate-900'
                      : 'bg-slate-950 border-brand-border text-slate-500'
                  }`}
                >
                  {stepNum}
                </div>
                <span className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-500'}`}>
                  {idx === 0 ? 'Locations' : idx === 1 ? 'Schedule' : 'Preferences'}
                </span>
              </div>
              {idx < totalSteps - 1 && (
                <div className="flex-1 h-[2px] bg-brand-border mx-4 rounded-full">
                  <div
                    className="h-full bg-brand-accent transition-all duration-300"
                    style={{ width: isCompleted ? '100%' : '0%' }}
                  ></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Animated Step Content */}
      <div className="relative overflow-hidden min-h-[320px] mb-8">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="w-full"
          >
            {stepsArray[currentStep - 1]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between border-t border-brand-border/40 pt-4">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
          >
            {backButtonText}
          </button>
        ) : (
          <div></div> // placeholder to push next button right
        )}
        
        <StarBorder
          type="button"
          onClick={handleNext}
          className="text-slate-900 font-bold px-6 py-2.5"
        >
          {isLastStep ? 'Submit & Match' : nextButtonText}
        </StarBorder>
      </div>
    </div>
  );
}
