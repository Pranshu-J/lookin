// pages/index.js
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
// Import useSearchParams from next/navigation for App Router
import { useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabaseClient'; // Ensure this path is correct

// --- SVG Icon, GlobalStyles, Styles remain the same ---

// Simple SVG Magnifying Glass Icon component
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

// Add keyframes for spinner animation globally
const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}</style>
);

// --- Styles ---
const styles = {
  pageContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100%',
    padding: '20px',
    boxSizing: 'border-box',
  },
  formContainer: {
    width: '100%',
    maxWidth: '600px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: '9999px',
    border: '1px solid #ccc',
    padding: '5px 5px 5px 25px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
  },
  inputField: {
    flexGrow: 1,
    border: 'none',
    outline: 'none',
    fontSize: '1rem',
    backgroundColor: 'transparent',
    paddingRight: '60px', // Ensure space for the button
    height: '45px',
    boxSizing: 'border-box',
    color:"black",
  },
  searchButton: {
    position: 'absolute',
    right: '5px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  searchButtonDisabled: {
    backgroundColor: '#cccccc',
    cursor: 'not-allowed',
  },
  spinner: {
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTop: '3px solid #ffffff',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    animation: 'spin 1s linear infinite',
  },
  resultContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  resultImage: {
    width: '250px',
    height: '250px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '25px',
    border: '3px solid white',
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
    background: '#eee'
  },
  resultText: {
    fontSize: '1.2rem',
    color: '#333', // Changed for better visibility on default background
    maxWidth: '600px',
    wordWrap: 'break-word',
  },
};


// --- THE ONE AND ONLY Home Component Definition ---
export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submittedTask, setSubmittedTask] = useState(null);
  const [resultValue, setResultValue] = useState(null);

  const subscriptionRef = useRef(null);
  const initialQueryProcessed = useRef(false); // Ref to track if initial query param has been processed

  // Get search params
  const searchParams = useSearchParams();

  // --- Core Submission Logic ---
  // Encapsulated the submission logic in a useCallback to ensure its identity is stable
  // across renders, preventing unnecessary re-runs of the useEffect that depends on it.
  const submitUrl = useCallback(async (urlToSubmit) => {
    // Basic validation
    if (!urlToSubmit || !urlToSubmit.trim()) {
      console.warn("Input URL cannot be empty.");
      setError("Input URL cannot be empty."); // Optionally show user-friendly error
      return;
    } else if (!urlToSubmit.includes("media.licdn.com")) {
      console.warn("URL must be a LinkedIn media URL");
      setError("URL must be a LinkedIn media URL."); // Optionally show user-friendly error
      return;
    }

    console.log("Attempting to submit URL:", urlToSubmit);
    setLoading(true);
    setError(null);
    setResultValue(null);
    setSubmittedTask(null); // Clear previous task/result immediately

    let tempSubmittedTask = null;

    try {
      const { data, error: insertError } = await supabase
        .from('ImageURLs')
        .insert([{ url: urlToSubmit, job_status: 'pending' }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        console.log('Task submitted successfully:', data);
        tempSubmittedTask = data;
        setSubmittedTask(tempSubmittedTask); // Trigger useEffect for subscription
        // Don't clear inputValue here, especially if it came from query param
      } else {
        throw new Error("No data returned after insert.");
      }
    } catch (err) {
      console.error("Error submitting task:", err);
      setError(err.message || "Failed to submit task.");
      setSubmittedTask(null); // Clear task on error
    } finally {
      // Important: Set loading to false *after* potentially setting submittedTask
      // to ensure the subscription useEffect can trigger correctly.
       setLoading(false);
    }
  }, [supabase]); // Dependency: supabase client instance

  // --- Effect to handle initial query parameter ---
  useEffect(() => {
    const queryUrl = searchParams.get('q');

    // Process only if:
    // 1. A 'q' param exists.
    // 2. We haven't processed the initial query param yet in this component instance.
    // 3. We are not currently in a loading state (e.g., from a previous action).
    if (queryUrl && !initialQueryProcessed.current && !loading) {
      console.log("Found URL in query parameter:", queryUrl);
      initialQueryProcessed.current = true; // Mark as processed
      // Optional: Populate the input field visually
      // setInputValue(queryUrl);
      // Trigger the submission process
      submitUrl(queryUrl);
    }
    // This effect should run when searchParams changes or submitUrl reference changes.
    // The initialQueryProcessed ref prevents re-submission on subsequent renders unless
    // the component fully remounts (e.g., full page reload).
    // If you needed it to re-submit when the *value* of 'q' changes via client-side
    // navigation, the logic would need adjustment (e.g., storing the processed URL in the ref).
  }, [searchParams, loading, submitUrl]);


  // --- Form Submit Handler ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    // Use the shared submission logic
    submitUrl(inputValue);
     // Clear input field after manual submission attempt starts
     // Do this *after* calling submitUrl as it uses inputValue
    setInputValue('');
  };

  // --- Effect for Supabase Realtime Subscription ---
  useEffect(() => {
    if (!submittedTask?.id) {
      if (subscriptionRef.current) {
        console.log(`Cleaning up subscription because submittedTask is null or invalid.`);
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      return;
    }

    // Cleanup previous subscription before creating a new one
    if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        .then(() => console.log(`Removed previous subscription channel.`))
        .catch(err => console.error("Error removing channel:", err));
        subscriptionRef.current = null;
    }

    console.log(`Setting up listener for task ID: ${submittedTask.id}`);

    const handleBroadcast = (payload) => {
      console.log('Broadcast received:', payload);
      if (payload.new && payload.new.id === submittedTask.id && payload.new.result) {
        console.log(`Result received for task ${submittedTask.id}:`, payload.new.result);
        setResultValue(payload.new.result);

        if (subscriptionRef.current) {
            supabase.removeChannel(subscriptionRef.current)
            .then(() => console.log(`Unsubscribed after receiving result for task ${submittedTask.id}`))
            .catch(err => console.error("Error unsubscribing channel:", err));
            subscriptionRef.current = null;
        }
      } else if (payload.new && payload.new.id === submittedTask.id) {
         console.log(`Update received for task ${submittedTask.id}, but no result yet. Status: ${payload.new.job_status}`);
      } else {
         console.log(`Ignoring broadcast for different task ID (${payload.new?.id}) or missing data.`);
      }
    };

    const channel = supabase
      .channel(`task-result-${submittedTask.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ImageURLs',
          filter: `id=eq.${submittedTask.id}`
        },
        handleBroadcast
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to updates for task ${submittedTask.id}`);
        } else if (err) {
           console.error('Subscription error:', status, err);
           setError(`Subscription failed: ${err.message || status}`);
            if (subscriptionRef.current) {
               supabase.removeChannel(subscriptionRef.current);
               subscriptionRef.current = null;
            }
        } else {
            console.log('Subscription status:', status);
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log(`Cleaning up subscription effect for task ID: ${submittedTask?.id}`);
        supabase.removeChannel(subscriptionRef.current)
         .catch(err => console.error("Error cleaning up channel:", err));
        subscriptionRef.current = null;
      }
    };
  }, [submittedTask, supabase]); // Dependencies for subscription effect

  // Determine view based on state
  const showResultView = submittedTask?.url && resultValue !== null;

  return (
    <div style={styles.pageContainer}>
      <GlobalStyles />

      {showResultView ? (
        // --- Result View ---
        <div style={styles.resultContainer}>
          <img
            key={submittedTask.id} // Use submittedTask.id for key
            src={`/api/image-proxy?url=${encodeURIComponent(submittedTask.url)}`}
            alt="Submitted content visualization"
            style={styles.resultImage}
            onError={(e) => {
              console.error("Failed to load image VIA PROXY for url:", submittedTask.url);
              e.target.style.display = 'none';
            }}
          />
          <p style={styles.resultText}>{resultValue}</p>
           {/* Optional: Add a button to start a new search */}
           <button onClick={() => {
               setSubmittedTask(null);
               setResultValue(null);
               setError(null);
               setInputValue(''); // Clear input for next search
               initialQueryProcessed.current = false; // Allow query param again if page reloads/navigates
           }} style={{marginTop: '20px', padding: '10px 20px', cursor: 'pointer'}}>
               New Search
           </button>
        </div>
      ) : (
        // --- Input View ---
        <form onSubmit={handleSubmit} style={styles.formContainer}>
          <div style={styles.inputWrapper}>
            <input
              type="url"
              placeholder="Enter LinkedIn media URL..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading} // Disable input while loading
              style={styles.inputField}
              required // Keep HTML5 validation
            />
            <button
              type="submit"
              disabled={loading || (!inputValue.trim() && !loading)} // Also disable if empty and not loading
              style={loading || !inputValue.trim() ? {...styles.searchButton, ...styles.searchButtonDisabled} : styles.searchButton}
              aria-label="Submit task"
            >
              {loading ? (
                 <div style={styles.spinner}></div>
              ) : (
                <SearchIcon />
              )}
            </button>
          </div>
           {/* Display user-friendly errors */}
           {error && <p style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>Error: {error}</p>}
        </form>
      )}
    </div>
  );
}