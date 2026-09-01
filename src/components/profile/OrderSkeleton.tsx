import React from 'react';

export const OrderSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm animate-pulse space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-stone-200 rounded-md" />
              <div className="h-3.5 w-44 bg-stone-100 rounded-md" />
            </div>
            <div className="h-6 w-24 bg-stone-200 rounded-full" />
          </div>

          <div className="pt-2 border-t border-stone-100 space-y-2">
            <div className="h-4 w-48 bg-stone-100 rounded-md" />
            <div className="h-4 w-36 bg-stone-100 rounded-md" />
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
            <div className="h-6 w-20 bg-stone-200 rounded-md" />
            <div className="flex gap-2">
              <div className="h-9 w-24 bg-stone-200 rounded-xl" />
              <div className="h-9 w-24 bg-amber-200 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
