import React from 'react';
import { STATUS_LABELS, STATUS_ORDER } from '@/constants/invoiceStatuses';
import { Check } from 'lucide-react';

const InvoiceStatusStepper = ({ currentStatus, compact = false }) => {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {STATUS_ORDER.map((status, index) => (
          <div
            key={status}
            className={`h-1.5 flex-1 rounded-full ${
              index <= currentIndex ? 'bg-primary' : 'bg-muted'
            }`}
            title={STATUS_LABELS[status]}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        {STATUS_ORDER.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <React.Fragment key={status}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 ${
                    isCompleted
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isCurrent
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                <span
                  className={`text-[10px] mt-1 text-center leading-tight max-w-[60px] ${
                    isCurrent ? 'font-semibold text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>
              {index < STATUS_ORDER.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mb-5 ${
                    index < currentIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default InvoiceStatusStepper;
