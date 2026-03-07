import { Bundle } from '../types.ts';
import WhatsAppButton from './WhatsAppButton.tsx';

interface BundleCardProps {
  bundle: Bundle;
}

const BundleCard: React.FC<BundleCardProps> = ({ bundle }) => {
  const savings = bundle.originalPrice - bundle.totalPrice;
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900 rounded-xl p-4 md:p-6 lg:p-8 border-2 border-blue-200 dark:border-blue-600/30 relative shadow-sm transition-all duration-300 w-full max-w-[600px] flex flex-row flex-wrap items-center justify-between gap-3 flex-shrink-0">
      {/* Badge - positioned absolutely on larger screens, inline on mobile */}
      <div className="absolute top-0 left-2 md:absolute md:top-2 md:left-2 bg-blue-600 text-white text-[8px] md:text-xs font-bold px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-widest z-10">
        Best Value
      </div>
  
      {/* Left side: Name and Tags */}
      <div className="flex-1 min-w-[120px] pr-2">
        <h3 className="text-sm md:text-xl font-bold text-slate-900 dark:text-white">{bundle.name}</h3>
        <div className="flex flex-wrap gap-0.5 mt-1">
          {bundle.products.slice(0, 3).map((p, idx) => (
            <span key={idx} className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[8px] px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              {p}
            </span>
          ))}
          {bundle.products.length > 3 && (
            <span className="text-[8px] text-slate-500 px-1 py-0.5">+{bundle.products.length - 3}</span>
          )}
        </div>
      </div>
  
      {/* Right side: Price and Button */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-col items-end">
          <span className="text-lg md:text-xl font-black text-slate-900 dark:text-white">KSh {bundle.totalPrice.toLocaleString()}</span>
          <span className="text-[8px] md:text-sm text-slate-400 dark:text-slate-500 line-through">KSh {bundle.originalPrice.toLocaleString()}</span>
          <span className="text-[8px] md:text-xs text-green-600 dark:text-green-500 font-bold">Save KSh {savings}</span>
        </div>
        <WhatsAppButton 
          fullWidth={false}
          label="Get Deal"
          className="!text-[10px] !px-2 !py-1"
          message={`Hello AutoGear, I want to order the "${bundle.name}" (Bundle ID: ${bundle.id}) for KSh ${bundle.totalPrice}. Is this bundle currently available?`}
        />
      </div>
    </div>
  );
};

export default BundleCard;
