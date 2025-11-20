import React from 'react';
import { Check } from 'lucide-react';

interface StepsProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

const steps = [
  { id: 1, name: 'Configuration' },
  { id: 2, name: 'Upload & Parse' },
  { id: 3, name: 'Preview & AI' },
  { id: 4, name: 'Submit' },
];

export const Steps: React.FC<StepsProps> = ({ currentStep, onStepClick }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
            {step.id < currentStep ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-coveo-blue" />
                </div>
                <button 
                  onClick={() => onStepClick(step.id)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full bg-coveo-blue hover:bg-blue-800 cursor-pointer"
                >
                  <Check className="h-5 w-5 text-white" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                </button>
              </>
            ) : step.id === currentStep ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200" />
                </div>
                <button 
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-coveo-blue bg-white cursor-default" 
                  aria-current="step"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-coveo-blue" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                </button>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200" />
                </div>
                <button className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white cursor-not-allowed">
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300" aria-hidden="true" />
                  <span className="sr-only">{step.name}</span>
                </button>
              </>
            )}
            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-32 text-center text-xs font-medium text-gray-500">
                {step.name}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};