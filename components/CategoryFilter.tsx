import React from 'react';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelect
}) => {
  return (
    <section className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/50">
      <div className="relative max-w-7xl mx-auto">
        {/* Scrollable Container with Peeking Effect */}
        <div className="overflow-x-auto scrollbar-hide whitespace-nowrap px-4 md:px-8 py-2">
          <div className="inline-flex items-center gap-2 md:gap-3">
            {categories.map((brand) => (
              <button
                key={brand}
                onClick={() => onSelect(brand)}
                className={`
                  px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-300 border active:scale-95
                  ${selectedCategory === brand
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/25'
                    : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-600'
                  }
                `}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
        
        {/* Gradient Fade Mask for Peeking Effect */}
        <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none md:hidden" />
      </div>
    </section>
  );
};

export default CategoryFilter;
