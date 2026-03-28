import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMyClientLeads, submitReview } from '../src/lib/api';
import { getMyClientProfile, getCurrentUser } from '../src/lib/auth';

const BookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    technicianId: string;
    technicianName: string;
    leadId: string;
    rating: number;
    comment: string;
    wouldReBook: 'yes' | 'no';
  }>({
    open: false,
    technicianId: '',
    technicianName: '',
    leadId: '',
    rating: 5,
    comment: '',
    wouldReBook: 'yes',
  });

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          navigate('/');
          return;
        }

        // Load client profile - this handles both email/password and Google OAuth users
        // For Google OAuth users, they may not have role set in metadata but will have a client profile
        const profile = await getMyClientProfile();
        if (!profile) {
          // User is authenticated but no client profile - show profile completion instead of redirecting
          console.log('No client profile found, user needs to complete profile');
          setNeedsProfile(true);
          setLoading(false);
          return;
        }

        const clientLeads = await getMyClientLeads();
        setLeads(clientLeads || []);
      } catch (err) {
        console.error('Failed to load bookings:', err);
        setError('Failed to load bookings');
        setTimeout(() => setError(''), 3000);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [navigate]);

  const handleOpenReview = (lead: any) => {
    setReviewModal({
      open: true,
      technicianId: lead.technician_id,
      technicianName: lead.technicians?.business_name || 'Technician',
      leadId: lead.id,
      rating: 5,
      comment: '',
      wouldReBook: 'yes',
    });
  };

  const handleSubmitReview = async () => {
    setSaving(true);
    try {
      await submitReview(
        reviewModal.technicianId,
        reviewModal.rating,
        reviewModal.comment,
        reviewModal.wouldReBook
      );

      // Close modal
      setReviewModal({ ...reviewModal, open: false });

      // Show success message
      setSuccess('Review submitted successfully!');
      setTimeout(() => setSuccess(''), 3000);

      // Refresh leads
      const clientLeads = await getMyClientLeads();
      setLeads(clientLeads || []);
    } catch (err) {
      console.error('Failed to submit review:', err);
      setError('Failed to submit review');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; label: string }> = {
      job_done: { bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', label: '✓ Completed' },
      in_progress: { bg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', label: '⟳ In Progress' },
      contacted: { bg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', label: '● Contacted' },
      no_response: { bg: 'bg-red-500/10 text-red-400 border border-red-500/20', label: '✕ Not Possible' },
      pending: { bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', label: '○ Pending' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${config.bg}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center"
            aria-label="Go back"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">My Bookings</h1>
        </div>

        {/* Booking Summary */}
        {leads.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Bookings</p>
                <p className="text-2xl font-black text-white">{leads.length}</p>
              </div>
              <div className="flex gap-3 text-center">
                <div className="bg-emerald-500/10 rounded-xl px-3 py-2">
                  <p className="text-emerald-400 text-lg font-black">{leads.filter(l => l.status === 'job_done').length}</p>
                  <p className="text-emerald-400/70 text-[10px] uppercase">Completed</p>
                </div>
                <div className="bg-blue-500/10 rounded-xl px-3 py-2">
                  <p className="text-blue-400 text-lg font-black">{leads.filter(l => l.status === 'in_progress').length}</p>
                  <p className="text-blue-400/70 text-[10px] uppercase">In Progress</p>
                </div>
                <div className="bg-amber-500/10 rounded-xl px-3 py-2">
                  <p className="text-amber-400 text-lg font-black">{leads.filter(l => l.status === 'pending').length}</p>
                  <p className="text-amber-400/70 text-[10px] uppercase">Pending</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-lg mb-4">
            {success}
          </div>
        )}
      </header>

      {/* Bookings List */}
      <section className="px-4">
        {needsProfile ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">👤</div>
            <p className="text-white font-bold mb-2">Complete Your Profile</p>
            <p className="text-slate-400 text-sm mb-4">
              Please complete your profile to view and manage your bookings.
            </p>
            <Link
              to="/profile"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all"
            >
              Complete Profile
            </Link>
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-white font-bold mb-2">No bookings yet</p>
            <p className="text-slate-400 text-sm mb-4">
              You haven't made any bookings. Browse technicians and book your first service!
            </p>
            <Link
              to="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all"
            >
              Browse Technicians
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-bold text-sm truncate">
                      {lead.technicians?.business_name || 'Technician'}
                    </h3>
                    <p className="text-slate-400 text-xs truncate">
                      {lead.service_name}
                    </p>
                    <p className="text-slate-500 text-[10px] mt-1">
                      {formatDate(lead.created_at)}
                    </p>
                  </div>
                  {getStatusBadge(lead.status)}
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/technician/${lead.technicians?.slug}`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all"
                  >
                    View Technician
                  </Link>
                  {lead.status === 'job_done' && (
                    <button
                      onClick={() => handleOpenReview(lead)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all"
                    >
                      ⭐ Leave Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Review Modal */}
      {reviewModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Review {reviewModal.technicianName}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewModal({ ...reviewModal, rating: star })}
                    className={`text-2xl ${star <= reviewModal.rating ? 'text-yellow-400' : 'text-slate-600'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">Your Review</label>
              <textarea
                value={reviewModal.comment}
                onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                placeholder="Share your experience..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">Would you book again?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="wouldReBook"
                    checked={reviewModal.wouldReBook === 'yes'}
                    onChange={() => setReviewModal({ ...reviewModal, wouldReBook: 'yes' })}
                    className="text-blue-500"
                  />
                  <span className="text-white text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="wouldReBook"
                    checked={reviewModal.wouldReBook === 'no'}
                    onChange={() => setReviewModal({ ...reviewModal, wouldReBook: 'no' })}
                    className="text-blue-500"
                  />
                  <span className="text-white text-sm">No</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setReviewModal({ ...reviewModal, open: false })}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={saving}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold text-sm rounded-xl transition-colors"
              >
                {saving ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
