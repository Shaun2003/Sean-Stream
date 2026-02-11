
'use client';

import { useState } from 'react';

const OnboardingFlow = () => {
  const [step, setStep] = useState(1);

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Welcome to Sean Streams!</h2>
            <p>Let's get you set up.</p>
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Personalize Your Experience</h2>
            <p>Tell us what you like.</p>
          </div>
        )}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">All Set!</h2>
            <p>Enjoy your personalized music experience.</p>
          </div>
        )}
        <div className="mt-8 flex justify-between">
          {step > 1 && <button onClick={handlePrev} className="px-4 py-2 bg-gray-600 rounded-md">Previous</button>}
          {step < 3 && <button onClick={handleNext} className="px-4 py-2 bg-green-600 rounded-md">Next</button>}
          {step === 3 && <button onClick={() => localStorage.setItem('onboardingComplete', 'true')} className="px-4 py-2 bg-green-600 rounded-md">Finish</button>}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
