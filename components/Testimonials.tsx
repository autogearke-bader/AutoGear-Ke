
import React from 'react';
import { TESTIMONIALS } from '../constants.ts';

const Testimonials: React.FC = () => {
  return (
    <div className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory gap-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible no-scrollbar">
      {TESTIMONIALS.map((testimonial) => (
        <div 
          key={testimonial.id} 
          className="snap-center min-w-[85vw] md:min-w-[45vw] lg:min-w-full bg-slate-900/50 backdrop-blur-sm p-6 md:p-8 rounded-[2.5rem] border border-slate-800 shadow-xl flex flex-col hover:border-blue-600/30 transition-colors group"
        >
          {/* Star Rating */}
          <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <svg 
                key={i} 
                className={`w-4 h-4 ${i < testimonial.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          {/* Quote Text */}
          <p className="text-slate-300 text-sm md:text-base italic leading-relaxed mb-6 flex-grow">
            "{testimonial.text}"
          </p>

          {/* Reviewer Info */}
          <div className="flex items-center gap-4 border-t border-slate-800 pt-6">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 font-black text-xs border border-blue-500/10 group-hover:bg-blue-600 group-hover:text-white transition-all">
              {testimonial.name.charAt(0)}
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">{testimonial.name}</h4>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px] uppercase font-black tracking-widest">{testimonial.carModel}</span>
                <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                <span className="text-slate-500 text-[10px] font-medium">{testimonial.date}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Testimonials;
