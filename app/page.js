// pages/index.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient'; // Ensure this path is correct for your project

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
// If using Next.js default styling (global CSS or CSS Modules), put this in a CSS file.
// Using <style jsx global> tag for self-contained example.
const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}</style>
);

// --- Styles ---
// Define styles outside the component for better readability
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
  // Input View Styles
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
    paddingRight: '60px',
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
  // Result View Styles
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
    color: '#333',
    maxWidth: '600px',
    wordWrap: 'break-word',
  },
};


// --- THE ONE AND ONLY Home Component Definition ---
export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Keep error state for logic, don't display
  const [submittedTask, setSubmittedTask] = useState(null);
  const [resultValue, setResultValue] = useState(null);

  const subscriptionRef = useRef(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!inputValue.trim()) {
      console.warn("Input cannot be empty.");
      return;
    } else if (!inputValue.includes("media.licdn.com")){
      console.warn("URL must be a LinkedIn profile URL")
      return;
    }
    setLoading(true);
    setError(null);
    setResultValue(null);
    // Reset submittedTask ONLY when starting a NEW submission
    // If you want the old image/result to disappear immediately on submit, uncomment the line below
    // setSubmittedTask(null);

    let tempSubmittedTask = null; // Use a temporary variable

    try {
      const { data, error: insertError } = await supabase
        .from('ImageURLs')
        .insert([{ url: inputValue, job_status: 'pending' }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        console.log('Task submitted:', data);
        tempSubmittedTask = data; // Store in temp variable first
        // Clear input ONLY on successful submission start
        // Keep the old URL in state until the new result arrives if needed,
        // but we want to trigger the useEffect, so setSubmittedTask
        setSubmittedTask(tempSubmittedTask); // This triggers the useEffect
        setInputValue('');
      } else {
        throw new Error("No data returned after insert.");
      }
    } catch (err) {
      console.error("Error submitting task:", err);
      setError(err.message || "Failed to submit task.");
      setSubmittedTask(null); // Clear task on error
    } finally {
      // Set loading false *after* state updates related to submission
      setLoading(false);
    }
  };

  useEffect(() => {
    // Guard clause: Only run if submittedTask exists and has an ID
    if (!submittedTask?.id) {
      // If there's an existing subscription when submittedTask becomes null/invalid, clean it up
      if (subscriptionRef.current) {
          console.log(`Cleaning up subscription because submittedTask is null or invalid.`);
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
      }
      return;
    }


    // Clean up previous subscription *before* creating a new one
    // This handles rapid resubmissions correctly
    if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        .then(() => console.log(`Removed previous subscription channel.`))
        .catch(err => console.error("Error removing channel:", err));
        subscriptionRef.current = null;
    }

    console.log(`Setting up listener for task ID: ${submittedTask.id}`);

    const handleBroadcast = (payload) => {
      console.log('Broadcast received:', payload);
      // Ensure the payload is for the currently active submitted task ID
      if (payload.new && payload.new.id === submittedTask.id && payload.new.result) {
        console.log(`Result received for task ${submittedTask.id}:`, payload.new.result);
        setResultValue(payload.new.result); // Update the result state

        // Unsubscribe *after* receiving the result for this specific task
        if (subscriptionRef.current) {
            supabase.removeChannel(subscriptionRef.current)
            .then(() => console.log(`Unsubscribed after receiving result for task ${submittedTask.id}`))
            .catch(err => console.error("Error unsubscribing channel:", err));
            subscriptionRef.current = null; // Clear the ref
        }
      } else if (payload.new && payload.new.id === submittedTask.id) {
         console.log(`Update received for task ${submittedTask.id}, but no result yet. Status: ${payload.new.job_status}`);
         // Optionally update status visually if needed, but requirement is not to show it
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
           // Attempt cleanup on error
            if (subscriptionRef.current) {
               supabase.removeChannel(subscriptionRef.current);
               subscriptionRef.current = null;
            }
        } else {
            console.log('Subscription status:', status); // Log other statuses like CLOSED, TIMED_OUT
        }
      });

    // Store the channel in the ref
    subscriptionRef.current = channel;

    // Cleanup function: This runs when the component unmounts OR when submittedTask changes
    return () => {
      if (subscriptionRef.current) {
        console.log(`Cleaning up subscription effect for task ID: ${submittedTask?.id}`);
        supabase.removeChannel(subscriptionRef.current)
         .catch(err => console.error("Error cleaning up channel:", err));
        subscriptionRef.current = null;
      }
    };
  // React Hook useEffect has a missing dependency: 'supabase'. Either include it or remove the dependency array.
  // Supabase client instance is generally stable and often omitted, but adding it follows linting rules.
  }, [submittedTask, supabase]); // Dependency array includes submittedTask

  // Determine if we should show the result view
  // Show result view ONLY if we have a submitted task AND received a non-null result for *that* task
  // Using submittedTask.url ensures we only show the image for the *current* task result
  const showResultView = submittedTask?.url && resultValue !== null;

  return (
    <div style={styles.pageContainer}>
      <GlobalStyles /> {/* Add global styles for spinner animation */}

      {showResultView ? (
// --- Result View ---
    <div style={styles.resultContainer}>
      <img
        key={submittedTask.id} // Keep the key
        // Use the proxy endpoint
        src={`/api/image-proxy?url=${encodeURIComponent(submittedTask.url)}`}
        alt="Submitted content visualization"
        style={styles.resultImage}
        onError={(e) => {
          // This error handler might still catch errors if the *proxy* fails
          console.error("Failed to load image VIA PROXY for url:", submittedTask.url);
          console.error("Proxy request URL:", e.target.src); // Log the proxy URL
          e.target.style.display = 'none'; // Hide broken image icon
          // Optionally display a generic placeholder
          // e.target.src = '/placeholder-image.png';
        }}
      />
      <p style={styles.resultText}>{resultValue}</p>
    </div>
      ) : (
        // --- Input View ---
        // Render input view if not showing results OR if loading a new task
        <form onSubmit={handleSubmit} style={styles.formContainer}>
          <div style={styles.inputWrapper}>
            <input
              type="url"
              placeholder="Enter image URL..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              // Disable input only when actively submitting/loading
              disabled={loading}
              style={styles.inputField}
              required
            />
            <button
              type="submit"
              disabled={loading} // Disable button during loading
              style={loading ? {...styles.searchButton, ...styles.searchButtonDisabled} : styles.searchButton}
              aria-label="Submit task"
            >
              {loading ? (
                 <div style={styles.spinner}></div>
              ) : (
                <SearchIcon />
              )}
            </button>
          </div>
           {/* {error && <p style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>DEV ONLY: {error}</p>} */}
        </form>
      )}
    </div>
  );
}